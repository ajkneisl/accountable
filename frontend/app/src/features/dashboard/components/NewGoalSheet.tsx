// Goal sheet — the reusable goal-composition form, ported from the web's
// NewGoalDialog. `GoalSheet` owns the source/metric/cadence/target form; callers
// supply what happens on submit. `NewGoalSheet` is the personal-goal flavor;
// competitions reuse `GoalSheet` with their own submit.
// Sources are limited to the metrics the backend actually supports.

import { useState } from "react"
import { Text, View } from "react-native"
import { ApiError, createGoal, type GoalPeriod, useApi } from "@shared/index"
import { Sheet, SheetField } from "../../../ui/Sheet"
import {
    ChoiceButton,
    ErrorList,
    Input,
    IntegrationIcon,
    SourceTile,
    type TileVariant
} from "../../../ui/primitives"
import { isLimit, unitLabel, unitScale } from "../types"

type Source = {
    integration: string
    label: string
    glyph: string
    tile: TileVariant
    /** Eyebrow label for the metric chips row when there are multiple metrics. */
    optionLabel: string
    metrics: { metric: string; label: string }[]
    /** Cadence and target (in display units) to start from when picked. */
    defaults?: { period: GoalPeriod; target: string }
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
    },
    {
        integration: "apple_sleep",
        label: "Sleep",
        glyph: "Z",
        tile: "ink",
        optionLabel: "Metric",
        metrics: [{ metric: "minutes", label: "Hours asleep" }],
        defaults: { period: "DAILY", target: "8" }
    },
    {
        integration: "apple_steps",
        label: "Steps",
        glyph: "ST",
        tile: "lime",
        optionLabel: "Metric",
        metrics: [{ metric: "steps", label: "Steps" }],
        defaults: { period: "DAILY", target: "10000" }
    },
    {
        integration: "screen_time",
        label: "Screen Time",
        glyph: "SC",
        tile: "coral",
        optionLabel: "Metric",
        metrics: [{ metric: "minutes", label: "Hours on screen, at most" }],
        defaults: { period: "DAILY", target: "2" }
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
    // Targets are typed in display units (hours of sleep) but stored as counted.
    const scale = unitScale(source.integration, metric)
    const cadence = period === "DAILY" ? "day" : "week"

    function pickSource(i: number) {
        setSourceIdx(i)
        setMetric(SOURCES[i].metrics[0].metric)
        const defaults = SOURCES[i].defaults
        if (defaults) {
            setPeriod(defaults.period)
            setTarget(defaults.target)
        }
    }

    async function submit() {
        const stored = Math.round(targetNum * scale)
        if (!Number.isFinite(targetNum) || stored <= 0) {
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
                target: stored
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
            action={{
                label: submitting ? submittingLabel : submitLabel,
                onPress: submit,
                busy: submitting
            }}
        >
            <SheetField label="Source">
                <View className="gap-2.5">
                    {SOURCES.map((s, i) => (
                        <ChoiceButton
                            key={s.integration}
                            selected={sourceIdx === i}
                            onPress={() => pickSource(i)}
                        >
                            <View className="flex-row items-center gap-3.5">
                                <SourceTile
                                    label={s.glyph}
                                    variant={s.tile}
                                    icon={
                                        <IntegrationIcon name={s.integration} />
                                    }
                                />
                                <View className="flex-1">
                                    <Text className="text-[17px] font-semibold text-ink">
                                        {s.label}
                                    </Text>
                                    <Text className="text-[14px] text-ink-3">
                                        {s.metrics.length === 1
                                            ? s.metrics[0].label.toLowerCase()
                                            : `${s.metrics.length} options`}
                                    </Text>
                                </View>
                            </View>
                        </ChoiceButton>
                    ))}
                </View>
            </SheetField>

            {source.metrics.length > 1 && (
                <SheetField label={source.optionLabel}>
                    <View className="flex-row gap-2.5">
                        {source.metrics.map((m) => (
                            <ChoiceButton
                                key={m.metric}
                                selected={metric === m.metric}
                                onPress={() => setMetric(m.metric)}
                                className="flex-1"
                            >
                                <Text className="text-center text-[16px] font-semibold text-ink">
                                    {m.label}
                                </Text>
                            </ChoiceButton>
                        ))}
                    </View>
                </SheetField>
            )}

            <SheetField label="Cadence">
                <View className="flex-row gap-2.5">
                    {(["DAILY", "WEEKLY"] as GoalPeriod[]).map((p) => (
                        <ChoiceButton
                            key={p}
                            selected={period === p}
                            onPress={() => setPeriod(p)}
                            className="flex-1"
                        >
                            <Text className="text-center text-[16px] font-semibold text-ink">
                                {p === "DAILY" ? "Daily" : "Weekly"}
                            </Text>
                        </ChoiceButton>
                    ))}
                </View>
            </SheetField>

            <SheetField
                label={isLimit(source.integration, metric) ? "Limit" : "Target"}
            >
                <View className="flex-row items-center gap-3">
                    <Input
                        keyboardType={
                            scale === 1 ? "number-pad" : "decimal-pad"
                        }
                        value={target}
                        onChangeText={setTarget}
                        className="w-28"
                    />
                    <Text className="text-[17px] text-ink-3">
                        {unit} / {cadence}
                        {isLimit(source.integration, metric) ? " or less" : ""}
                    </Text>
                </View>
            </SheetField>

            <ErrorList errors={errors} />
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
            submitLabel="Create goal"
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
