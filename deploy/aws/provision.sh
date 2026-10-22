#!/usr/bin/env bash
# One-time AWS setup for Accountable at https://acc.umn.app.
#
# Creates, in the shared 10.0.0.0/16 VPC:
#   - ECR repos for the backend and web images
#   - an RDS Postgres instance in the private db subnets
#   - an ALB with an ACM certificate for acc.umn.app
#   - an ECS Fargate cluster, task definition and service (web + backend in one task)
#   - IAM roles for the task and for GitHub Actions to deploy
#   - SSM parameters holding the database password and JWT secret
#
# Safe to re-run: every step checks for the resource first. Day-to-day deploys
# happen in .github/workflows/deploy.yml on push to main.
#
# umn.app's DNS is on Cloudflare, so the script pauses twice for records to be
# added there by hand: once to validate the certificate, once to point the
# domain at the load balancer.

set -euo pipefail

APP=accountable
DOMAIN=acc.umn.app
GITHUB_REPO=ajkneisl/accountable
REGION=us-east-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

VPC=vpc-0114e2f210176f8cc
PUBLIC_SUBNETS=(subnet-0d21c5a0641b6dffb subnet-0d5dd0d4538d60a31)
DB_SUBNETS=(subnet-026dfd791088365a8 subnet-072a521daef26518e)

DB_INSTANCE_CLASS=db.t4g.micro
DB_ENGINE_VERSION=18.6
DB_NAME=accountable
DB_USER=accountable

SSM_PREFIX=/$APP/prod
CLUSTER=$APP
SERVICE=$APP
LOG_GROUP=/ecs/$APP

export AWS_REGION=$REGION AWS_PAGER=""

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

# ------------------------------------------------------------------- ECR

for repo in $APP-backend $APP-web; do
    if ! aws ecr describe-repositories --repository-names "$repo" >/dev/null 2>&1; then
        say "Creating ECR repo $repo"
        aws ecr create-repository --repository-name "$repo" \
            --image-scanning-configuration scanOnPush=true >/dev/null
        aws ecr put-lifecycle-policy --repository-name "$repo" --lifecycle-policy-text '{
            "rules": [{
                "rulePriority": 1,
                "description": "Keep the last 20 images",
                "selection": {"tagStatus": "any", "countType": "imageCountMoreThan", "countNumber": 20},
                "action": {"type": "expire"}
            }]
        }' >/dev/null
    fi
done

# ------------------------------------------------------- security groups

sg_id() {
    aws ec2 describe-security-groups \
        --filters "Name=vpc-id,Values=$VPC" "Name=group-name,Values=$1" \
        --query 'SecurityGroups[0].GroupId' --output text
}

ensure_sg() {
    local name=$1 desc=$2 id
    id=$(sg_id "$name")
    if [[ $id == None ]]; then
        id=$(aws ec2 create-security-group --vpc-id "$VPC" --group-name "$name" \
            --description "$desc" --query GroupId --output text)
        aws ec2 create-tags --resources "$id" --tags "Key=Name,Value=$name" "Key=app,Value=$APP"
    fi
    echo "$id"
}

# Ingress rules fail with Duplicate on re-runs; that's the "already exists" case.
allow() { aws ec2 authorize-security-group-ingress "$@" >/dev/null 2>&1 || true; }

say "Security groups"
ALB_SG=$(ensure_sg $APP-alb "Accountable load balancer")
TASK_SG=$(ensure_sg $APP-task "Accountable ECS tasks")
DB_SG=$(ensure_sg $APP-db "Accountable RDS")
allow --group-id "$ALB_SG" --protocol tcp --port 80 --cidr 0.0.0.0/0
allow --group-id "$ALB_SG" --protocol tcp --port 443 --cidr 0.0.0.0/0
allow --group-id "$TASK_SG" --protocol tcp --port 80 --source-group "$ALB_SG"
allow --group-id "$DB_SG" --protocol tcp --port 5432 --source-group "$TASK_SG"
echo "alb=$ALB_SG task=$TASK_SG db=$DB_SG"

