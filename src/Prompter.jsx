import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, X, Maximize, Minimize, FlipHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
const fmt = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const FONTS = [
  ['Sans serif', 'Inter, system-ui, sans-serif'],
  ['Serif', 'Georgia, serif'],
  ['Monospace', 'ui-monospace, Menlo, monospace'],
  ['Rounded', 'ui-rounded, "Trebuchet MS", sans-serif'],
]

// Memoized so the (possibly huge) script is not re-rendered every animation frame.
const Body = memo(function Body({ text, s, contentRef }) {
  const paragraphs = useMemo(
    () => text.split(/\r?\n[ \t]*\r?\n/).filter((paragraph) => paragraph.trim()),
    [text],
  )
  return (
    <div ref={contentRef} style={{ transform: s.mirror ? 'scaleX(-1)' : 'none', fontFamily: s.font, fontSize: s.size, lineHeight: s.lh, letterSpacing: `${s.ls}px`, textAlign: s.align, color: s.fg }}>
      <div style={{ height: '50%' }} aria-hidden />
      <div style={{ maxWidth: `${s.width}%`, margin: '0 auto', padding: `0 ${s.margin}%` }}>
        {paragraphs.length
          ? paragraphs.map((paragraph, i) => <p key={i} style={{ margin: `0 0 ${s.gap}em`, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{paragraph}</p>)
          : <p style={{ opacity: .5 }}>Your script will appear here. Type or paste in the editor.</p>}
      </div>
      <div style={{ height: '50%' }} aria-hidden />
    </div>
  )
})

export default function Prompter({ text, s, set, full, onExit, onOpenFull }) {
  const box = useRef(), content = useRef(), root = useRef()
  const maxScrollRef = useRef(0)
  const r = useRef({ pos: 0, play: false, last: 0, lastUiUpdate: 0, el: 0, raf: 0 })
  const sr = useRef(s); sr.current = s
  const [ui, setUi] = useState({ p: 0, play: false, el: 0, rem: 0 })
  const [hide, setHide] = useState(false)
  const [isFs, setIsFs] = useState(false)

  const pps = () => sr.current.speed * sr.current.size / 12
  const measureMaxScroll = () => {
    const element = box.current
    maxScrollRef.current = element ? Math.max(0, element.scrollHeight - element.clientHeight) : 0
    return maxScrollRef.current
  }
  const sync = useCallback((play) => {
    const m = maxScrollRef.current, x = r.current
    setUi((u) => ({ ...u, play, p: m ? x.pos / m : 0, el: x.el, rem: (m - x.pos) / pps() }))
  }, [])

  const tick = useCallback((t) => {
    const x = r.current; if (!x.play) return
    const dt = Math.min(0.1, (t - x.last) / 1000); x.last = t
    const m = maxScrollRef.current
    x.pos = Math.min(m, x.pos + dt * pps()); x.el += dt
    box.current.scrollTop = x.pos
    if (x.pos >= m) { x.play = false; sync(false); return }
    if (t - x.lastUiUpdate >= 100) { x.lastUiUpdate = t; sync(true) }
    x.raf = requestAnimationFrame(tick)
  }, [sync])

  const pause = useCallback(() => { const x = r.current; x.play = false; cancelAnimationFrame(x.raf); sync(false) }, [sync])
  const begin = useCallback(() => {
    const x = r.current
    if (x.play) return
    x.play = true
    x.last = performance.now()
    x.lastUiUpdate = x.last
    x.raf = requestAnimationFrame(tick)
    setUi((u) => ({ ...u, play: true }))
  }, [tick])
  const toggle = useCallback(() => {
    const x = r.current
    if (x.play) return pause()
    const max = measureMaxScroll()
    if (x.pos >= max - 1 && x.pos > 0) { x.pos = 0; x.el = 0; box.current.scrollTop = 0 }
    begin()
  }, [pause, begin])
  const reset = useCallback(() => { pause(); const x = r.current; x.pos = 0; x.el = 0; if (box.current) box.current.scrollTop = 0; sync(false) }, [pause, sync])
  const seek = (f) => { const x = r.current; x.pos = f * measureMaxScroll(); box.current.scrollTop = x.pos; sync(x.play) }
  const speed = (d) => set({ speed: clamp(Math.round(sr.current.speed + d), 1, 80) })
  const toggleFs = async () => { try { document.fullscreenElement ? await document.exitFullscreen() : await root.current.requestFullscreen() } catch { alert('Fullscreen is not supported or was blocked by this browser.') } }

  useEffect(() => { const f = () => setIsFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f) }, [])
  useEffect(() => () => { cancelAnimationFrame(r.current.raf) }, [])
  useEffect(() => {
    const elements = [box.current, content.current].filter(Boolean)
    if (!elements.length) return

    const refreshMeasurements = () => {
      const x = r.current
      x.pos = clamp(x.pos, 0, measureMaxScroll())
      if (box.current) box.current.scrollTop = x.pos
      sync(x.play)
    }
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', refreshMeasurements)
      refreshMeasurements()
      return () => window.removeEventListener('resize', refreshMeasurements)
    }

    const observer = new ResizeObserver(refreshMeasurements)
    elements.forEach((element) => observer.observe(element))
    refreshMeasurements()
    return () => observer.disconnect()
  }, [sync])
  useLayoutEffect(() => {
    const x = r.current
    x.pos = clamp(x.pos, 0, measureMaxScroll())
    if (box.current) box.current.scrollTop = x.pos
    sync(x.play)
  }, [text, s.size, s.lh, s.width, s.margin, s.gap, s.font, s.ls, sync])
  useEffect(() => { if (full) { const p = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = p } } }, [full])

  const btn = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-white/10 px-2 text-white transition hover:bg-white/20'
  const tool = 'flex shrink-0 flex-col items-center gap-1 text-[10px] leading-none text-white/80'
  const controls = (
    <div className={`shrink-0 border-b border-white/15 bg-black px-2 py-2 text-white sm:px-4 ${full ? 'pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]' : ''}`}>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <div className="flex shrink-0 items-center gap-1.5">
          <button className={`${btn} !bg-violet-600 hover:!bg-violet-500`} onClick={toggle} aria-label={ui.play ? 'Pause' : 'Play'}>{ui.play ? <Pause size={18} /> : <Play size={18} />}</button>
          <button className={btn} onClick={reset} aria-label="Reset to start"><RotateCcw size={18} /></button>
        </div>
        <label className={tool}>Background
          <input type="color" value={s.bg} onChange={(e) => set({ bg: e.target.value })} aria-label="Change background color" className="h-8 w-10 cursor-pointer rounded border border-white/25 bg-transparent p-0.5" />
        </label>
        <label className={tool}>Text color
          <input type="color" value={s.fg} onChange={(e) => set({ fg: e.target.value })} aria-label="Change text color" className="h-8 w-10 cursor-pointer rounded border border-white/25 bg-transparent p-0.5" />
        </label>
        <label className={`${tool} items-start`}>Font family
          <select value={s.font} onChange={(e) => set({ font: e.target.value })} aria-label="Change font family" className="h-8 max-w-28 rounded border border-white/20 bg-zinc-900 px-2 text-xs text-white">
            {FONTS.map(([name, value]) => <option key={name} value={value}>{name}</option>)}
          </select>
        </label>
        <label className={`${tool} min-w-24 flex-1`}>Text size: {s.size}px
          <input type="range" min="20" max="140" value={s.size} onChange={(e) => set({ size: +e.target.value })} aria-label="Text size" className="w-full accent-violet-500" />
        </label>
        <label className={`${tool} min-w-24 flex-1`}>Margin: {s.margin}%
          <input type="range" min="0" max="30" value={s.margin} onChange={(e) => set({ margin: +e.target.value })} aria-label="Text side margin" className="w-full accent-violet-500" />
        </label>
        <label className={`${tool} min-w-24 flex-1`}>Scroll speed: {s.speed}
          <input type="range" min="1" max="80" value={s.speed} onChange={(e) => set({ speed: +e.target.value })} aria-label="Scroll speed" className="w-full accent-violet-500" />
        </label>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button className={`${btn} ${s.mirror ? '!bg-violet-600' : ''}`} onClick={() => set({ mirror: !s.mirror })} aria-pressed={s.mirror} aria-label="Mirror mode"><FlipHorizontal size={18} /></button>
          <button className={btn} onClick={toggleFs} aria-label="Toggle fullscreen">{isFs ? <Minimize size={18} /> : <Maximize size={18} />}</button>
          {full ? <button className={btn} onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); onExit() }} aria-label="Exit reading mode"><X size={18} /></button> : <button className={`${btn} text-xs`} onClick={onOpenFull}>Reading mode</button>}
          {full && <button className={btn} onClick={() => setHide(true)} aria-label="Hide controls"><ChevronDown size={18} /></button>}
        </div>
      </div>
      {ui.play && (
        <div className="mt-2 flex items-center gap-2 sm:gap-3">
          <input type="range" min="0" max="1000" value={Math.round(ui.p * 1000)} onChange={(e) => seek(e.target.value / 1000)} aria-label="Scrub through script" className="flex-1 accent-violet-500" />
          <span className="tabular-nums text-xs whitespace-nowrap">{Math.round(ui.p * 100)}% · {fmt(ui.el)} / -{fmt(ui.rem)}</span>
        </div>
      )}
    </div>
  )

  return (
    <div ref={root} style={{ background: s.bg }} className={full ? 'fixed inset-0 z-50 flex h-[100dvh] flex-col' : 'flex flex-col rounded-2xl overflow-hidden border border-zinc-300 dark:border-zinc-700 outline-none'}>
      {!(full && hide) && controls}
      <div className={`relative ${full ? 'flex-1 min-h-0' : 'h-[min(60vh,420px)] min-h-[240px] sm:h-[420px]'}`}>
        <div ref={box} className={`prompter-scrollbar absolute inset-0 overflow-y-auto overscroll-contain ${full ? 'pt-[env(safe-area-inset-top)]' : ''}`} style={{ touchAction: 'pan-y' }}
          onScroll={() => { if (box.current && !r.current.play) { r.current.pos = box.current.scrollTop; sync(false) } }}>
          <Body text={text} s={s} contentRef={content} />
        </div>
        {s.dim && <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(${s.bg} 0%, transparent 35%, transparent 65%, ${s.bg} 100%)` }} />}
        {s.guide && ui.play && <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-violet-500/70"><span className="absolute left-0 -top-2 border-y-[9px] border-y-transparent border-l-[14px] border-l-violet-500" /><span className="absolute right-0 -top-2 border-y-[9px] border-y-transparent border-r-[14px] border-r-violet-500" /></div>}
        {full && hide && <button className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-zinc-900/80 text-white flex items-center justify-center" onClick={() => setHide(false)} aria-label="Show controls"><ChevronUp size={18} /></button>}
      </div>
    </div>
  )
}
