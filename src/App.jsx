import { lazy, Suspense, useState } from 'react'
import { Play } from 'lucide-react'
import { DEFAULTS } from './settings.js'
import useLS from './useLS.js'

const loadPrompter = () => import('./Prompter.jsx')
const Prompter = lazy(loadPrompter)
const preloadPrompter = () => {
  void loadPrompter().catch((error) => {
    console.warn('Could not preload the prompter.', error)
  })
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))
const newScript = () => ({ id: uid(), title: 'My script', text: '', updated: Date.now() })

export default function App() {
  const [scripts, setScripts] = useLS('arprompter.scripts', [newScript()], 'cuedeck.scripts')
  const [curId] = useLS('arprompter.current', null, 'cuedeck.current')
  const [s, setS] = useLS('arprompter.settings', DEFAULTS, 'cuedeck.settings')
  const [reading, setReading] = useState(false)
  const cur = scripts.find((script) => script.id === curId) || scripts[0]
  const canStart = Boolean(cur.text.trim())
  const set = (changes) => setS((settings) => ({ ...settings, ...changes }))
  const updateText = (text) => {
    setScripts((items) => items.map((script) => (
      script.id === cur.id ? { ...script, text, updated: Date.now() } : script
    )))
  }

  if (reading) {
    return (
      <Suspense fallback={<main className="grid min-h-screen place-items-center bg-zinc-950 text-white" role="status">Loading prompter…</main>}>
        <Prompter full text={cur.text} s={s} set={set} onExit={() => setReading(false)} />
      </Suspense>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-10 text-zinc-900 sm:px-6">
      <section className="w-full max-w-xl text-center">
        <h1 className="whitespace-nowrap text-4xl font-bold tracking-tight sm:text-5xl">ArPrompter</h1>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-800 sm:text-2xl">Script Reader Tool</h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-zinc-600 sm:text-base sm:leading-7">
          Easy to read, easy to use. Paste your script below and start reading at your own pace.
        </p>

        <label htmlFor="script" className="sr-only">Your script</label>
        <textarea
          id="script"
          value={cur.text}
          onChange={(event) => updateText(event.target.value)}
          placeholder="Type or paste your script here..."
          style={{ backgroundColor: s.bg, color: s.fg, fontFamily: s.font }}
          className="mt-8 h-[38vh] min-h-64 w-full resize-y rounded-[1.75rem] border-2 border-blue-500 px-6 py-5 text-left text-base leading-relaxed shadow-xl placeholder:text-current placeholder:opacity-50 focus:outline-none focus:ring-4 focus:ring-blue-500/15 sm:h-72 sm:px-8 sm:py-6"
        />

        <button
          type="button"
          onClick={() => setReading(true)}
          onPointerEnter={preloadPrompter}
          onFocus={preloadPrompter}
          disabled={!canStart}
          className="mx-auto mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
          <Play size={18} fill="currentColor" />
          Start prompter
        </button>
        <p className="mt-4 text-xs text-zinc-500">Your script is saved automatically on this device.</p>
      </section>
    </main>
  )
}