# ------------------------------------------------------------ SSM secrets

param_exists() { aws ssm get-parameter --name "$1" >/dev/null 2>&1; }

put_secret() {
    aws ssm put-parameter --name "$1" --type SecureString --value "$2" --overwrite >/dev/null
}

say "SSM parameters under $SSM_PREFIX"
# RDS rejects / @ " and spaces in master passwords; hex avoids all of them.
param_exists "$SSM_PREFIX/DATABASE_PASSWORD" ||
    put_secret "$SSM_PREFIX/DATABASE_PASSWORD" "$(openssl rand -hex 24)"
param_exists "$SSM_PREFIX/JWT_SECRET" ||
    put_secret "$SSM_PREFIX/JWT_SECRET" "$(openssl rand -base64 48)"
# Optional: raises the GitHub API rate limit for the GitHub integration.
if [[ -n ${GITHUB_TOKEN:-} ]]; then
    put_secret "$SSM_PREFIX/GITHUB_TOKEN" "$GITHUB_TOKEN"
fi

# ------------------------------------------------------------------- RDS

if ! aws rds describe-db-subnet-groups --db-subnet-group-name $APP >/dev/null 2>&1; then
    say "Creating DB subnet group"
    aws rds create-db-subnet-group --db-subnet-group-name $APP \
        --db-subnet-group-description "Accountable private db subnets" \
        --subnet-ids "${DB_SUBNETS[@]}" >/dev/null
fi

if ! aws rds describe-db-instances --db-instance-identifier $APP >/dev/null 2>&1; then
    say "Creating RDS instance $APP ($DB_INSTANCE_CLASS, Postgres $DB_ENGINE_VERSION)"
    aws rds create-db-instance \
        --db-instance-identifier $APP \
        --db-instance-class $DB_INSTANCE_CLASS \
        --engine postgres --engine-version $DB_ENGINE_VERSION \
        --db-name $DB_NAME \
        --master-username $DB_USER \
        --master-user-password "$(aws ssm get-parameter --name "$SSM_PREFIX/DATABASE_PASSWORD" \
            --with-decryption --query Parameter.Value --output text)" \
        --allocated-storage 20 --storage-type gp3 --storage-encrypted \
        --db-subnet-group-name $APP \
        --vpc-security-group-ids "$DB_SG" \
        --no-publicly-accessible \
        --backup-retention-period 7 \
        --deletion-protection \
        --copy-tags-to-snapshot \
        --tags "Key=app,Value=$APP" >/dev/null
fi


# ------------------------------------------------------------ certificate

CERT_ARN=$(aws acm list-certificates \
    --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn | [0]" --output text)
if [[ $CERT_ARN == None ]]; then
    say "Requesting ACM certificate for $DOMAIN"
    CERT_ARN=$(aws acm request-certificate --domain-name $DOMAIN --validation-method DNS \
        --tags "Key=app,Value=$APP" --query CertificateArn --output text)
    sleep 10 # validation record isn't populated immediately
fi

CERT_STATUS=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" \
    --query Certificate.Status --output text)
if [[ $CERT_STATUS != ISSUED ]]; then
    read -r REC_NAME REC_VALUE < <(aws acm describe-certificate --certificate-arn "$CERT_ARN" \
        --query 'Certificate.DomainValidationOptions[0].ResourceRecord.[Name,Value]' --output text)
    say "Add this record in Cloudflare (umn.app → DNS), proxy status DNS only:"
    echo "  Type:   CNAME"
    echo "  Name:   ${REC_NAME%.umn.app.}"
    echo "  Target: ${REC_VALUE%.}"
    echo
    echo "Waiting for the certificate to be issued..."
    aws acm wait certificate-validated --certificate-arn "$CERT_ARN"
fi
echo "cert=$CERT_ARN"

# ------------------------------------------------------------ load balancer

ALB_ARN=$(aws elbv2 describe-load-balancers --names $APP \
    --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo None)
if [[ $ALB_ARN == None ]]; then
    say "Creating load balancer"
    ALB_ARN=$(aws elbv2 create-load-balancer --name $APP --type application \
        --scheme internet-facing --subnets "${PUBLIC_SUBNETS[@]}" \
        --security-groups "$ALB_SG" --tags "Key=app,Value=$APP" \
        --query 'LoadBalancers[0].LoadBalancerArn' --output text)
fi
ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns "$ALB_ARN" \
    --query 'LoadBalancers[0].DNSName' --output text)

