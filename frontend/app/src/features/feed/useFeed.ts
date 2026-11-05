// The feed's posts and paging. Hearts apply straight away and roll back if the
// server refuses, so tapping one never waits on the network.

import { useCallback, useRef, useState } from "react"
import {
    type FeedPost,
    getFeed,
    likeFeedPost,
    unlikeFeedPost,
    useApi
} from "@shared/index"

export function useFeed() {
    const api = useApi()
    const [posts, setPosts] = useState<FeedPost[] | null>(null)
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // Only the latest reload may land, so a slow response can't undo a newer one.
    const latest = useRef(0)

    const reload = useCallback(async () => {
        const request = ++latest.current
        try {
            const page = await getFeed(api)
            if (request !== latest.current) return
            setPosts(page.posts)
            setNextCursor(page.nextCursor)
            setError(null)
        } catch (err) {
            if (request !== latest.current) return
            setError(err instanceof Error ? err.message : "failed to load")
        }
    }, [api])

    const loadMore = useCallback(async () => {
        if (!nextCursor || loadingMore) return
        const request = latest.current
        setLoadingMore(true)
        try {
            const page = await getFeed(api, nextCursor)
            if (request !== latest.current) return
            // A card that rose between pages could appear in both.
            setPosts((prev) => {
                const seen = new Set(prev?.map((p) => p.id))
                return [
                    ...(prev ?? []),
                    ...page.posts.filter((p) => !seen.has(p.id))
                ]
            })
            setNextCursor(page.nextCursor)
        } catch {
            // The button stays, so they can try again.
        } finally {
            setLoadingMore(false)
        }
    }, [api, nextCursor, loadingMore])

    const toggleLike = useCallback(
        async (post: FeedPost) => {
            const patch = (id: string, change: Partial<FeedPost>) =>
                setPosts(
                    (prev) =>
                        prev?.map((p) =>
                            p.id === id ? { ...p, ...change } : p
                        ) ?? prev
                )
            const liked = !post.likedByMe
            patch(post.id, {
                likedByMe: liked,
                likeCount: post.likeCount + (liked ? 1 : -1)
            })
            try {
                const result = await (liked ? likeFeedPost : unlikeFeedPost)(
                    api,
                    post.id
                )
                patch(post.id, result)
            } catch {
                patch(post.id, {
                    likedByMe: post.likedByMe,
                    likeCount: post.likeCount
                })
            }
        },
        [api]
    )

    return {
        /** Null until the first load finishes; the caller decides when to [reload]. */
        posts,
        hasMore: nextCursor !== null,
        loadingMore,
        error,
        reload,
        loadMore,
        toggleLike
    }
}
