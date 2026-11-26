// Settings — pushed from the gear on each tab. Two tabs, on the same strip as a
// competition's pages: General (account, security, feed, notifications, time
// zone, app info, sign out, delete) and Integrations (data sources).

import { type ReactNode, useEffect, useState } from "react"
import { AppState, Linking, Pressable, Switch, Text, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import Constants from "expo-constants"
import { useSharedValue, withTiming } from "react-native-reanimated"
import { useAtom } from "jotai"
import {
    browserTimezone,
    getSelf,
    updateFeedDetails,
    updateTimezone,
    getNotificationSettings,
    type NotificationKind,
    type NotificationSettings,
    updateNotificationSettings,
    useApi
} from "@shared/index"
import { apiConfig, useSignOut, userAtom } from "../../auth"
import { useAppData } from "../../features/common/AppData"
import {
    ChangeColorSheet,
    ChangeEmailSheet,
    ChangePasswordSheet,
    DeleteAccountSheet
} from "../../features/account/AccountSheets"
import { useAvatarActions } from "../../features/account/avatar"
import { useHabitPalette } from "../../features/habits/grid"
import { IntegrationsPanel } from "../../features/integration/IntegrationsPanel"
import {
    enablePushes,
    pushPermission,
    pushSupported,
    type PushPermission
} from "../../features/notifications/notifications"
import {
    type AppearanceChoice,
    onFill,
    useAppearance,
    useColors
} from "../../theme"
import { Avatar } from "../../ui/Avatar"
import { BackBar } from "../../ui/BackBar"
import { confirm } from "../../ui/confirm"
import { CheckIcon } from "../../ui/icons"
import { Screen } from "../../ui/Screen"
import { Button, Card, Display, ErrorList } from "../../ui/primitives"
import { Row, Section } from "../../ui/SettingsList"
import { TabStrip } from "../../ui/TabStrip"

type Tab = "general" | "integrations"

const TABS: { key: Tab; label: string }[] = [
    { key: "general", label: "General" },
    { key: "integrations", label: "Integrations" }
]

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
})

function SwitchRow({
    label,
    value,
    disabled = false,
    first = false,
    onChange
}: {
    label: string
    value: boolean
    disabled?: boolean
    first?: boolean
    onChange: (on: boolean) => void
}) {
    const colors = useColors()
    return (
        <View
            className={`flex-row items-center justify-between gap-4 py-2.5 ${
                first ? "" : "border-t border-line-2"
            }`}
        >
            <Text className="flex-1 text-[15px] text-ink">{label}</Text>
            <Switch
                accessibilityLabel={label}
                value={value}
                disabled={disabled}
                onValueChange={onChange}
                trackColor={{ true: colors.lime }}
            />
        </View>
    )
}

const NOTIFICATIONS: { kind: NotificationKind; label: string }[] = [
    { kind: "GOALS_STATUS", label: "Goals check-in" },
    { kind: "STREAK_RISK", label: "Streak reminder" },
    { kind: "WORKOUT_PROGRESS", label: "Goal progress after a workout" },
    { kind: "STEPS_CLOSE", label: "Almost at your step goal" },
    { kind: "COMPETITION_STANDINGS", label: "Competition standings" },
    { kind: "COMPETITION_RECAP", label: "Competition recap" },
    { kind: "FEED_LIKES", label: "Likes on your updates" }
]

const APPEARANCES: { choice: AppearanceChoice; label: string }[] = [
    { choice: "system", label: "System" },
    { choice: "light", label: "Light" },
    { choice: "dark", label: "Dark" }
]

/** Light, dark, or whatever the phone is set to. */
function AppearanceSection() {
    const colors = useColors()
    const [appearance, setAppearance] = useAppearance()

    return (
        <Section title="Appearance">
            {APPEARANCES.map(({ choice, label }, i) => {
                const selected = appearance === choice
                return (
                    <Pressable
                        key={choice}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setAppearance(choice)}
                        className={`flex-row items-center justify-between py-3.5 ${
                            i === 0 ? "" : "border-t border-line-2"
                        }`}
                    >
                        <Text className="text-[15px] text-ink">{label}</Text>
                        {selected && <CheckIcon color={colors.ink} size={18} />}
                    </Pressable>
                )
            })}
        </Section>
    )
}