TG_ARN=$(aws elbv2 describe-target-groups --names $APP-web \
    --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo None)
if [[ $TG_ARN == None ]]; then
    say "Creating target group"
    # /api/version goes through nginx to the backend, so a passing check means
    # both containers are up.
    TG_ARN=$(aws elbv2 create-target-group --name $APP-web --protocol HTTP --port 80 \
        --vpc-id "$VPC" --target-type ip \
        --health-check-path /api/version --health-check-interval-seconds 15 \
        --healthy-threshold-count 2 --unhealthy-threshold-count 3 \
        --query 'TargetGroups[0].TargetGroupArn' --output text)
    aws elbv2 modify-target-group-attributes --target-group-arn "$TG_ARN" \
        --attributes Key=deregistration_delay.timeout_seconds,Value=30 >/dev/null
fi

LISTENERS=$(aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" \
    --query 'Listeners[].Port' --output text)
if [[ " $LISTENERS " != *" 80 "* ]]; then
    aws elbv2 create-listener --load-balancer-arn "$ALB_ARN" --protocol HTTP --port 80 \
        --default-actions 'Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' >/dev/null
fi
if [[ " $LISTENERS " != *" 443 "* ]]; then
    aws elbv2 create-listener --load-balancer-arn "$ALB_ARN" --protocol HTTPS --port 443 \
        --certificates "CertificateArn=$CERT_ARN" \
        --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
        --default-actions "Type=forward,TargetGroupArn=$TG_ARN" >/dev/null
fi
echo "alb=$ALB_DNS"

# -------------------------------------------------------------------- IAM

ensure_role() {
    local name=$1 trust=$2
    if ! aws iam get-role --role-name "$name" >/dev/null 2>&1; then
        aws iam create-role --role-name "$name" --assume-role-policy-document "$trust" \
            --tags "Key=app,Value=$APP" >/dev/null
    else
        aws iam update-assume-role-policy --role-name "$name" --policy-document "$trust"
    fi
}

ECS_TRUST='{
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "ecs-tasks.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]
}'

say "IAM roles"
ensure_role ${APP}ExecutionRole "$ECS_TRUST"
aws iam attach-role-policy --role-name ${APP}ExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
aws iam put-role-policy --role-name ${APP}ExecutionRole --policy-name $APP-secrets \
    --policy-document "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [{
            \"Effect\": \"Allow\",
            \"Action\": \"ssm:GetParameters\",
            \"Resource\": \"arn:aws:ssm:$REGION:$ACCOUNT:parameter$SSM_PREFIX/*\"
        }]
    }"

ensure_role ${APP}TaskRole "$ECS_TRUST"

