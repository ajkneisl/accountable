// Add-shared-goal dialog — reuses the goal-composition form and attaches the
// result to a competition. Owner-only; every member is then measured against it.

import { addCompetitionGoal, useApi } from "@shared/index"
import { GoalDialog } from "../../dashboard/components/NewGoalDialog"

export function AddCompetitionGoalDialog({
    competitionId,
    onClose,
    onAdded
}: {
    competitionId: string
    onClose: () => void
    /** Called after the goal is successfully added so the page can refresh. */
    onAdded: () => void
}) {
    const api = useApi()
    return (
        <GoalDialog
            title="Add shared goal"
            description="Every member of this competition is measured against this goal."
            submitLabel="Add goal →"
            submittingLabel="Adding…"
            onClose={onClose}
            onSubmit={async (draft) => {
                await addCompetitionGoal(api, competitionId, draft)
                onAdded()
                onClose()
            }}
        />
    )
}
