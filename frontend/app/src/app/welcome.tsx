// First screen for signed-out users. Sign-in and sign-up are separate screens
// pushed from here.

import { Text, View } from "react-native"
import { router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { AccLogo, Button, Display, IntegrationIcon } from "../ui/primitives"
import { colors } from "../theme"

const SOURCES = [
    { name: "github", label: "GitHub" },
    { name: "leetcode", label: "LeetCode" },
    { name: "apple_fitness", label: "Workouts" }
]

export default function Welcome() {
    return (
        <SafeAreaView className="flex-1 bg-bg px-6">
            <View className="pt-4">
                <AccLogo />
            </View>

            <View className="flex-1 justify-center gap-5">
                <View className="gap-1.5">
                    <Display size={40}>Goals get done</Display>
                    <Display size={40}>when friends are</Display>
                    <View className="self-start rounded-xl bg-lime px-3 py-1">
                        <Display size={40}>watching.</Display>
                    </View>
                </View>

                <Text className="text-[17px] leading-[24px] text-ink-2">
                    Track commits, LeetCode problems, and workouts automatically,
                    and share your progress with friends.
                </Text>

                <View className="flex-row gap-3">
                    {SOURCES.map((s) => (
                        <View
                            key={s.name}
                            accessibilityLabel={s.label}
                            style={{ backgroundColor: colors.bgSunken }}
                            className="h-12 w-12 items-center justify-center rounded-[14px]"
                        >
                            <IntegrationIcon name={s.name} size={22} />
                        </View>
                    ))}
                </View>
            </View>

            <View className="gap-3 pb-2">
                <Button
                    label="Create account"
                    size="lg"
                    onPress={() => router.push("/register")}
                />
                <Button
                    label="Sign in"
                    size="lg"
                    variant="ghost"
                    onPress={() => router.push("/login")}
                />
            </View>
        </SafeAreaView>
    )
}