/** What people in your competitions see on your feed updates. */
function FeedSection() {
    const api = useApi()
    const [user, setUser] = useAtom(userAtom)
    const [errors, setErrors] = useState<string[]>([])
    if (!user) return null

    async function toggle(on: boolean) {
        if (!user) return
        setErrors([])
        // Applies right away; the server's answer only matters if it refuses.
        setUser({ ...user, feedDetails: on })
        try {
            await updateFeedDetails(api, on)
        } catch {
            setUser(user)
            setErrors(["Couldn't update your feed setting"])
        }
    }

    return (
        <Section title="Feed">
            <SwitchRow
                first
                label="Show details in the feed"
                value={user.feedDetails}
                onChange={(on) => void toggle(on)}
            />
            <Text className="pb-3 text-[13px] leading-[18px] text-ink-3">
                When off, only totals will be showed for your activities.
            </Text>
            {errors.length > 0 && (
                <View className="border-t border-line-2 py-3.5">
                    <ErrorList errors={errors} />
                </View>
            )}
        </Section>
    )
}

function NotificationsSection() {
    const api = useApi()
    const [permission, setPermission] = useState<PushPermission | null>(null)
    const [settings, setSettings] = useState<NotificationSettings | null>(null)
    const [busy, setBusy] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    useEffect(() => {
        if (!pushSupported) return
        const check = () => void pushPermission().then(setPermission)
        check()
        // Coming back from iOS Settings may have changed it.
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") check()
        })
        return () => sub.remove()
    }, [])

    useEffect(() => {
        if (permission !== "granted") return
        getNotificationSettings(api)
            .then(setSettings)
            .catch(() => setErrors(["Couldn't load notification settings"]))
    }, [api, permission])

    if (!pushSupported || permission === null) return null

    async function turnOn() {
        // iOS only asks once; after a "no" it's a switch in Settings.
        if (permission === "denied") {
            void Linking.openSettings()
            return
        }
        setErrors([])
        setBusy(true)
        try {
            await enablePushes(api, true)
            setPermission(await pushPermission())
        } catch (err) {
            setErrors([
                err instanceof Error
                    ? err.message
                    : "Couldn't turn on notifications"
            ])
        } finally {
            setBusy(false)
        }
    }

    async function toggle(kind: NotificationKind, on: boolean) {
        const set = (value: boolean) =>
            setSettings(
                (s) => s && { enabled: { ...s.enabled, [kind]: value } }
            )
        setErrors([])
        set(on)
        try {
            setSettings(await updateNotificationSettings(api, { [kind]: on }))
        } catch (err) {
            set(!on)
            setErrors([
                err instanceof Error ? err.message : "Couldn't save that change"
            ])
        }
    }

    return (
        <Section title="Notifications">
            {permission === "granted" ? (
                NOTIFICATIONS.map((n, i) => (
                    <SwitchRow
                        key={n.kind}
                        first={i === 0}
                        label={n.label}
                        value={settings?.enabled[n.kind] ?? true}
                        disabled={settings === null}
                        onChange={(on) => void toggle(n.kind, on)}
                    />
                ))
            ) : (
                <View className="gap-3 py-3.5">
                    <Text className="text-[15px] leading-[21px] text-ink">
                        {permission === "denied"
                            ? "Notifications are off for Beacc in iOS Settings."
                            : "Get an evening check-in on your goals, a heads-up before a streak ends, and weekly competition results."}
                    </Text>
                    <Button
                        label={
                            permission === "denied"
                                ? "Open Settings"
                                : "Turn on notifications"
                        }
                        variant="line"
                        size="sm"
                        busy={busy}
                        onPress={turnOn}
                        className="self-start"
                    />
                </View>
            )}
            {errors.length > 0 && (
                <View className="border-t border-line-2 py-3.5">
                    <ErrorList errors={errors} />
                </View>
            )}
        </Section>
    )
}

function TimezoneSection() {
    const api = useApi()
    const [user, setUser] = useAtom(userAtom)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<string[]>([])
    const device = browserTimezone()
    const mismatch = user !== null && user.timezone !== device

    async function useDevice() {
        setErrors([])
        setSaving(true)
        try {
            await updateTimezone(api, device)
            setUser(await getSelf(api))
        } catch (err) {
            setErrors([
                err instanceof Error ? err.message : "Couldn't update time zone"
            ])
        } finally {
            setSaving(false)
        }
    }

    return (
        <Section title="Time zone">
            {/* One row while the account and the phone agree. */}
            <Row
                first
                label={mismatch ? "Account" : "Time zone"}
                value={user?.timezone ?? "—"}
            />
            {mismatch && <Row label="This device" value={device} />}
            {mismatch && (
                <View className="gap-3 border-t border-line-2 py-3.5">
                    <ErrorList errors={errors} />
                    <Button
                        label={`Use ${device}`}
                        variant="line"
                        size="sm"
                        busy={saving}
                        onPress={useDevice}
                        className="self-start"
                    />
                </View>
            )}
        </Section>
    )
}

