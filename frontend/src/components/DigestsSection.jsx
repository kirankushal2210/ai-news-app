import { SOURCE_META, fmtDate } from '../lib/utils.js'

export default function DigestsSection({ digests }) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">AI Digest</h2>
          <span className="text-xs px-2.5 py-1 bg-violet-50 text-violet-700 font-semibold rounded-full border border-violet-100">
            {digests.length} summaries
          </span>
        </div>
        <p className="text-sm text-gray-400 hidden sm:block">AI-generated summaries of top stories</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {digests.map(d => {
          const src = SOURCE_META[d.article_type] ?? SOURCE_META.default
          return (
            <a
              key={d.id}
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="group bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:border-gray-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: src.lightBg, color: src.color }}
                >
                  {src.icon} {src.label || d.article_type}
                </span>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </div>

              <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-gray-600 transition-colors">
                {d.title}
              </h3>

              {d.summary && (
                <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 flex-1">
                  {d.summary}
                </p>
              )}

              {d.created_at && (
                <time className="text-xs text-gray-300">{fmtDate(d.created_at)}</time>
              )}
            </a>
          )
        })}
      </div>
    </section>
  )
}
