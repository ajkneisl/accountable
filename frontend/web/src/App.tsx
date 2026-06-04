import { useEffect, useState } from "react"
import { useAtom } from "jotai"
import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import { getSelf, useApi } from "@shared/index"
import { tokenStore, userAtom } from "./auth"
import { AppShell } from "./features/common/AppShell"
import { Footer } from "./features/common/Footer"
import Login from "./Login"
import Register from "./Register"
import Landing from "./features/landing"
import Dashboard from "./features/dashboard"
import Competition, { AllCompetitions } from "./features/competition"
import IntegrationPage from "./features/integration"
import { ProfilePage, SettingsPage } from "./features/account"

/** Wraps every page with the shared site footer. */
function Layout() {
    return (
        <div className="flex min-h-screen flex-col">
            <Outlet />
            <div className="acc mx-auto w-[1440px]">
                <Footer />
            </div>
        </div>
    )
}

/** Gates nested routes behind an authenticated session. */
function RequireAuth() {
    const [user] = useAtom(userAtom)
    if (!user) return <Navigate to="/login" replace />
    return <Outlet />
}

function App() {
    const api = useApi()
    const [, setUser] = useAtom(userAtom)
    // Only hydrate when there's a stored token to validate.
    const [hydrating, setHydrating] = useState(
        () => tokenStore.getAccess() != null
    )

    // Restore the session from the stored access token on first load.
    useEffect(() => {
        if (!hydrating) return
        let cancelled = false
        getSelf(api)
            .catch(() => {
                tokenStore.clear()
                return null
            })
            .then((me) => {
                if (cancelled) return
                setUser(me)
                setHydrating(false)
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
                <Route path="/register" element={<Register />} />
                <Route element={<RequireAuth />}>
                    <Route element={<AppShell />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/competition" element={<Competition />} />
                        <Route
                            path="/competitions"
                            element={<AllCompetitions />}
                        />
                        <Route
                            path="/integrations/:name"
                            element={<IntegrationPage />}
                        />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