function AboutSection() {
    const version = Constants.expoConfig?.version ?? "—"
    const build = Constants.nativeBuildVersion

    return (
        <Section title="About">
            <Row
                first
                label="App version"
                value={build ? `${version} (${build})` : version}
            />

            {/* Which backend a development build is pointed at. */}
            {__DEV__ && (
                <Row
                    label="Server"
                    value={apiConfig.baseUrl.replace(/^https?:\/\//, "")}
                />
            )}
        </Section>
    )
}

function GeneralTab() {
    const [user] = useAtom(userAtom)
    const signOut = useSignOut()
    const [sheet, setSheet] = useState<
        "email" | "password" | "color" | "delete" | null
    >(null)
    const close = () => setSheet(null)
    // A user signed in before colors existed has none until the next refresh.
    const palette = useHabitPalette()[user?.color ?? "LIME"]
    const avatar = useAvatarActions()
    const hasPicture = user?.avatarVersion != null

    async function onSignOut() {
        const ok = await confirm(
            "Sign out?",
            "You'll need to sign in again to see your goals on this device.",
            "Sign out",
            true
        )
        if (ok) await signOut()
    }

    return (
        <>
            <Card className="flex-row items-center gap-4 p-4">
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                        hasPicture
                            ? "Change profile picture"
                            : "Add profile picture"
                    }
                    onPress={avatar.open}
                    className="active:opacity-60"
                >
                    <Avatar
                        userID={user?.userID ?? ""}
                        username={user?.username ?? "?"}
                        avatarVersion={user?.avatarVersion}
                        fill={palette.fill}
                        onFill={palette.dark ? onFill.dark : onFill.light}
                        size={56}
                    />
                </Pressable>
                <View className="flex-1">
                    <Text className="text-[19px] font-bold tracking-tight text-ink">
                        {user?.username ?? "—"}
                    </Text>
                    <Text numberOfLines={1} className="text-[14px] text-ink-3">
                        {user
                            ? `Member since ${DATE_FMT.format(new Date(user.createdAt))}`
                            : "—"}
                    </Text>
                </View>
                <Button
                    label="Sign out"
                    variant="line"
                    size="sm"
                    onPress={onSignOut}
                />
            </Card>

            {/* The card above already has the name and the joining date. */}
            <Section title="Account">
                <Row
                    first
                    label="Email"
                    value={user?.email ?? "—"}
                    onPress={() => setSheet("email")}
                />
                <Row
                    label="Profile picture"
                    value={hasPicture ? "Change" : "Add"}
                    onPress={avatar.open}
                />
                <Row
                    label="Color"
                    value={palette.label}
                    onPress={() => setSheet("color")}
                />
            </Section>

            <Section title="Security">
                <Row
                    first
                    label="Change password"
                    onPress={() => setSheet("password")}
                />
            </Section>

            <AppearanceSection />

            <FeedSection />

            <NotificationsSection />

            <TimezoneSection />

            <AboutSection />

            <Section>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => setSheet("delete")}
                    className="items-center py-3.5"
                >
                    <Text className="text-[15px] font-medium text-coral-ink">
                        Delete account
                    </Text>
                </Pressable>
            </Section>

            {sheet === "email" && (
                <ChangeEmailSheet current={user?.email ?? ""} onClose={close} />
            )}
            {sheet === "password" && <ChangePasswordSheet onClose={close} />}
            {sheet === "color" && (
                <ChangeColorSheet
                    current={user?.color ?? "LIME"}
                    onClose={close}
                />
            )}
            {sheet === "delete" && <DeleteAccountSheet onClose={close} />}
        </>
    )
}

export default function Settings() {
    const params = useLocalSearchParams<{ tab?: string }>()
    const [tab, setTab] = useState<Tab>(
        params.tab === "integrations" ? "integrations" : "general"
    )
    const { loading, reload } = useAppData()
    const index = TABS.findIndex((t) => t.key === tab)
    // There's no pager here, so the strip's underline just glides on a tap.
    const position = useSharedValue(index)

    return (
        <Screen
            edges={["top", "bottom"]}
            refreshing={tab === "integrations" && loading}
            onRefresh={tab === "integrations" ? reload : undefined}
        >
            <BackBar />
            <Display size={32}>Settings</Display>
            {/* Pulled out through the screen's side padding, so its hairline
                runs edge to edge. */}
            <View className="-mx-5">
                <TabStrip
                    labels={TABS.map((t) => t.label)}
                    active={index}
                    position={position}
                    onSelect={(i) => {
                        position.set(withTiming(i, { duration: 200 }))
                        setTab(TABS[i].key)
                        router.setParams({ tab: TABS[i].key })
                    }}
                />
            </View>
            {tab === "general" ? <GeneralTab /> : <IntegrationsPanel />}
        </Screen>
    )
}