# Only pushes to main may assume the deploy role.
ensure_role ${APP}DeployRole "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
        \"Effect\": \"Allow\",
        \"Principal\": {
            \"Federated\": \"arn:aws:iam::$ACCOUNT:oidc-provider/token.actions.githubusercontent.com\"
        },
        \"Action\": \"sts:AssumeRoleWithWebIdentity\",
        \"Condition\": {
            \"StringEquals\": {
                \"token.actions.githubusercontent.com:aud\": \"sts.amazonaws.com\",
                \"token.actions.githubusercontent.com:sub\": \"repo:$GITHUB_REPO:ref:refs/heads/main\"
            }
        }
    }]
}"
aws iam put-role-policy --role-name ${APP}DeployRole --policy-name $APP-deploy \
    --policy-document "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [
            {\"Sid\": \"EcrAuth\", \"Effect\": \"Allow\",
             \"Action\": \"ecr:GetAuthorizationToken\", \"Resource\": \"*\"},
            {\"Sid\": \"EcrPush\", \"Effect\": \"Allow\",
             \"Action\": [\"ecr:BatchCheckLayerAvailability\", \"ecr:BatchGetImage\",
                        \"ecr:GetDownloadUrlForLayer\", \"ecr:InitiateLayerUpload\",
                        \"ecr:UploadLayerPart\", \"ecr:CompleteLayerUpload\", \"ecr:PutImage\"],
             \"Resource\": [\"arn:aws:ecr:$REGION:$ACCOUNT:repository/$APP-backend\",
                          \"arn:aws:ecr:$REGION:$ACCOUNT:repository/$APP-web\"]},
            {\"Sid\": \"TaskDefs\", \"Effect\": \"Allow\",
             \"Action\": [\"ecs:RegisterTaskDefinition\", \"ecs:DescribeTaskDefinition\"],
             \"Resource\": \"*\"},
            {\"Sid\": \"Service\", \"Effect\": \"Allow\",
             \"Action\": [\"ecs:UpdateService\", \"ecs:DescribeServices\"],
             \"Resource\": \"arn:aws:ecs:$REGION:$ACCOUNT:service/$CLUSTER/$SERVICE\"},
            {\"Sid\": \"PassRoles\", \"Effect\": \"Allow\", \"Action\": \"iam:PassRole\",
             \"Resource\": [\"arn:aws:iam::$ACCOUNT:role/${APP}ExecutionRole\",
                          \"arn:aws:iam::$ACCOUNT:role/${APP}TaskRole\"],
             \"Condition\": {\"StringEquals\": {\"iam:PassedToService\": \"ecs-tasks.amazonaws.com\"}}}
        ]
    }"

# -------------------------------------------------------------------- ECS

say "Waiting for RDS to become available (first run takes ~10 minutes in total)"
aws rds wait db-instance-available --db-instance-identifier $APP
DB_HOST=$(aws rds describe-db-instances --db-instance-identifier $APP \
    --query 'DBInstances[0].Endpoint.Address' --output text)
aws ssm put-parameter --name "$SSM_PREFIX/DATABASE_URL" --type String --overwrite \
    --value "jdbc:postgresql://$DB_HOST:5432/$DB_NAME" >/dev/null
echo "db=$DB_HOST"


if [[ $(aws logs describe-log-groups --log-group-name-prefix $LOG_GROUP \
    --query "logGroups[?logGroupName=='$LOG_GROUP'] | length(@)" --output text) == 0 ]]; then
    aws logs create-log-group --log-group-name $LOG_GROUP
    aws logs put-retention-policy --log-group-name $LOG_GROUP --retention-in-days 30
fi

if [[ $(aws ecs describe-clusters --clusters $CLUSTER \
    --query "clusters[?status=='ACTIVE'] | length(@)" --output text) == 0 ]]; then
    say "Creating ECS cluster"
    aws ecs create-cluster --cluster-name $CLUSTER --capacity-providers FARGATE \
        --tags "key=app,value=$APP" >/dev/null
fi

REGISTRY=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com
ssm_arn() { echo "arn:aws:ssm:$REGION:$ACCOUNT:parameter$SSM_PREFIX/$1"; }

BACKEND_SECRETS="[
    {\"name\": \"DATABASE_URL\", \"valueFrom\": \"$(ssm_arn DATABASE_URL)\"},
    {\"name\": \"DATABASE_PASSWORD\", \"valueFrom\": \"$(ssm_arn DATABASE_PASSWORD)\"},
    {\"name\": \"JWT_SECRET\", \"valueFrom\": \"$(ssm_arn JWT_SECRET)\"}"
if param_exists "$SSM_PREFIX/GITHUB_TOKEN"; then
    BACKEND_SECRETS+=",
    {\"name\": \"GITHUB_TOKEN\", \"valueFrom\": \"$(ssm_arn GITHUB_TOKEN)\"}"
fi
BACKEND_SECRETS+="]"

log_config() {
    echo "{\"logDriver\": \"awslogs\", \"options\": {
        \"awslogs-group\": \"$LOG_GROUP\", \"awslogs-region\": \"$REGION\",
        \"awslogs-stream-prefix\": \"$1\"}}"
}

# Only registered when the family doesn't exist yet; after that the deploy
# workflow owns revisions (it copies the latest one and swaps the images).
if ! aws ecs describe-task-definition --task-definition $APP >/dev/null 2>&1; then
    say "Registering task definition"
    aws ecs register-task-definition --cli-input-json "{
        \"family\": \"$APP\",
        \"networkMode\": \"awsvpc\",
        \"requiresCompatibilities\": [\"FARGATE\"],
        \"runtimePlatform\": {\"cpuArchitecture\": \"ARM64\", \"operatingSystemFamily\": \"LINUX\"},
        \"cpu\": \"512\",
        \"memory\": \"1024\",
        \"executionRoleArn\": \"arn:aws:iam::$ACCOUNT:role/${APP}ExecutionRole\",
        \"taskRoleArn\": \"arn:aws:iam::$ACCOUNT:role/${APP}TaskRole\",
        \"containerDefinitions\": [
            {
                \"name\": \"backend\",
                \"image\": \"$REGISTRY/$APP-backend:latest\",
                \"essential\": true,
                \"portMappings\": [{\"containerPort\": 8080, \"protocol\": \"tcp\"}],
                \"environment\": [
                    {\"name\": \"DATABASE_USER\", \"value\": \"$DB_USER\"},
                    {\"name\": \"JAVA_TOOL_OPTIONS\", \"value\": \"-XX:MaxRAMPercentage=70\"}
                ],
                \"secrets\": $BACKEND_SECRETS,
                \"logConfiguration\": $(log_config backend)
            },
            {
                \"name\": \"web\",
                \"image\": \"$REGISTRY/$APP-web:latest\",
                \"essential\": true,
                \"portMappings\": [{\"containerPort\": 80, \"protocol\": \"tcp\"}],
                \"environment\": [{\"name\": \"API_UPSTREAM\", \"value\": \"127.0.0.1:8080\"}],
                \"dependsOn\": [{\"containerName\": \"backend\", \"condition\": \"START\"}],
                \"logConfiguration\": $(log_config web)
            }
        ]
    }" >/dev/null
fi

if [[ $(aws ecs describe-services --cluster $CLUSTER --services $SERVICE \
    --query "services[?status=='ACTIVE'] | length(@)" --output text) == 0 ]]; then
    say "Creating ECS service (0 tasks until the first deploy pushes images)"
    aws ecs create-service --cluster $CLUSTER --service-name $SERVICE \
        --task-definition $APP --desired-count 0 --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[${PUBLIC_SUBNETS[0]},${PUBLIC_SUBNETS[1]}],securityGroups=[$TASK_SG],assignPublicIp=ENABLED}" \
        --load-balancers "targetGroupArn=$TG_ARN,containerName=web,containerPort=80" \
        --health-check-grace-period-seconds 120 \
        --deployment-configuration 'deploymentCircuitBreaker={enable=true,rollback=true},maximumPercent=200,minimumHealthyPercent=100' \
        --propagate-tags SERVICE --tags "key=app,value=$APP" >/dev/null
fi

# ------------------------------------------------------------------- done

say "Done"
cat <<EOF
Point the domain at the load balancer in Cloudflare (umn.app → DNS):
  Type:   CNAME
  Name:   acc
  Target: $ALB_DNS
  Proxy:  DNS only, or proxied with SSL mode "Full (strict)"

Then push to main. The Deploy workflow builds both images, registers a new
task definition, and scales the service to 1.

Deploy role for GitHub Actions: arn:aws:iam::$ACCOUNT:role/${APP}DeployRole
EOF
