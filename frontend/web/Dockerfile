# syntax=docker/dockerfile:1
#
# Build context is the `frontend/` directory (see docker-compose.yml) so that the
# `@shared` alias (../shared/src) resolves during the Vite build.

# ---- Build stage: produce the static SPA bundle ----
FROM node:22-alpine AS build
WORKDIR /app/web

# shared/ is referenced from web via the "@shared" -> ../shared/src alias.
# shared has its own deps (react, @types/react) that `tsc -b` needs to
# type-check its sources; node_modules is dockerignored, so reinstall them.
COPY shared ../shared
RUN npm --prefix ../shared install

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web ./

# Baked into the bundle at build time; points the browser at the backend API.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Runtime stage: serve the bundle with nginx ----
FROM nginx:alpine AS runtime
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html

EXPOSE 80
