// Shown once to anyone in a competition, since the feed shows competitors more
// than they could see when they joined. Links to the setting that turns it down.

import { useEffect, useState } from "react"
import { Text, View } from "react-native"
import { router } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { Button, Card, Eyebrow } from "../../ui/primitives"

const SEEN_KEY = "accountable_feed_intro_seen"

export function FeedIntroCard() {
    const [show, setShow] = useState(false)

    useEffect(() => {
        let cancelled = false
        SecureStore.getItemAsync(SEEN_KEY)
            .then((seen) => {
                if (!cancelled && !seen) setShow(true)
            })
            .catch(() => {
                // Can't tell, so don't risk showing it every launch.
            })
        return () => {
            cancelled = true
        }
    }, [])

    if (!show) return null

    function dismiss() {
        setShow(false)
        void SecureStore.setItemAsync(SEEN_KEY, "1").catch(() => {})
    }

    return (
        <Card className="gap-3 p-5">
            <Eyebrow>New: your feed</Eyebrow>
            <Text className="text-[15px] leading-[21px] text-ink">
                People in your competitions now see updates for the sources you
                compete on, including repo names, LeetCode problems and workout
                details. Your other goals and your habits stay private.
            </Text>
            <View className="flex-row gap-2">
                <Button label="Got it" size="sm" onPress={dismiss} />
                <Button
                    label="Change in Settings"
                    variant="line"
                    size="sm"
                    onPress={() => {
                        dismiss()
                        router.push("/settings")
                    }}
                />
            </View>
        </Card>
    )
}
