import { useState } from "react"
import { StatusBar } from "expo-status-bar"
import { Pressable, Text, View } from "react-native"
import { greet, version } from "@shared/index"
import "./global.css"

export default function App() {
    const [count, setCount] = useState(0)

    return (
        <View className="flex-1 items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950">
            <Text className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                {greet("accountable")}
            </Text>
            <Text className="text-zinc-500">shared lib v{version}</Text>
            <Pressable
                onPress={() => setCount((c) => c + 1)}
                className="rounded-md bg-indigo-600 px-4 py-2 active:opacity-80"
            >
                <Text className="text-white">count is {count}</Text>
            </Pressable>
            <StatusBar style="auto" />
        </View>
    )
}
