// Picking a square photo — for a profile picture or a competition's picture.
// The system photo picker (quick to open) hands over the original, then a crop
// screen lets you move and pinch it into a square. The square is cut out and
// shrunk here, so what's uploaded is small.

import { type ReactNode, useRef, useState } from "react"
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    Pressable,
    Text,
    View
} from "react-native"
import { File } from "expo-file-system"
import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import * as ImagePicker from "expo-image-picker"
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView
} from "react-native-gesture-handler"
import Animated, {
    useAnimatedStyle,
    useSharedValue
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError, type UploadFile } from "@shared/index"
import { Spinner } from "../../ui/primitives"

/** Side of the square uploaded; the server stores it at half this. */
const UPLOAD_SIZE = 768

/** How far in the photo can be pinched, past filling the square. */
const MAX_ZOOM = 4

/**
 * The JPEG at [uri] as an upload's file. Read through expo-file-system: Expo's
 * fetch only sends a file part it can get the bytes of.
 */
export function jpegUpload(uri: string): UploadFile {
    const file = new File(uri)
    return {
        name: "picture.jpg",
        type: "image/jpeg",
        bytes: () => file.bytes()
    }
}

/**
 * An alert for a failed upload. Anything but the server's answer goes with its
 * message, so a failure on the phone isn't mistaken for a bad connection.
 */
export function showUploadError(title: string, err: unknown) {
    Alert.alert(
        title,
        err instanceof ApiError
            ? err.messages.join("\n")
            : `Check your connection and try again.${
                  err instanceof Error ? `\n\n${err.message}` : ""
              }`
    )
}

/** A crop, in the photo's pixels (upright). */
type Rect = { originX: number; originY: number; width: number; height: number }

type Pending = {
    uri: string
    width: number
    height: number
    context: ReturnType<typeof ImageManipulator.manipulate>
    resolve: (uri: string | null) => void
}

/**
 * `pick()` opens the photo picker and then the crop screen, resolving with a
 * square JPEG's file URI, or null if cancelled at either step. Render
 * `element` somewhere on the screen that calls it.
 */
export function usePickSquarePhoto(): {
    pick: () => Promise<string | null>
    element: ReactNode
} {
    const [pending, setPending] = useState<Pending | null>(null)

    async function pick(): Promise<string | null> {
        // No allowsEditing: on iOS it swaps the system photo picker, which
        // opens at once, for the old in-app one, slow to open and to crop.
        // The original as it's stored (often HEIC) skips a slow conversion;
        // the manipulator reads it as is.
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            preferredAssetRepresentationMode:
                ImagePicker.UIImagePickerPreferredAssetRepresentationMode
                    .Current
        })
        if (result.canceled) return null
        const uri = result.assets[0].uri
        // Loaded once: rendering gives its upright size for the crop screen,
        // and the crop is then added to the same context.
        const context = ImageManipulator.manipulate(uri)
        const { width, height } = await context.renderAsync()
        return new Promise((resolve) =>
            setPending({ uri, width, height, context, resolve })
        )
    }

    async function choose(rect: Rect) {
        if (!pending) return
        const { context } = pending
        context.crop(rect)
        if (rect.width > UPLOAD_SIZE) context.resize({ width: UPLOAD_SIZE })
        const image = await context.renderAsync()
        const saved = await image.saveAsync({
            format: SaveFormat.JPEG,
            compress: 0.85
        })
        pending.resolve(saved.uri)
        setPending(null)
    }

    function cancel() {
        pending?.resolve(null)
        setPending(null)
    }

    const element = pending ? (
        <CropScreen
            key={pending.uri}
            uri={pending.uri}
            width={pending.width}
            height={pending.height}
            onCancel={cancel}
            onChoose={choose}
        />
    ) : null

    return { pick, element }
}

/**
 * Full screen: the photo behind a square frame with a circle in it (how an
 * avatar shows it). Drag to move it and pinch to zoom; it always covers the
 * square. Choose hands back the square's rectangle in the photo's pixels.
 */
