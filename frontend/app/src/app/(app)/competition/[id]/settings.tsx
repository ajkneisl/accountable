// Competition settings — pushed from the competition screen. The owner renames
// it, sets its icon (a picture or an emoji), shares or resets the join code,
// removes members or hands the competition to one of them (from a member's
// row), and deletes it. Members see the same details read-only, can share the
// code, and can leave.

import { useCallback, useEffect, useState } from "react"
import { Pressable, Share, Text, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useAtomValue } from "jotai"
import {
    ApiError,
    type CompetitionDetail,
    type CompetitionMember,
    deleteCompetition,
    getCompetition,
    leaveCompetition,
    removeCompetitionMember,
    removeCompetitionPicture,
    resetCompetitionJoinCode,
    updateCompetition,
    uploadCompetitionPicture,
    useApi
} from "@shared/index"
import { userAtom } from "../../../../auth"
import { useAppData } from "../../../../features/common/AppData"
import {
    jpegUpload,
    showUploadError,
    usePickSquarePhoto
} from "../../../../features/common/photo"
import { buildColorMap } from "../../../../features/competition/colors"
import { CompetitionIcon } from "../../../../features/competition/components/CompetitionIcon"
import { useScheme } from "../../../../theme"
import { BackBar } from "../../../../ui/BackBar"
import { Screen } from "../../../../ui/Screen"
import { Sheet, SheetField } from "../../../../ui/Sheet"
import { Row, Section } from "../../../../ui/SettingsList"
import { confirm } from "../../../../ui/confirm"
import { showMenu } from "../../../../ui/menu"
import { Card, Display, Dot, ErrorList, Input } from "../../../../ui/primitives"

/** Longest name the server accepts. */
const NAME_MAX_LENGTH = 64

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
})

function messageFor(err: unknown): string {
    if (err instanceof ApiError) return err.messages.join(", ")
    if (err instanceof Error) return err.message
    return "Something went wrong"
}

function RenameSheet({
    current,
    onClose,
    onSave
}: {
    current: string
    onClose: () => void
    onSave: (name: string) => Promise<void>
}) {
    const [name, setName] = useState(current)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        const trimmed = name.trim()
        if (!trimmed) {
            setError("Give your competition a name.")
            return
        }
        setError(null)
        setBusy(true)
        try {
            await onSave(trimmed)
            onClose()
        } catch (err) {
            setError(messageFor(err))
            setBusy(false)
        }
    }

    return (
        <Sheet
            title="Rename competition"
            description="Every member sees the new name."
            onClose={onClose}
            action={{ label: busy ? "Saving…" : "Save", onPress: submit, busy }}
        >
            <SheetField label="Name">
                <Input
                    value={name}
                    onChangeText={setName}
                    maxLength={NAME_MAX_LENGTH}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={submit}
                />
            </SheetField>
            {error !== null && <ErrorList errors={[error]} />}
        </Sheet>
    )
}

/** A few to tap instead of switching to the emoji keyboard. */
const SUGGESTED_EMOJI = [
    "🏃",
    "💪",
    "🔥",
    "🏆",
    "🚴",
    "🧘",
    "📚",
    "💻",
    "💧",
    "😴"
]

function EmojiSheet({
    current,
    onClose,
    onSave
}: {
    current: string
    onClose: () => void
    onSave: (icon: string) => Promise<void>
}) {
    const [icon, setIcon] = useState(current)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        const trimmed = icon.trim()
        if (!trimmed) {
            setError("Pick an emoji.")
            return
        }
        setError(null)
        setBusy(true)
        try {
            await onSave(trimmed)
            onClose()
        } catch (err) {
            setError(messageFor(err))
            setBusy(false)
        }
    }

    return (
        <Sheet
            title="Competition emoji"
            onClose={onClose}
            action={{ label: busy ? "Saving…" : "Save", onPress: submit, busy }}
        >
            <SheetField label="Emoji">
                <Input
                    value={icon}
                    onChangeText={setIcon}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={submit}
                    placeholder="Type or pick one"
                />
            </SheetField>
            <View className="flex-row flex-wrap gap-2">
                {SUGGESTED_EMOJI.map((e) => (
                    <Pressable
                        key={e}
                        accessibilityRole="button"
                        accessibilityLabel={`Use ${e}`}
                        onPress={() => setIcon(e)}
                        className={`h-11 w-11 items-center justify-center rounded-[11px] active:opacity-60 ${
                            icon.trim() === e ? "bg-ink" : "bg-bg-sunken"
                        }`}
                    >
                        <Text className="text-[22px]">{e}</Text>
                    </Pressable>
                ))}
            </View>
            {error !== null && <ErrorList errors={[error]} />}
        </Sheet>
    )
}

