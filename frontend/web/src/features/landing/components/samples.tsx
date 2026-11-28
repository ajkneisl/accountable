// The sample people and competition the landing page's drawn previews share,
// matching the screenshots: the same names, colors and pictures as the app's
// Iceland Lock-in.

export const SKY = "#4aa8f0"
export const PLUM = "#8e44ad"

export interface SampleMember {
    name: string
    /** Their color, behind an initial or ringed round their picture. */
    color: string
    /** Text that reads on [color]. */
    onColor: string
    /** A picture under /avatars, or none for the initial. */
    photo?: string
}

export const MEMBERS = {
    ajkn: {
        name: "ajkn",
        color: "var(--lime)",
        onColor: "var(--ink)",
        photo: "/avatars/ajkn.jpg"
    },
    ismail: {
        name: "ismail",
        color: "var(--coral)",
        onColor: "#fff",
        photo: "/avatars/ismail.jpg"
    },
    yordfor3: {
        name: "yordfor3",
        color: SKY,
        onColor: "#fff",
        photo: "/avatars/yordfor3.jpg"
    },
    riley: { name: "riley", color: PLUM, onColor: "#fff" }
} satisfies Record<string, SampleMember>

export const COMPETITION = { name: "Iceland Lock-in", icon: "🇮🇸" }

/**
 * A member's avatar, as the app draws it: their picture (ringed in their color
 * with [ring]) or their initial on their color.
 */
export function Avatar({
    member,
    size,
    ring = 0
}: {
    member: SampleMember
    size: number
    ring?: number
}) {
    if (member.photo)
        return (
            <span
                className="grid shrink-0 place-items-center rounded-full"
                style={{ width: size, height: size, background: member.color }}
            >
                <img
                    src={member.photo}
                    alt=""
                    width={size - 2 * ring}
                    height={size - 2 * ring}
                    className="rounded-full object-cover"
                />
            </span>
        )
    return (
        <span
            className="grid shrink-0 place-items-center rounded-full font-bold"
            style={{
                width: size,
                height: size,
                background: member.color,
                color: member.onColor,
                fontSize: Math.round(size * 0.4)
            }}
        >
            {member.name[0].toUpperCase()}
        </span>
    )
}

/** The competition's icon: its emoji on a sunken tile, a quarter rounded. */
export function CompetitionTile({ size }: { size: number }) {
    return (
        <span
            className="grid shrink-0 place-items-center bg-bg-sunken leading-none"
            style={{
                width: size,
                height: size,
                borderRadius: size / 4,
                fontSize: Math.round(size * 0.55)
            }}
        >
            {COMPETITION.icon}
        </span>
    )
}
