import { motion } from 'framer-motion'

const STEPS = [
  '',
  'Scraping YouTube, OpenAI & Anthropic…',
  'Processing Anthropic content…',
  'Fetching YouTube transcripts…',
  'Generating AI digests…',
  'Sending digest email…',
]

export default function PipelineOverlay({ pipeline }) {
  const step = pipeline.step || 1
  const pct  = Math.round((step / 5) * 100)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.96, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <h3 className="font-bold text-gray-800">Refreshing Feed</h3>
          <span className="ml-auto text-sm font-mono text-gray-400">{pct}%</span>
        </div>

        {/* Progress */}
        <div className="px-6 pt-5">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gray-900"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-3">
          {[1, 2, 3, 4, 5].map(s => {
            const done   = s < step
            const active = s === step
            return (
              <div key={s} className={`flex items-center gap-3 text-sm transition-all duration-200 ${done ? 'text-gray-400' : active ? 'text-gray-800 font-medium' : 'text-gray-300'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                  done ? 'bg-emerald-100 text-emerald-600' : active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {done ? '✓' : s}
                </div>
                {STEPS[s]}
                {active && <span className="text-gray-300 animate-pulse">…</span>}
              </div>
            )
          })}
        </div>

        <div className="px-6 pb-5 text-xs text-gray-400 text-center">
          New articles will appear automatically — no page reload needed
        </div>
      </motion.div>
    </motion.div>
  )
}
