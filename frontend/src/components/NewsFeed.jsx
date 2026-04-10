import { motion, AnimatePresence } from 'framer-motion'
import { SOURCE_META, fmtDate } from '../lib/utils.js'

function NewsCard({ article, isNew, rank }) {
  const src = SOURCE_META[article.source] ?? SOURCE_META.default
  const desc = article.description || ''

  return (
    <motion.article
      layout
      initial={isNew ? { opacity: 0, y: -8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`group bg-white rounded-xl border transition-all duration-200 hover:shadow-md hover:border-gray-300 overflow-hidden ${
        isNew ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-gray-200'
      }`}
    >
      {/* Color accent bar */}
      <div className="h-1" style={{ background: src.gradient }} />

      <div className="p-5 flex flex-col gap-3">
        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: src.lightBg, color: src.color }}
            >
              {src.icon} {src.label}
            </span>
            {isNew && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                NEW
              </span>
            )}
          </div>
          <time className="text-xs text-gray-400 flex-shrink-0">{fmtDate(article.published_at)}</time>
        </div>

        {/* Headline */}
        <h3 className="text-base font-semibold leading-snug text-gray-900 group-hover:text-gray-600 transition-colors">
          <a href={article.url} target="_blank" rel="noreferrer">
            {article.title}
          </a>
        </h3>

        {/* Excerpt */}
        {desc && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
            {desc}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <span className="text-xs text-gray-400">#{rank}</span>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-1"
          >
            Read more
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </a>
        </div>
      </div>
    </motion.article>
  )
}

export default function NewsFeed({ articles, searchQuery, activeSource, setActiveSource }) {
  // Skip first article (shown in FeaturedBanner)
  const rest = articles.slice(1)

  if (!rest.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <div className="text-4xl mb-4">📰</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No articles found</h3>
        <p className="text-sm text-gray-400">
          {searchQuery
            ? `No results matching "${searchQuery}"`
            : 'Click Refresh Feed to fetch the latest AI news'}
        </p>
      </div>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-900">
          Latest News
          <span className="ml-2 text-sm font-normal text-gray-400">({articles.length} articles)</span>
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {rest.map((article, idx) => (
            <NewsCard
              key={article.id}
              article={article}
              isNew={!!article._new}
              rank={idx + 2}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}
