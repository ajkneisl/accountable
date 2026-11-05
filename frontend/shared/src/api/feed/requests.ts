import type { GoalPeriod } from "../goals/requests"
import type { HabitColor } from "../habits/requests"
import { request, type ApiConfig } from "../http"
import type { WorkoutType } from "../integrations/requests"

/** What a feed card says. `type` is the card's source. */
export type FeedDetail =
    | {
          type: "github"
          commits: number
          /** The busiest public repos. Empty if the person has turned details off. */
          repos: { repo: string; commits: number }[]
          /** Commits not named in `repos`. */
          otherCommits: number
      }
    | {
          type: "leetcode"
          solved: number
          /** The first few problems. Empty if the person has turned details off. */
          solves: { title: string; difficulty: string }[]
          /** Problems not named in `solves`. */
          otherSolved: number
      }
    | {
          type: "apple_fitness"
          /** All three are null if the person has turned details off. */
          workoutType: WorkoutType | null
          durationMin: number | null
          calories: number | null
          /** Logged by hand rather than imported from Apple Health. Always present. */
          manual: boolean
      }
    | { type: "apple_steps"; steps: number }
    | { type: "apple_sleep"; minutes: number }
    | { type: "screen_time"; minutes: number }

/** A goal's standing on a card. */
export interface FeedGoalChip {
    /** The competition it's from; both are null for your own personal goal. */
    competitionID: string | null
    competitionName: string | null
    metric: string
    period: GoalPeriod
    target: number
    value: number
    met: boolean
}

/** One card, as the requesting user is allowed to see it. */
export interface FeedPost {
    id: string
    actor: { userID: string; username: string; color: HabitColor }
    integration: string
    /** The person's local date, `YYYY-MM-DD`. */
    day: string
    lastActivityAt: number
    detail: FeedDetail
    goals: FeedGoalChip[]
    likeCount: number
    likedByMe: boolean
}

export interface FeedResponse {
    posts: FeedPost[]
    /** Pass as `before` for the next page; null when there's nothing older. */
    nextCursor: string | null
}

export interface FeedLikeResponse {
    likeCount: number
    likedByMe: boolean
}

/** GET /api/feed — the user's feed, newest activity first. */
export function getFeed(
    config: ApiConfig,
    before?: string
): Promise<FeedResponse> {
    const query = before ? `?before=${encodeURIComponent(before)}` : ""
    return request(config, "GET", `/feed${query}`, undefined, { auth: true })
}

/** PUT /api/feed/{id}/like — heart a card. Idempotent. */
export function likeFeedPost(
    config: ApiConfig,
    id: string
): Promise<FeedLikeResponse> {
    return request(config, "PUT", `/feed/${id}/like`, undefined, { auth: true })
}

/** DELETE /api/feed/{id}/like — take back a heart. Idempotent. */
export function unlikeFeedPost(
    config: ApiConfig,
    id: string
): Promise<FeedLikeResponse> {
    return request(config, "DELETE", `/feed/${id}/like`, undefined, {
        auth: true
    })
}
