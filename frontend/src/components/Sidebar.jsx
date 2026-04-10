import { useState, useEffect } from 'react'
import { SOURCE_META, fmtDate } from '../lib/utils.js'

export default function Sidebar({ articles, stats, nextRunAt }) {
  const [countdown, setCountdown] = useState('')

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

  return (
    <aside className="sticky top-[120px] space-y-6">

      {/* Status card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Source Activity</h3>
        </div>
        <div className="p-4 space-y-1">
          {[
            { key: 'youtube',   label: 'YouTube Videos' },
            { key: 'openai',    label: 'OpenAI Articles' },
            { key: 'anthropic', label: 'Anthropic Posts' },
            { key: 'digests',   label: 'AI Summaries' },
          ].map(({ key, label }) => {
            const src = SOURCE_META[key] ?? SOURCE_META.default
            const count = stats[key] ?? 0
            return (
              <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{src.icon}</span>
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
            )
          })}
        </div>
        {countdown && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <div className="text-xs text-gray-400">Next auto-refresh in</div>
            <div className="text-sm font-bold text-gray-700 tabular-nums">{countdown}</div>
          </div>
        )}
      </div>

      {/* Recent articles list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Recent Articles</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {articles.slice(0, 8).map((a, i) => {
            const src = SOURCE_META[a.source] ?? SOURCE_META.default
            return (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors block"
              >
                <span className="flex-shrink-0 w-5 text-xs font-bold text-gray-300 pt-px text-right">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 leading-snug line-clamp-2 hover:text-gray-900 transition-colors">
                    {a.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-bold" style={{ color: src.color }}>{src.icon} {src.label}</span>
                    <span className="text-[10px] text-gray-300">{fmtDate(a.published_at)}</span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>

      {/* Data sources */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Data Sources</h3>
        <ul className="space-y-2.5">
          {[
            { icon: '▶', label: 'YouTube', desc: 'AI channel videos' },
            { icon: '⚡', label: 'OpenAI Blog', desc: 'News & announcements' },
            { icon: '🧠', label: 'Anthropic', desc: 'Research & engineering' },
          ].map(s => (
            <li key={s.label} className="flex items-center gap-2.5 text-sm">
              <span className="text-base">{s.icon}</span>
              <div>
                <span className="font-medium text-gray-700">{s.label}</span>
                <span className="text-gray-400 ml-1.5 text-xs">{s.desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
