// Goal sheet — the reusable goal-composition form, ported from the web's
// NewGoalDialog. `GoalSheet` owns the source/metric/cadence/target form; callers
// supply what happens on submit. `NewGoalSheet` is the personal-goal flavor;
// competitions reuse `GoalSheet` with their own submit.
// Sources are limited to the metrics the backend actually supports.

import { useState } from "react"
import { Text, View } from "react-native"
import { ApiError, createGoal, type GoalPeriod, useApi } from "@shared/index"
import { Sheet } from "../../../ui/Sheet"
import {
    Button,
    ChoiceButton,
    ErrorList,
    Eyebrow,
    Input,
    IntegrationIcon,
    SourceTile,
    type TileVariant
} from "../../../ui/primitives"
import { unitLabel } from "../types"

type Source = {
    integration: string
    label: string
    glyph: string
    tile: TileVariant
    /** Eyebrow label for the metric chips row when there are multiple metrics. */
    optionLabel: string
    metrics: { metric: string; label: string }[]
}

const SOURCES: Source[] = [
    {
        integration: "github",
        label: "GitHub",
        glyph: "GH",
        tile: "ink",
        optionLabel: "Metric",
        metrics: [{ metric: "commits", label: "Commits" }]
    },
    {
        integration: "leetcode",
        label: "LeetCode",
        glyph: "LC",
        tile: "lime",
        optionLabel: "Difficulty",
        metrics: [
            { metric: "easy", label: "Easy" },
            { metric: "medium", label: "Medium" },
            { metric: "hard", label: "Hard" }
        ]
    },
    {
        integration: "apple_fitness",
        label: "Workout",
        glyph: "WO",
        tile: "",
        optionLabel: "Metric",
        metrics: [
            { metric: "workouts", label: "Workouts" },
            { metric: "calories", label: "Calories" }
        ]
    }
]

/** The goal a {@link GoalSheet} composes, handed to its `onSubmit`. */
export interface GoalDraft {
    integration: string
    metric: string
    period: GoalPeriod
    target: number
}

/**
 * Reusable goal-composition sheet. The form (source, metric, cadence, target) is
 * fixed; [onSubmit] decides what to do with the resulting {@link GoalDraft} and is
 * responsible for closing the sheet on success. Thrown errors are surfaced inline.
 */
export function GoalSheet({
    title,
    description,
    submitLabel,
    submittingLabel,
    onSubmit,
    onClose
}: {
    title: string
    description: string
    submitLabel: string
    submittingLabel: string
    onSubmit: (draft: GoalDraft) => Promise<void>
    onClose: () => void
}) {
    const [sourceIdx, setSourceIdx] = useState(0)
    const [metric, setMetric] = useState(SOURCES[0].metrics[0].metric)
    const [period, setPeriod] = useState<GoalPeriod>("WEEKLY")
    const [target, setTarget] = useState("5")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    const source = SOURCES[sourceIdx]
    const targetNum = Number(target)
    const unit = unitLabel(source.integration, metric)
    const cadence = period === "DAILY" ? "day" : "week"

    function pickSource(i: number) {
        setSourceIdx(i)
        setMetric(SOURCES[i].metrics[0].metric)
    }

    async function submit() {
        if (!Number.isFinite(targetNum) || targetNum <= 0) {
            setErrors(["Enter a target greater than zero."])
            return
        }
        setErrors([])
        setSubmitting(true)
        try {
            await onSubmit({
                integration: source.integration,
                metric,
                period,
                target: targetNum
            })
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.messages)
            else if (err instanceof Error) setErrors([err.message])
            else setErrors(["Something went wrong"])
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Sheet
            title={title}
            description={description}
            onClose={onClose}
            footer={
                <View className="flex-row justify-end gap-2.5">
                    <Button label="Cancel" variant="line" onPress={onClose} />
                    <Button
                        label={submitting ? submittingLabel : submitLabel}
                        onPress={submit}
                        busy={submitting}
                    />
                </View>
            }
        >
            <Eyebrow className="mb-2.5">Source</Eyebrow>
            <View className="mb-5 gap-2">
                {SOURCES.map((s, i) => (
                    <ChoiceButton
                        key={s.integration}
                        selected={sourceIdx === i}
                        onPress={() => pickSource(i)}
                    >
                        <View className="flex-row items-center gap-2.5">
                            <SourceTile
                                label={s.glyph}
                                variant={s.tile}
                                icon={<IntegrationIcon name={s.integration} />}
                            />
                            <View className="flex-1">
                                <Text className="text-[13px] font-semibold text-ink">
                                    {s.label}
                                </Text>
                                <Text className="text-[11px] text-ink-3">
                                    {s.metrics.length === 1
                                        ? s.metrics[0].label.toLowerCase()
                                        : `${s.metrics.length} options`}
                                </Text>
                            </View>
                        </View>
                    </ChoiceButton>
                ))}
            </View>

            {source.metrics.length > 1 && (
                <>
                    <Eyebrow className="mb-2.5">{source.optionLabel}</Eyebrow>
                    <View className="mb-5 flex-row gap-2">
                        {source.metrics.map((m) => (
                            <ChoiceButton
                                key={m.metric}
                                selected={metric === m.metric}
                                onPress={() => setMetric(m.metric)}
                                className="flex-1"
                            >
                                <Text className="text-center text-[13px] font-semibold text-ink">
                                    {m.label}
                                </Text>
                            </ChoiceButton>
                        ))}
                    </View>
                </>
            )}

            <Eyebrow className="mb-2.5">Cadence</Eyebrow>
            <View className="mb-5 flex-row gap-2">
                {(["DAILY", "WEEKLY"] as GoalPeriod[]).map((p) => (
                    <ChoiceButton
                        key={p}
                        selected={period === p}
                        onPress={() => setPeriod(p)}
                        className="flex-1"
                    >
                        <Text className="text-center text-[13px] font-semibold text-ink">
                            {p === "DAILY" ? "Daily" : "Weekly"}
                        </Text>
                    </ChoiceButton>
                ))}
            </View>

            <Eyebrow className="mb-2.5">Target</Eyebrow>
            <View className="flex-row items-center gap-2.5">
                <Input
                    keyboardType="number-pad"
                    value={target}
                    onChangeText={setTarget}
                    className="w-24"
                />
                <Text className="text-[13px] text-ink-3">
                    {unit} / {cadence}
                </Text>
            </View>

            {errors.length > 0 && (
                <View className="mt-4">
                    <ErrorList errors={errors} />
                </View>
            )}
        </Sheet>
    )
}

/** Personal-goal sheet — creates a goal for the authenticated user. */
export function NewGoalSheet({
    onClose,
    onCreated
}: {
    onClose: () => void
    onCreated: () => void
}) {
    const api = useApi()
    return (
        <GoalSheet
            title="New goal"
            description="Track a metric from one of your connected sources."
            submitLabel="Create goal →"
            submittingLabel="Creating…"
            onClose={onClose}
            onSubmit={async (draft) => {
                await createGoal(api, draft)
                onCreated()
                onClose()
            }}
        />
    )
}
