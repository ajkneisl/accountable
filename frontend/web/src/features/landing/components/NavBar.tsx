// Landing top navigation.

import { useAtomValue } from "jotai"
import { Link } from "react-router-dom"
import { isAuthenticatedAtom } from "../../../auth"
import { LogoLink } from "../../common/primitives"

export function NavBar() {
    const signedIn = useAtomValue(isAuthenticatedAtom)
    return (
        <nav className="flex items-center justify-between px-6 py-6 md:px-16">
            <LogoLink />
            <Link
                to={signedIn ? "/billboard" : "/login"}
                className="btn btn-line btn-sm"
            >
                {signedIn ? "Billboard" : "Sign in"}
            </Link>
        </nav>
    )
}
