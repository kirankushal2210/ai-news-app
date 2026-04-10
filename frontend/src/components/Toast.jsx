import { motion } from 'framer-motion'

const STYLES = {
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  error:   { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-800',     dot: 'bg-red-500' },
  info:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-800',    dot: 'bg-blue-500' },
}

export default function Toast({ msg, type = 'success' }) {
  const s = STYLES[type] ?? STYLES.info
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium pointer-events-none max-w-sm text-center ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
      {msg}
    </motion.div>
  )
}
