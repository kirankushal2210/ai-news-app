const BASE = ''

export const getStats  = () => fetch(`${BASE}/api/stats`).then(r => r.json())

export const getNews = (params = {}) => {
  const q = new URLSearchParams(params)
  return fetch(`${BASE}/api/news?${q}`).then(r => r.json())
}

export const getDigests = (limit = 8) =>
  fetch(`${BASE}/api/digests?limit=${limit}`).then(r => r.json())

export const runPipeline = () =>
  fetch(`${BASE}/api/pipeline/run`, { method: 'POST' }).then(r => r.json())

export const getPipelineStatus = () =>
  fetch(`${BASE}/api/pipeline/status`).then(r => r.json())
