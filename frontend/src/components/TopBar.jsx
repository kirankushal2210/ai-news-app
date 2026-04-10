import { useState, useEffect } from 'react'

const SOURCES = [
  { id: 'all',       label: 'All' },
  { id: 'youtube',   label: 'YouTube' },
  { id: 'openai',    label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
]

export default function TopBar({ stats, onUpdate, pipeline, nextRunAt, searchQuery, setSearchQuery, activeSource, setActiveSource, lastFetched, todayCount }) {
  const [scrolled, setScrolled] = useState(false)
  const [countdown, setCountdown] = useState('')
  const total = (stats.youtube ?? 0) + (stats.openai ?? 0) + (stats.anthropic ?? 0)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => {
    if (!nextRunAt) return
    const tick = () => {
      const diff = nextRunAt - Date.now()
      if (diff <= 0) { setCountdown(''); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${m}m ${String(s).padStart(2, '0')}s`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [nextRunAt])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-sm' : ''}`}>
      {/* Top strip */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9 text-xs text-gray-400">
            <span>{today}</span>
            <div className="flex items-center gap-4">
              {todayCount > 0 ? (
                <span className="hidden sm:flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {todayCount} new article{todayCount !== 1 ? 's' : ''} today
                </span>
              ) : (
                <span className="hidden sm:block text-gray-500">
                  {lastFetched
                    ? `Checked ${lastFetched.toLocaleTimeString()} — no new articles today yet`
                    : 'Fetching latest…'}
                </span>
              )}
              {countdown && !pipeline.running && (
                <span className="hidden md:block text-gray-500">
                  Next check in {countdown}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${pipeline.running ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className={pipeline.running ? 'text-amber-400' : 'text-emerald-400'}>
                  {pipeline.running ? 'Updating…' : 'Live'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b border-gray-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-6">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 flex-shrink-0">
              <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
                <span className="text-white font-black text-xs tracking-tight">AI</span>
              </div>
              <div>
                <div className="font-bold text-lg leading-none text-gray-900 tracking-tight">AI News</div>
                <div className="text-[10px] text-gray-400 leading-none mt-0.5 tracking-wide uppercase">Intelligence Aggregator</div>
              </div>
            </a>

            {/* Search */}
            <div className="flex-1 max-w-sm hidden sm:block">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  placeholder="Search articles…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Update button */}
            <button
              onClick={onUpdate}
              disabled={pipeline.running}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className={`w-4 h-4 ${pipeline.running ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {pipeline.running ? 'Updating…' : 'Refresh Feed'}
            </button>
          </div>
        </div>
      </div>

      {/* Source nav */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-0 -mb-px">
            {SOURCES.map(s => {
              const count = s.id !== 'all' ? stats[s.id] ?? 0 : null
              const active = activeSource === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSource(s.id)}
                  className={`relative px-4 py-3 text-sm font-medium transition-colors duration-150 border-b-2 ${
                    active
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {s.label}
                  {count !== null && (
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}
