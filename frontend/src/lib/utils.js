export const SOURCE_META = {
  youtube: {
    label:    'YouTube',
    icon:     '▶',
    color:    '#DC2626',
    lightBg:  '#FEF2F2',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
  },
  openai: {
    label:    'OpenAI',
    icon:     '⚡',
    color:    '#059669',
    lightBg:  '#ECFDF5',
    gradient: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
  },
  anthropic: {
    label:    'Anthropic',
    icon:     '🧠',
    color:    '#7C3AED',
    lightBg:  '#F5F3FF',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
  },
  digests: {
    label:    'Digest',
    icon:     '📋',
    color:    '#6D28D9',
    lightBg:  '#F5F3FF',
    gradient: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
  },
  default: {
    label:    'News',
    icon:     '📰',
    color:    '#374151',
    lightBg:  '#F9FAFB',
    gradient: 'linear-gradient(135deg, #6B7280 0%, #374151 100%)',
  },
}

export const fmtDate = iso => {
  try {
    const d   = new Date(iso)
    const now = new Date()
    const diffH = (now - d) / 3_600_000
    if (diffH < 1)   return `${Math.floor(diffH * 60)}m ago`
    if (diffH < 24)  return `${Math.floor(diffH)}h ago`
    if (diffH < 48)  return `Yesterday · ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

export const isToday = iso => {
  try {
    const d   = new Date(iso)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  } catch { return false }
}
