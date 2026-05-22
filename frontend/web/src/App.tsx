import { useEffect, useState, type ReactNode } from "react"
import { useAtom } from "jotai"
import { Navigate, Route, Routes } from "react-router-dom"
import { getSelf, useApi } from "@shared/index"
import { tokenStore, userAtom } from "./auth"
import Login from "./Login"
import Landing from "./features/landing"
import Dashboard from "./features/dashboard"
import Competition from "./features/competition"
import Onboarding from "./features/onboarding"

/** Gates a route behind an authenticated session. */
function RequireAuth({ children }: { children: ReactNode }) {
    const [user] = useAtom(userAtom)
    if (!user) return <Navigate to="/login" replace />
    return <>{children}</>
}

function App() {
    const api = useApi()
    const [, setUser] = useAtom(userAtom)
    // Only hydrate when there's a stored token to validate.
    const [hydrating, setHydrating] = useState(() => tokenStore.getAccess() != null)

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
            <main
                className="acc"
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <p style={{ color: "var(--ink-3)" }}>Loading…</p>
            </main>
        )
    }

    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
                path="/dashboard"
                element={
                    <RequireAuth>
                        <Dashboard />
                    </RequireAuth>
                }
            />
            <Route
                path="/competition"
                element={
                    <RequireAuth>
                        <Competition />
                    </RequireAuth>
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
