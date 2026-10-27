// Top-right toggle for a tab's edit mode: a pencil to start editing, a check to
// finish. While it's on, the tab's cards show their Edit buttons.

import { useColors } from "../theme"
import { CircleButton } from "./CircleButton"
import { CheckIcon, PencilIcon } from "./icons"

export function EditModeButton({
    editing,
    noun,
    onChange
}: {
    editing: boolean
    /** What's being edited, for VoiceOver: "goals", "habits". */
    noun: string
    onChange: (editing: boolean) => void
}) {
    const colors = useColors()
    return (
        <CircleButton
            label={editing ? `Done editing ${noun}` : `Edit ${noun}`}
            onPress={() => onChange(!editing)}
        >
            {(glass) => {
                const color = glass ? colors.ink : colors.ink2
                return editing ? (
                    <CheckIcon color={color} size={20} />
                ) : (
                    <PencilIcon color={color} size={20} />
                )
            }}
        </CircleButton>
    )
}
