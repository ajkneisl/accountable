// Shown on the dashboard in place of the Goals and Habits cards while the user
// has neither: the three things that fill it in, each opening where it's done.

import { Pressable, Text } from "react-native"
import { type Href, router } from "expo-router"
import { Card, Eyebrow } from "../../../ui/primitives"
import { OpenBox } from "./OpenBox"

const STEPS: { label: string; href: Href }[] = [
    {
        label: "Connect an integration",
        href: { pathname: "/settings", params: { tab: "integrations" } }
    },
    { label: "Set a goal", href: "/goals" },
    { label: "Add a habit", href: "/habits" }
]

export function OnboardingCard() {
    return (
        <Card className="p-5">
            <Eyebrow className="mb-1.5">Get started</Eyebrow>
            {STEPS.map((step, i) => (
                <Pressable
                    key={step.label}
                    onPress={() => router.push(step.href)}
                    accessibilityRole="button"
                    className={`flex-row items-center justify-between py-3 ${
                        i > 0 ? "border-t border-line-2" : ""
                    }`}
                >
                    <Text className="text-[15px] font-medium text-ink">
                        {step.label}
                    </Text>
                    <OpenBox />
                </Pressable>
            ))}
        </Card>
    )
}