function CropScreen({
    uri,
    width,
    height,
    onCancel,
    onChoose
}: {
    uri: string
    width: number
    height: number
    onCancel: () => void
    onChoose: (rect: Rect) => Promise<void>
}) {
    const insets = useSafeAreaInsets()
    const frame = Dimensions.get("window").width - 40
    // Points per pixel at which the photo just covers the frame.
    const base = frame / Math.min(width, height)
    const shownW = width * base
    const shownH = height * base

    const zoom = useSharedValue(1)
    const x = useSharedValue(0)
    const y = useSharedValue(0)
    const start = useSharedValue({ zoom: 1, x: 0, y: 0 })
    const [busy, setBusy] = useState(false)
    const busyRef = useRef(false)

    const pinch = Gesture.Pinch()
        .onStart(() => {
            start.set({ zoom: zoom.get(), x: x.get(), y: y.get() })
        })
        .onUpdate((e) => {
            const z = Math.min(
                MAX_ZOOM,
                Math.max(1, start.get().zoom * e.scale)
            )
            zoom.set(z)
            // Zooming out can leave an edge inside the frame: pull it back.
            const maxX = (shownW * z - frame) / 2
            const maxY = (shownH * z - frame) / 2
            x.set(Math.min(maxX, Math.max(-maxX, x.get())))
            y.set(Math.min(maxY, Math.max(-maxY, y.get())))
        })

    const pan = Gesture.Pan()
        .onStart(() => {
            start.set({ zoom: zoom.get(), x: x.get(), y: y.get() })
        })
        .onUpdate((e) => {
            const z = zoom.get()
            const maxX = (shownW * z - frame) / 2
            const maxY = (shownH * z - frame) / 2
            x.set(
                Math.min(maxX, Math.max(-maxX, start.get().x + e.translationX))
            )
            y.set(
                Math.min(maxY, Math.max(-maxY, start.get().y + e.translationY))
            )
        })

    const photoStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: x.get() },
            { translateY: y.get() },
            { scale: zoom.get() }
        ]
    }))

    async function choose() {
        if (busyRef.current) return
        busyRef.current = true
        setBusy(true)
        // The frame's top-left, from the photo's middle, in the photo's pixels.
        const scale = base * zoom.get()
        const side = Math.min(
            Math.min(width, height),
            Math.floor(frame / scale)
        )
        const left = width / 2 + (-frame / 2 - x.get()) / scale
        const top = height / 2 + (-frame / 2 - y.get()) / scale
        const rect = {
            originX: Math.max(0, Math.min(width - side, Math.floor(left))),
            originY: Math.max(0, Math.min(height - side, Math.floor(top))),
            width: side,
            height: side
        }
        try {
            await onChoose(rect)
        } finally {
            busyRef.current = false
            setBusy(false)
        }
    }

    return (
        <Modal
            visible
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onCancel}
        >
            {/* A modal is its own native view, so gestures need their own root. */}
            <GestureHandlerRootView
                style={{ flex: 1, backgroundColor: "#000" }}
            >
                <Text
                    style={{ paddingTop: insets.top + 16 }}
                    className="text-center text-[15px] font-semibold text-white"
                >
                    Move and scale
                </Text>

                <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
                    <View className="flex-1 items-center justify-center overflow-hidden">
                        <View style={{ width: frame, height: frame }}>
                            <Animated.View
                                style={[
                                    {
                                        position: "absolute",
                                        width: shownW,
                                        height: shownH,
                                        left: (frame - shownW) / 2,
                                        top: (frame - shownH) / 2
                                    },
                                    photoStyle
                                ]}
                            >
                                <Image
                                    source={{ uri }}
                                    accessibilityIgnoresInvertColors
                                    style={{ width: shownW, height: shownH }}
                                />
                            </Animated.View>
                            {/* Dims everything outside the square: a border
                                far wider than the screen, hung round it. */}
                            <View
                                pointerEvents="none"
                                style={{
                                    position: "absolute",
                                    left: -2000,
                                    top: -2000,
                                    width: frame + 4000,
                                    height: frame + 4000,
                                    borderWidth: 2000,
                                    borderColor: "rgba(0,0,0,0.6)"
                                }}
                            />
                            {/* The circle an avatar is shown in. */}
                            <View
                                pointerEvents="none"
                                style={{
                                    position: "absolute",
                                    width: frame,
                                    height: frame,
                                    borderRadius: frame / 2,
                                    borderWidth: 1.5,
                                    borderColor: "rgba(255,255,255,0.85)"
                                }}
                            />
                        </View>
                    </View>
                </GestureDetector>

                <View
                    style={{ paddingBottom: insets.bottom + 12 }}
                    className="flex-row items-center justify-between px-6 pt-3"
                >
                    <Pressable
                        accessibilityRole="button"
                        onPress={onCancel}
                        disabled={busy}
                        hitSlop={10}
                    >
                        <Text className="text-[17px] text-white">Cancel</Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        onPress={choose}
                        disabled={busy}
                        hitSlop={10}
                    >
                        {busy ? (
                            <Spinner size={20} />
                        ) : (
                            <Text className="text-[17px] font-semibold text-white">
                                Choose
                            </Text>
                        )}
                    </Pressable>
                </View>
            </GestureHandlerRootView>
        </Modal>
    )
}
