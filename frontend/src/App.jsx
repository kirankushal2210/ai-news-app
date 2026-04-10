import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import TopBar from './components/TopBar.jsx'
import FeaturedBanner from './components/FeaturedBanner.jsx'
import NewsFeed from './components/NewsFeed.jsx'
import DigestsSection from './components/DigestsSection.jsx'
import Sidebar from './components/Sidebar.jsx'
import PipelineOverlay from './components/PipelineOverlay.jsx'
import Toast from './components/Toast.jsx'
import { getStats, getNews, getDigests, runPipeline, getPipelineStatus } from './lib/api.js'
import { useSSE } from './hooks/useSSE.js'

export default function App() {
  const [stats, setStats]       = useState({ youtube: 0, openai: 0, anthropic: 0, digests: 0 })
  const [articles, setArticles] = useState([])
  const [digests, setDigests]   = useState([])
  const [pipeline, setPipeline] = useState({ running: false, step: 0, step_label: '' })
  const [activeSource, setActiveSource] = useState('all')
  const [searchQuery, setSearchQuery]   = useState('')
  const [toast, setToast]       = useState(null)
  const [nextRunAt, setNextRunAt] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const seenIds    = useRef(new Set())
  const toastTimer = useRef(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4500)
  }, [])

  useEffect(() => {
    Promise.all([getStats(), getNews({ limit: 200 }), getDigests(20), getPipelineStatus()])
      .then(([s, n, d, p]) => {
        setStats(s)
        // Sort by published_at descending — freshest always first
        const items = (n.items || []).sort(
          (a, b) => new Date(b.published_at) - new Date(a.published_at)
        )
        setArticles(items)
        items.forEach(a => seenIds.current.add(a.id))
        setDigests(d.items || [])
        setPipeline(p)
        setLastFetched(new Date())
        if (s.next_run_at) setNextRunAt(new Date(s.next_run_at))
      })
      .catch(console.error)
  }, [])

  useSSE({
    stats: data => {
      setStats(data)
      if (data.next_run_at) setNextRunAt(new Date(data.next_run_at))
    },
    new_article: data => {
      if (!seenIds.current.has(data.id)) {
        seenIds.current.add(data.id)
        // Insert in correct date position
        setArticles(prev => {
          const updated = [{ ...data, _new: true }, ...prev].sort(
            (a, b) => new Date(b.published_at) - new Date(a.published_at)
          )
          return updated
        })
        showToast(`New: ${data.title.slice(0, 55)}…`, 'info')
      }
    },
    pipeline_status: data => {
      setPipeline(data)
      if (!data.running && data.result === 'success') {
        setLastFetched(new Date())
        // Reload articles from API to get fresh data
        getNews({ limit: 200 }).then(n => {
          const items = (n.items || []).sort(
            (a, b) => new Date(b.published_at) - new Date(a.published_at)
          )
          // Merge — keep _new flag for newly injected ones, add any we missed
          setArticles(prev => {
            const prevIds = new Set(prev.map(a => a.id))
            const newOnes = items.filter(a => !prevIds.has(a.id))
            return [...newOnes.map(a => ({ ...a, _new: true })), ...prev].sort(
              (a, b) => new Date(b.published_at) - new Date(a.published_at)
            )
          })
          n.items?.forEach(a => seenIds.current.add(a.id))
        })
        getDigests(20).then(d => setDigests(d.items || []))
        getStats().then(setStats)
        showToast('Feed updated — showing latest articles', 'success')
      }
      if (!data.running && data.error) showToast('Update failed: ' + data.error, 'error')
    },
  })

  const handleUpdate = async () => {
    try {
      const res = await runPipeline()
      if (res.status === 'already_running') { showToast('Already updating…', 'info'); return }
      setPipeline(p => ({ ...p, running: true, step: 1, step_label: 'Starting…' }))
    } catch { showToast('Could not connect to server', 'error') }
  }

  const filtered = articles.filter(a => {
    const matchSrc = activeSource === 'all' || a.source === activeSource
    const q = searchQuery.toLowerCase().trim()
    const matchQ = !q || a.title.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q)
    return matchSrc && matchQ
  })

  const todayCount = articles.filter(a => {
    const d = new Date(a.published_at)
    return d.toDateString() === new Date().toDateString()
  }).length

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <TopBar
        stats={stats}
        onUpdate={handleUpdate}
        pipeline={pipeline}
        nextRunAt={nextRunAt}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeSource={activeSource}
        setActiveSource={setActiveSource}
        lastFetched={lastFetched}
        todayCount={todayCount}
      />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Featured banner */}
        {filtered[0] && (
          <FeaturedBanner article={filtered[0]} />
        )}

        {/* Digests */}
        {digests.length > 0 && (
          <DigestsSection digests={digests} />
        )}

        {/* Main layout */}
        <div className="flex gap-8 mt-10">
          <div className="flex-1 min-w-0">
            <NewsFeed
              articles={filtered}
              searchQuery={searchQuery}
            />
          </div>
          <div className="w-72 flex-shrink-0 hidden lg:block">
            <Sidebar
              articles={articles}
              stats={stats}
              nextRunAt={nextRunAt}
              onUpdate={handleUpdate}
              pipeline={pipeline}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 mt-16 py-8">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <span className="font-semibold text-gray-700">AI News Aggregator</span>
          <span>YouTube · OpenAI · Anthropic · Auto-refreshes every 30 min</span>
        </div>
      </footer>

      <AnimatePresence>
        {pipeline.running && <PipelineOverlay key="overlay" pipeline={pipeline} />}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <Toast key="toast" msg={toast.msg} type={toast.type} />}
      </AnimatePresence>
    </div>
  )
}
