import { useState } from 'react'
import { greet, version } from '@shared/index'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <h1 className="text-4xl font-semibold tracking-tight">
        {greet('accountable')}
      </h1>
      <p className="text-zinc-500">shared lib v{version}</p>
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        className="rounded-md bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-500 active:scale-95 transition"
      >
        count is {count}
      </button>
    </main>
  )
}

export default App