export default function CompetitionSettings() {
    const api = useApi()
    const scheme = useScheme()
    const { id } = useLocalSearchParams<{ id: string }>()
    const user = useAtomValue(userAtom)
    const { reload } = useAppData()

    const [detail, setDetail] = useState<CompetitionDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [renaming, setRenaming] = useState(false)
    const [choosingEmoji, setChoosingEmoji] = useState(false)
    const [busy, setBusy] = useState(false)
    const photo = usePickSquarePhoto()
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        if (!id) return
        try {
            setDetail(await getCompetition(api, id))
        } catch (err) {
            setError(messageFor(err))
        } finally {
            setLoading(false)
        }
    }, [api, id])

    useEffect(() => {
        void load()
    }, [load])

    const isOwner = detail?.ownerID === user?.userID

    /** Run a change, then refresh this screen and the app's competition lists. */
    async function run(change: () => Promise<unknown>) {
        setError(null)
        setBusy(true)
        try {
            await change()
            await load()
            reload()
        } catch (err) {
            setError(messageFor(err))
        } finally {
            setBusy(false)
        }
    }

    if (!detail) {
        return (
            <Screen edges={["top", "bottom"]}>
                <BackBar label="Competition" />
                {error !== null && <ErrorList errors={[error]} />}
                <Card className="p-5">
                    <Text className="text-[13px] text-ink-3">
                        {loading ? "Loading…" : "Competition not found."}
                    </Text>
                </Card>
            </Screen>
        )
    }

    const colors = buildColorMap(detail.members, scheme)

    function shareJoinCode() {
        if (!detail) return
        void Share.share({
            message: `Join "${detail.name}" on Beacc with code ${detail.joinCode}`
        }).catch(() => {})
    }

    async function resetCode() {
        if (!detail) return
        const ok = await confirm(
            "Reset join code?",
            `${detail.joinCode} will stop working. Anyone who hasn't joined yet will need the new code.`,
            "Reset"
        )
        if (ok) await run(() => resetCompetitionJoinCode(api, detail.id))
    }

    /** The owner's choices for another member. */
    /** The icon menu: a picture, an emoji, or back to the first letter. */
    function manageIcon() {
        if (!detail) return
        const competition = detail
        const hasPicture = competition.pictureVersion != null
        showMenu("Competition icon", [
            {
                label: "Choose photo",
                run: async () => {
                    const uri = await photo.pick()
                    if (!uri) return
                    setBusy(true)
                    try {
                        await uploadCompetitionPicture(
                            api,
                            competition.id,
                            jpegUpload(uri)
                        )
                        await load()
                        reload()
                    } catch (err) {
                        showUploadError("Couldn't save the picture", err)
                    } finally {
                        setBusy(false)
                    }
                }
            },
            { label: "Choose emoji", run: () => setChoosingEmoji(true) },
            ...(hasPicture || competition.icon
                ? [
                      {
                          // A picture goes first, leaving any emoji behind it.
                          label: hasPicture ? "Remove photo" : "Remove emoji",
                          destructive: true,
                          run: () =>
                              run(() =>
                                  hasPicture
                                      ? removeCompetitionPicture(
                                            api,
                                            competition.id
                                        )
                                      : updateCompetition(api, competition.id, {
                                            icon: ""
                                        })
                              )
                      }
                  ]
                : [])
        ])
    }

    function manageMember(member: CompetitionMember) {
        if (!detail) return
        const competition = detail
        showMenu(member.username, [
            {
                label: "Make owner",
                run: async () => {
                    const ok = await confirm(
                        "Hand over competition?",
                        `${member.username} will own "${competition.name}" and be the only one who can change it. You'll stay a member.`,
                        "Make owner"
                    )
                    if (ok)
                        await run(() =>
                            updateCompetition(api, competition.id, {
                                ownerID: member.userID
                            })
                        )
                }
            },
            {
                label: "Remove from competition",
                destructive: true,
                run: async () => {
                    const ok = await confirm(
                        "Remove member?",
                        `${member.username} will be removed from "${competition.name}". They can rejoin with the join code unless you reset it.`,
                        "Remove",
                        true
                    )
                    if (ok)
                        await run(() =>
                            removeCompetitionMember(
                                api,
                                competition.id,
                                member.userID
                            )
                        )
                }
            }
        ])
    }

    async function leaveOrDelete() {
        if (!detail) return
        const ok = await confirm(
            isOwner ? "Delete competition?" : "Leave competition?",
            isOwner
                ? `Delete "${detail.name}"? This removes it for every member.`
                : `Leave "${detail.name}"?`,
            isOwner ? "Delete" : "Leave",
            true
        )
        if (!ok) return
        setError(null)
        setBusy(true)
        try {
            if (isOwner) await deleteCompetition(api, detail.id)
            else await leaveCompetition(api, detail.id)
            reload()
            router.dismissTo("/competitions")
        } catch (err) {
            setError(messageFor(err))
            setBusy(false)
        }
    }

    const owner = detail.members.find((m) => m.userID === detail.ownerID)
    const created = `Created ${DATE_FMT.format(new Date(detail.createdAt))}.`

    return (
        <Screen edges={["top", "bottom"]}>
            <BackBar label={detail.name} />
            <Display size={32}>Settings</Display>

            {error !== null && <ErrorList errors={[error]} />}

            {/* The name and the way in, together; who can change them and
                how old it is go underneath rather than in rows of their own. */}
            <Section
                title="Competition"
                footer={
                    isOwner
                        ? created
                        : `${created} Only ${owner?.username ?? "the owner"} can rename it, change its icon or reset the code.`
                }
            >
                <Row
                    first
                    label="Name"
                    value={detail.name}
                    onPress={
                        isOwner && !busy ? () => setRenaming(true) : undefined
                    }
                />
                <Row
                    label="Icon"
                    icon={
                        <CompetitionIcon
                            id={detail.id}
                            name={detail.name}
                            icon={detail.icon}
                            pictureVersion={detail.pictureVersion}
                            size={28}
                        />
                    }
                    value={
                        detail.pictureVersion != null
                            ? "Photo"
                            : detail.icon
                              ? "Emoji"
                              : "Letter"
                    }
                    onPress={isOwner && !busy ? manageIcon : undefined}
                />
                <Row
                    label="Join code"
                    value={detail.joinCode}
                    onPress={shareJoinCode}
                />
                {isOwner && (
                    <Row
                        label="Reset join code"
                        onPress={busy ? undefined : resetCode}
                    />
                )}
            </Section>

            <Section title={`Members · ${detail.members.length}`}>
                {detail.members.map((m, i) => {
                    const isMe = m.userID === user?.userID
                    const tappable =
                        isOwner && m.userID !== detail.ownerID && !busy
                    return (
                        <Row
                            key={m.userID}
                            first={i === 0}
                            label={m.username}
                            icon={<Dot color={colors[m.userID]} size={10} />}
                            value={
                                m.userID === detail.ownerID
                                    ? isMe
                                        ? "Owner · you"
                                        : "Owner"
                                    : isMe
                                      ? "You"
                                      : `Joined ${DATE_FMT.format(new Date(m.joinedAt))}`
                            }
                            onPress={
                                tappable ? () => manageMember(m) : undefined
                            }
                        />
                    )
                })}
            </Section>

            {/* Centred and on its own, as Delete account is in Settings. */}
            <Section>
                <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={leaveOrDelete}
                    className="items-center py-3.5"
                >
                    <Text className="text-[15px] font-medium text-coral-ink">
                        {isOwner ? "Delete competition" : "Leave competition"}
                    </Text>
                </Pressable>
            </Section>

            {choosingEmoji && (
                <EmojiSheet
                    current={detail.icon ?? ""}
                    onClose={() => setChoosingEmoji(false)}
                    onSave={async (icon) => {
                        await updateCompetition(api, detail.id, { icon })
                        await load()
                        reload()
                    }}
                />
            )}
            {photo.element}
            {renaming && (
                <RenameSheet
                    current={detail.name}
                    onClose={() => setRenaming(false)}
                    onSave={async (name) => {
                        await updateCompetition(api, detail.id, { name })
                        await load()
                        reload()
                    }}
                />
            )}
        </Screen>
    )
}
