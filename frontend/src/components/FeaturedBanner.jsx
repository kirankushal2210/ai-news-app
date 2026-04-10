import { SOURCE_META, fmtDate } from '../lib/utils.js'

export default function FeaturedBanner({ article }) {
  const src = SOURCE_META[article.source] ?? SOURCE_META.default

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 mb-10">
      <div className="grid md:grid-cols-2 gap-0">
        {/* Visual panel */}
        <div
          className="min-h-[220px] md:min-h-0 flex items-end p-8 relative"
          style={{ background: src.gradient }}
        >
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white mb-3 backdrop-blur-sm">
              {src.icon} {src.label}
            </span>
            <div className="text-4xl font-black text-white/10 select-none leading-none tracking-tight hidden md:block">
              TOP<br/>STORY
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col justify-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: src.lightBg, color: src.color }}
            >
              {src.icon} {src.label}
            </span>
            <span className="text-xs text-gray-400">{fmtDate(article.published_at)}</span>
          </div>

          <h2 className="text-2xl font-bold leading-snug text-gray-900 hover:text-gray-600 transition-colors">
            <a href={article.url} target="_blank" rel="noreferrer">
              {article.title}
            </a>
          </h2>

          {article.description && (
            <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">
              {article.description}
            </p>
          )}

          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-gray-600 transition-colors mt-1"
          >
            Read full article
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
