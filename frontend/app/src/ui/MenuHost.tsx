// The action sheet showMenu (menu.ts) opens off iOS. Android's alert holds at
// most three buttons, so a menu with more would silently lose choices there;
// this lists any number. Mounted once, at the root.

import { useEffect, useState } from "react"
import { Modal, Pressable, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { type MenuAction, setMenuPresenter } from "./menu"

type OpenMenu = { title: string; actions: MenuAction[] }

export function MenuHost() {
    const [menu, setMenu] = useState<OpenMenu | null>(null)
    const insets = useSafeAreaInsets()

    useEffect(() => {
        setMenuPresenter((title, actions) => setMenu({ title, actions }))
        return () => setMenuPresenter(null)
    }, [])

    const close = () => setMenu(null)

    return (
        <Modal
            visible={menu !== null}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={close}
        >
            <Pressable
                className="flex-1 justify-end bg-black/40"
                onPress={close}
                accessibilityLabel="Close menu"
            >
                {/* Swallows taps so a press inside the sheet doesn't close it. */}
                <Pressable
                    className="rounded-t-[24px] bg-bg-card px-4 pt-4"
                    style={{ paddingBottom: Math.max(insets.bottom, 16) }}
                >
                    <Text className="mb-2 px-2 text-[13px] font-semibold text-ink-3">
                        {menu?.title}
                    </Text>
                    {menu?.actions.map((action) => (
                        <Pressable
                            key={action.label}
                            accessibilityRole="button"
                            onPress={() => {
                                close()
                                action.run()
                            }}
                            className="rounded-[14px] px-2 py-3.5 active:bg-bg-sunken"
                        >
                            <Text
                                className={`text-[17px] ${
                                    action.destructive
                                        ? "font-semibold text-coral"
                                        : "text-ink"
                                }`}
                            >
                                {action.label}
                            </Text>
                        </Pressable>
                    ))}
                    <View className="my-1 h-px bg-line-2" />
                    <Pressable
                        accessibilityRole="button"
                        onPress={close}
                        className="rounded-[14px] px-2 py-3.5 active:bg-bg-sunken"
                    >
                        <Text className="text-[17px] font-semibold text-ink">
                            Cancel
                        </Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    )
}
