import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import { Footer } from "./features/common/Footer"
import Landing from "./features/landing"

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

function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Landing />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
