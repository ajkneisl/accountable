// Competition settings — pushed from the competition screen. The owner renames
// it, shares or resets the join code, removes members or hands the competition
// to one of them, and deletes it. Members see the same details read-only and
// can leave.

import { useCallback, useEffect, useState } from "react"
import { Alert, Share, Text, View } from "react-native"
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
    resetCompetitionJoinCode,
    updateCompetition,
    useApi
} from "@shared/index"
import { userAtom } from "../../../../auth"
import { useAppData } from "../../../../features/common/AppData"
import { buildColorMap } from "../../../../features/competition/colors"
import { BackBar } from "../../../../ui/BackBar"
import { Screen } from "../../../../ui/Screen"
import { Sheet, SheetField } from "../../../../ui/Sheet"
import { Row, Section } from "../../../../ui/SettingsList"
import { confirm } from "../../../../ui/confirm"
import {
    Card,
    Display,
    Dot,
    ErrorList,
    Input
} from "../../../../ui/primitives"

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

export default function CompetitionSettings() {
    const api = useApi()
    const { id } = useLocalSearchParams<{ id: string }>()
    const user = useAtomValue(userAtom)
    const { reload } = useAppData()

    const [detail, setDetail] = useState<CompetitionDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [renaming, setRenaming] = useState(false)
    const [busy, setBusy] = useState(false)
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

    const colors = buildColorMap(detail.members)

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
    function manageMember(member: CompetitionMember) {
        if (!detail) return
        const competition = detail
        Alert.alert(member.username, undefined, [
            {
                text: "Make owner",
                onPress: async () => {
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
                text: "Remove from competition",
                style: "destructive",
                onPress: async () => {
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
            },
            { text: "Cancel", style: "cancel" }
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

    return (
        <Screen edges={["top", "bottom"]}>
            <BackBar label={detail.name} />
            <Display size={32}>Settings</Display>

            {error !== null && <ErrorList errors={[error]} />}

            <Section
                title="Competition"
                footer={
                    isOwner
                        ? undefined
                        : `Only ${owner?.username ?? "the owner"} can change these.`
                }
            >
                <Row
                    first
                    label="Name"
                    value={detail.name}
                    onPress={isOwner && !busy ? () => setRenaming(true) : undefined}
                />
                <Row
                    label="Created"
                    value={DATE_FMT.format(new Date(detail.createdAt))}
                />
            </Section>

            <Section
                title="Join code"
                footer="Anyone with the code can join."
            >
                <Row
                    first
                    label="Share code"
                    value={detail.joinCode}
                    onPress={shareJoinCode}
                />
                {isOwner && (
                    <Row
                        label="Reset code"
                        onPress={busy ? undefined : resetCode}
                    />
                )}
            </Section>

            <Section
                title={`Members · ${detail.members.length}`}
                footer={
                    isOwner && detail.members.length > 1
                        ? "Tap a member to remove them or make them the owner."
                        : undefined
                }
            >
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
                            onPress={tappable ? () => manageMember(m) : undefined}
                        />
                    )
                })}
            </Section>

            <Section
                footer={
                    isOwner && detail.members.length > 1
                        ? "To leave instead, make another member the owner first."
                        : undefined
                }
            >
                <Row
                    first
                    destructive
                    label={isOwner ? "Delete competition" : "Leave competition"}
                    onPress={busy ? undefined : leaveOrDelete}
                />
            </Section>

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
