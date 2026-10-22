// Settings — pushed from the gear on each tab. Two tabs: General (account,
// security, time zone, app info, sign out, delete) and Integrations (data sources).

import { type ReactNode, useEffect, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import Constants from "expo-constants"
import { useAtom } from "jotai"
import {
    browserTimezone,
    getSelf,
    getVersion,
    updateTimezone,
    useApi
} from "@shared/index"
import { apiConfig, useSignOut, userAtom } from "../../auth"
import { useAppData } from "../../features/common/AppData"
import {
    ChangeEmailSheet,
    ChangePasswordSheet,
    DeleteAccountSheet
} from "../../features/account/AccountSheets"
import { IntegrationsPanel } from "../../features/integration/IntegrationsPanel"
import { BackBar } from "../../ui/BackBar"
import { confirm } from "../../ui/confirm"
import { Screen } from "../../ui/Screen"
import { Button, Card, Display, ErrorList } from "../../ui/primitives"

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

/** Titled group of rows, like an iOS grouped table section. */
function Section({
    title,
    footer,
    children
}: {
    title?: string
    footer?: string
    children: ReactNode
}) {
    return (
        <View className="gap-2">
            {title && (
                <Text className="px-1 text-[13px] font-semibold text-ink-3">
                    {title}
                </Text>
            )}
            <Card className="px-4">{children}</Card>
            {footer && (
                <Text className="px-1 text-[12px] leading-[17px] text-ink-3">
                    {footer}
                </Text>
            )}
        </View>
    )
}

function Row({
    label,
    value,
    first = false,
    destructive = false,
    onPress
}: {
    label: string
    value?: string
    first?: boolean
    destructive?: boolean
    /** Makes the row tappable and adds a disclosure chevron. */
    onPress?: () => void
}) {
    return (
        <Pressable
            disabled={!onPress}
            accessibilityRole={onPress ? "button" : undefined}
            onPress={onPress}
            className={`flex-row items-center justify-between gap-4 py-3.5 ${
                first ? "" : "border-t border-line-2"
            }`}
        >
            <Text
                className={`text-[15px] ${
                    destructive ? "text-coral-ink" : "text-ink"
                }`}
            >
                {label}
            </Text>
            <Text
                numberOfLines={1}
                className="flex-1 text-right text-[15px] text-ink-3"
            >
                {value}
            </Text>
            {onPress && !destructive && (
                <Text className="text-[18px] text-ink-3">›</Text>
            )}
        </Pressable>
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
        <Section
            title="Time zone"
            footer="Goals, habits, and streaks are counted by day in your account's time zone."
        >
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
    const api = useApi()
    const [server, setServer] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        getVersion(api)
            .then((v) => !cancelled && setServer(v.version))
            .catch(() => !cancelled && setServer("Unreachable"))
        return () => {
            cancelled = true
        }
    }, [api])

    const version = Constants.expoConfig?.version ?? "—"
    const build = Constants.nativeBuildVersion

    return (
        <Section title="About">
            <Row
                first
                label="App version"
                value={build ? `${version} (${build})` : version}
            />
            <Row label="Server version" value={server ?? "…"} />
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
    const [sheet, setSheet] = useState<"email" | "password" | "delete" | null>(
        null
    )
    const close = () => setSheet(null)
    const initial = (user?.username[0] ?? "?").toUpperCase()

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
                <View className="h-14 w-14 items-center justify-center rounded-full bg-lime">
                    <Text className="text-[22px] font-bold text-ink">
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
            </Card>

            <Section title="Account">
                <Row first label="Username" value={user?.username ?? "—"} />
                <Row
                    label="Email"
                    value={user?.email ?? "—"}
                    onPress={() => setSheet("email")}
                />
                <Row
                    label="Member since"
                    value={user ? DATE_FMT.format(new Date(user.createdAt)) : "—"}
                />
            </Section>

            <Section
                title="Security"
                footer="Changing your password signs you out on your other devices."
            >
                <Row
                    first
                    label="Change password"
                    onPress={() => setSheet("password")}
                />
            </Section>

            <TimezoneSection />

            <AboutSection />

            <Section>
                <Pressable
                    accessibilityRole="button"
                    onPress={onSignOut}
                    className="items-center py-3.5"
                >
                    <Text className="text-[15px] font-medium text-coral-ink">
                        Sign out
                    </Text>
                </Pressable>
            </Section>

            <Section footer="Permanently deletes your account and everything in it.">
                <Row
                    first
                    destructive
                    label="Delete account"
                    onPress={() => setSheet("delete")}
                />
            </Section>

            {sheet === "email" && (
                <ChangeEmailSheet current={user?.email ?? ""} onClose={close} />
            )}
            {sheet === "password" && <ChangePasswordSheet onClose={close} />}
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
