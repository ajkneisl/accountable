// Settings — pushed from the gear on each tab. Two tabs: General (account,
// security, notifications, time zone, app info, sign out, delete) and Integrations (data sources).

import { type ReactNode, useEffect, useState } from "react"
import { AppState, Linking, Pressable, Switch, Text, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import Constants from "expo-constants"
import { useAtom } from "jotai"
import {
    browserTimezone,
    getSelf,
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
import { HABIT_PALETTE } from "../../features/habits/grid"
import { IntegrationsPanel } from "../../features/integration/IntegrationsPanel"
import {
    enablePushes,
    pushPermission,
    pushSupported,
    type PushPermission
} from "../../features/notifications/notifications"
import { colors } from "../../theme"
import { BackBar } from "../../ui/BackBar"
import { confirm } from "../../ui/confirm"
import { Screen } from "../../ui/Screen"
import { Button, Card, Display, ErrorList } from "../../ui/primitives"
import { Row, Section } from "../../ui/SettingsList"

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

function Segmented({
    value,
    onChange
}: {
    value: Tab
    onChange: (tab: Tab) => void
}) {
    return (
        <View
            accessibilityRole="tablist"
            className="flex-row rounded-[12px] bg-bg-sunken p-1"
        >
            {TABS.map((t) => {
                const selected = t.key === value
                return (
                    <Pressable
                        key={t.key}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        onPress={() => onChange(t.key)}
                        className={`flex-1 items-center rounded-[9px] py-2 ${
                            selected ? "bg-bg-card" : ""
                        }`}
                    >
                        <Text
                            className={`text-[14px] ${
                                selected
                                    ? "font-semibold text-ink"
                                    : "font-medium text-ink-3"
                            }`}
                        >
                            {t.label}
                        </Text>
                    </Pressable>
                )
            })}
        </View>
    )
}

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
    { kind: "COMPETITION_RECAP", label: "Competition recap" }
]

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
            <Row first label="Account" value={user?.timezone ?? "—"} />
            <Row label="This device" value={device} />
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

            <Row
                label="Server"
                value={apiConfig.baseUrl.replace(/^https?:\/\//, "")}
            />
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
    const initial = (user?.username[0] ?? "?").toUpperCase()
    // A user signed in before colors existed has none until the next refresh.
    const palette = HABIT_PALETTE[user?.color ?? "LIME"]

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
                <View
                    style={{ backgroundColor: palette.fill }}
                    className="h-14 w-14 items-center justify-center rounded-full"
                >
                    <Text
                        style={{ color: palette.dark ? colors.bg : colors.ink }}
                        className="text-[22px] font-bold"
                    >
                        {initial}
                    </Text>
                </View>
                <View className="flex-1">
                    <Text className="text-[19px] font-bold tracking-tight text-ink">
                        {user?.username ?? "—"}
                    </Text>
                    <Text numberOfLines={1} className="text-[14px] text-ink-3">
                        {user?.email ?? "—"}
                    </Text>
                </View>
                <Button
                    label="Sign out"
                    variant="line"
                    size="sm"
                    onPress={onSignOut}
                />
            </Card>

            <Section title="Account">
                <Row first label="Username" value={user?.username ?? "—"} />
                <Row
                    label="Color"
                    value={palette.label}
                    onPress={() => setSheet("color")}
                />
                <Row
                    label="Email"
                    value={user?.email ?? "—"}
                    onPress={() => setSheet("email")}
                />
                <Row
                    label="Member since"
                    value={
                        user ? DATE_FMT.format(new Date(user.createdAt)) : "—"
                    }
                />
            </Section>

            <Section title="Security">
                <Row
                    first
                    label="Change password"
                    onPress={() => setSheet("password")}
                />
            </Section>

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

    return (
        <Screen
            edges={["top", "bottom"]}
            refreshing={tab === "integrations" && loading}
            onRefresh={tab === "integrations" ? reload : undefined}
        >
            <BackBar />
            <Display size={32}>Settings</Display>
            <Segmented
                value={tab}
                onChange={(t) => {
                    setTab(t)
                    router.setParams({ tab: t })
                }}
            />
            {tab === "general" ? <GeneralTab /> : <IntegrationsPanel />}
        </Screen>
    )
}
