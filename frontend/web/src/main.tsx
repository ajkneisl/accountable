import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { ApiProvider } from "@shared/index"
import "./index.css"
import "./design/theme.css"
import App from "./App.tsx"
import { apiConfig } from "./auth"

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ApiProvider config={apiConfig}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </ApiProvider>
    </StrictMode>
)
