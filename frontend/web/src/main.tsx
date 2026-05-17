import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ApiProvider } from "@shared/index"
import "./index.css"
import App from "./App.tsx"
import { apiConfig } from "./auth"

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ApiProvider config={apiConfig}>
            <App />
        </ApiProvider>
    </StrictMode>
)
