import { useEffect, useState } from "react"
import { useAtom, useAtomValue } from "jotai"
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"
import { ApiError, getSelf, syncTimezone, useApi } from "@shared/index"
import { tokenStore, userAtom } from "./auth"
import { Footer } from "./features/common/Footer"
import Landing from "./features/landing"
import Login from "./features/auth/Login"
import Billboard, {
    CompetitionWidget,
    GoalsWidget,
    HabitWidget,
    HabitsWidget
} from "./features/billboard"

/** Wraps every page with the shared site footer. */
function Layout() {
    return (
        <div className="flex min-h-screen flex-col">
            <Outlet />
            <div className="acc mx-auto w-full max-w-[1440px]">
                <Footer />
            </div>
        </div>
    )
}

/** Gates nested routes behind an authenticated session, returning here after sign-in. */
function RequireAuth() {
    const user = useAtomValue(userAtom)
    const location = useLocation()
    if (!user) {
        const next = encodeURIComponent(location.pathname)
        return <Navigate to={`/login?next=${next}`} replace />
    }
    return <Outlet />
}

function App() {
    const api = useApi()
    const [, setUser] = useAtom(userAtom)
    // Only hydrate when there's a stored token to validate.
    const [hydrating, setHydrating] = useState(() => tokenStore.hasSession())

    // Restore the session from the stored tokens on first load. An expired access
    // token is refreshed inside `getSelf`; only a rejected session clears them, so
    // a display that boots while the backend is down can still recover on reload.
    useEffect(() => {
        if (!hydrating) return
        let cancelled = false
        getSelf(api)
            .catch((err) => {
                if (err instanceof ApiError && err.status === 401)
                    tokenStore.clear()
                return null
            })
            .then((me) => {
                if (cancelled) return
                setUser(me)
                setHydrating(false)
                if (me) void syncTimezone(api, me.timezone)
            })

        return () => {
            cancelled = true
        }
    }, [api, hydrating, setUser])

    if (hydrating) {
        return (
            <main className="acc flex min-h-screen items-center justify-center">
                <p className="text-ink-3">Loading…</p>
            </main>
        )
    }

    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route element={<RequireAuth />}>
                    <Route path="/billboard" element={<Billboard />} />
                </Route>
            </Route>

            {/* Full-screen widgets: no footer, sized to the viewport. */}
            <Route element={<RequireAuth />}>
                <Route path="/billboard/goals" element={<GoalsWidget />} />
                <Route path="/billboard/habits" element={<HabitsWidget />} />
                <Route path="/billboard/habits/:id" element={<HabitWidget />} />
                <Route
                    path="/billboard/competitions/:id"
                    element={<CompetitionWidget />}
                />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
