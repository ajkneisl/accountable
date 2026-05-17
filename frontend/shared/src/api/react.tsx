import { createContext, useContext, type ReactNode } from "react"
import type { ApiConfig } from "./http"

/**
 * {@link ApiProvider}
 *
 * @param config API Config
 * @param children The react children
 */
export interface ApiProviderProps {
    config: ApiConfig
    children: ReactNode
}

const ApiContext = createContext<ApiConfig | null>(null)

/**
 * Provide {@link ApiConfig} across a react program.
 */
export function ApiProvider({ config, children }: ApiProviderProps) {
    return <ApiContext.Provider value={config}>{children}</ApiContext.Provider>
}

/**
 * Use the context provided by {@link ApiProvider} to get a {@link ApiConfig}.
 */
export function useApi(): ApiConfig {
    const config = useContext(ApiContext)

    if (!config) {
        throw new Error("useApi must be used inside an <ApiProvider>")
    }

    return config
}
