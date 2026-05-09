import { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { greet, version } from '@shared/index'
import { api, tokenStore, userAtom } from './auth'
import Login from './Login'

function App() {
  const [user, setUser] = useAtom(userAtom)
  const [hydrating, setHydrating] = useState(true)

  useEffect(() => {
    if (!tokenStore.getAccess()) {
      setHydrating(false)
      return
    }
    let cancelled = false
    api
      .me()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        tokenStore.clear()
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setHydrating(false)
      })
    return () => {
      cancelled = true
    }
  }, [setUser])

  if (hydrating) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <p className="text-zinc-500">Loading…</p>
      </main>
    )
  }

  if (!user) return <Login />

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <h1 className="text-4xl font-semibold tracking-tight">
        {greet(user.username)}
      </h1>
      <p className="text-zinc-500">shared lib v{version}</p>
      <button
        type="button"
        onClick={async () => {
          const refresh = tokenStore.getRefresh()
          if (refresh) await api.logout(refresh).catch(() => {})
          tokenStore.clear()
          setUser(null)
        }}
        className="rounded-md bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-500 active:scale-95 transition"
      >
        Sign out
      </button>
    </main>
  )
}

export default App
