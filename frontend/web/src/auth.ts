import { atom } from 'jotai'
import { ApiClient, type MeResponse, type TokenResponse } from '@shared/index'

const ACCESS_COOKIE = 'accountable_access'
const REFRESH_COOKIE = 'accountable_refresh'

function readCookie(name: string): string | null {
  const target = `${name}=`
  for (const part of document.cookie.split(';')) {
    const c = part.trim()
    if (c.startsWith(target)) return decodeURIComponent(c.slice(target.length))
  }
  return null
}

function writeCookie(name: string, value: string, expiresAtMs: number) {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  const expires = new Date(expiresAtMs).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Expires=${expires}; SameSite=Lax${secure}`
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}

export const tokenStore = {
  getAccess: () => readCookie(ACCESS_COOKIE),
  getRefresh: () => readCookie(REFRESH_COOKIE),
  set(tokens: TokenResponse) {
    writeCookie(ACCESS_COOKIE, tokens.accessToken, tokens.accessTokenExpiresAt)
    writeCookie(REFRESH_COOKIE, tokens.refreshToken, tokens.refreshTokenExpiresAt)
  },
  clear() {
    clearCookie(ACCESS_COOKIE)
    clearCookie(REFRESH_COOKIE)
  },
}

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export const api = new ApiClient({
  baseUrl,
  getAccessToken: tokenStore.getAccess,
})

export const userAtom = atom<MeResponse | null>(null)

export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null)
