import { useState } from 'react'

const CATEGORY_COLORS = {
  AI: { bg: 'rgba(124, 58, 237, 0.1)', text: 'var(--primary-color)' },
  ML: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
  Programming: { bg: 'rgba(29, 78, 216, 0.1)', text: '#1d4ed8' },
  Cloud: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
  'Data Engineering': { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
  Science: { bg: 'rgba(6, 95, 70, 0.1)', text: '#065f46' },
  History: { bg: 'rgba(146, 64, 14, 0.1)', text: '#92400e' },
  Health: { bg: 'rgba(157, 23, 77, 0.1)', text: '#9d174d' },
  Technology: { bg: 'rgba(3, 105, 161, 0.1)', text: '#0369a1' },
}

// Helper component for weight breakdown bars
function ScoreBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-primary)', borderRadius: 999, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(value * 100, 100)}%`,
            background: color,
            borderRadius: 999,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}

// Helper to highlight matching query terms
function highlightText(text, query) {
  if (!query || !query.trim() || !text) return text
  const words = query.split(/\s+/).filter(Boolean)
  if (words.length === 0) return text

  const escapedWords = words.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
  const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi')

  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        style={{
          background: 'rgba(124, 58, 237, 0.18)',
          color: 'var(--text-primary)',
          borderRadius: 2,
          padding: '0 2px',
          fontWeight: 600,
        }}
      >
        {part}
      </mark>
    ) : part
  )
}

export default function ResultCard({ result, rank, query, weights = { semantic: 0.50, keyword: 0.20, popularity: 0.10, recency: 0.10, category_boost: 0.10 } }) {
  const [expanded, setExpanded] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  
  const catColor = CATEGORY_COLORS[result.category] || { bg: 'var(--bg-primary)', text: 'var(--text-secondary)' }
  const displayDate = result.date ? new Date(result.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''

  // Format URL path for search engine display
  const getPolishedUrl = (url, category) => {
    if (!url) return 'Knowledge Base'
    if (url.includes('example.com')) {
      let label = 'Knowledge Base'
      const cat = (category || '').toUpperCase()
      if (cat === 'AI' || cat === 'ML') {
        label = 'AI Library'
      } else if (cat === 'PROGRAMMING' || cat === 'CLOUD' || cat === 'DATA ENGINEERING') {
        label = 'Technical Docs'
      } else if (cat === 'SCIENCE') {
        label = 'Research Collection'
      }
      
      const pathPart = url.split('example.com')[1] || ''
      const segments = pathPart.split('/').filter(Boolean)
      
      // Look for a matched content type in URL path segments
      const contentTypes = ['tutorial', 'documentation', 'research', 'blog', 'guide', 'case-study', 'best-practices'];
      let matchedType = null;
      for (const seg of segments) {
        if (contentTypes.includes(seg.toLowerCase())) {
          matchedType = seg;
          break;
        }
      }
      
      if (matchedType) {
        label = matchedType.split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }

      if (segments.length > 0) {
        const cleanSegments = segments
          .filter(s => s.toLowerCase() !== matchedType?.toLowerCase())
          .map(s => {
            return s.split('-')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
          })
        if (cleanSegments[0]?.toLowerCase() === 'ai' && label === 'AI Library') {
          cleanSegments.shift()
        }
        return [label, ...cleanSegments].join(' › ')
      }
      return label
    }
    return url.replace('https://', '').replace('http://', '').split('/').join(' › ')
  }

  const displayUrl = getPolishedUrl(result.url, result.category)

  return (
    <div style={styles.card}>
      {/* URL display above title (Real search engine style) */}
      <div style={styles.urlRow}>
        <span style={styles.urlText}>{displayUrl}</span>
        <span style={{ ...styles.categoryBadge, background: catColor.bg, color: catColor.text }}>
          {result.category}
        </span>
        {displayDate && <span style={styles.dateText}>{displayDate}</span>}
      </div>

      {/* Main Title Link */}
      <a href={result.url || '#'} target="_blank" rel="noreferrer" style={styles.title}>
        {highlightText(result.title, query)}
      </a>

      {/* Snippet text */}
      <p style={styles.snippet}>
        {highlightText(result.content?.slice(0, expanded ? undefined : 150), query)}
        {!expanded && result.content?.length > 150 && (
          <button onClick={() => setExpanded(true)} style={styles.moreBtn}>... read more</button>
        )}
      </p>

      {/* Modern minimal toggle for search quality metrics */}
      <div style={styles.footerRow}>
        <button onClick={() => setShowDetails(!showDetails)} style={styles.detailsBtn}>
          <span>Search metrics</span>
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            style={{ 
              transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s' 
            }}
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        <span style={styles.scoreText}>
          Score: <strong style={{ color: 'var(--primary-color)' }}>{(result.final_score * 100).toFixed(1)}</strong>
        </span>
      </div>

      {/* Expandable details panel */}
      {showDetails && (
        <div style={styles.detailsPanel}>
          <div style={styles.scoresGrid}>
            <ScoreBar label="Semantic Relevance" value={result.semantic_score} color="var(--primary-color)" />
            <ScoreBar label="Keyword Match (BM25)" value={result.keyword_score || 0} color="#06b6d4" />
            <ScoreBar label="Popularity Weight" value={result.popularity_score} color="#f59e0b" />
            <ScoreBar label="Freshness Weight" value={result.recency_score} color="#10b981" />
            <ScoreBar label="Category Intent Boost" value={result.category_boost_score || 0} color="#ec4899" />
          </div>
          
          <div style={styles.formulaBox}>
            <code>
              Rank Formula: ({weights.semantic.toFixed(2)} × {result.semantic_score.toFixed(3)}) + ({weights.keyword.toFixed(2)} × {(result.keyword_score || 0).toFixed(3)}) + ({weights.popularity.toFixed(2)} × {result.popularity_score.toFixed(3)}) + ({weights.recency.toFixed(2)} × {result.recency_score.toFixed(3)}) + ({weights.category_boost.toFixed(2)} × {(result.category_boost_score || 0).toFixed(3)}) = {result.final_score.toFixed(4)}
            </code>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  card: {
    background: 'transparent',
    padding: '16px 0',
    marginBottom: 8,
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  urlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: 'var(--text-secondary)',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  urlText: {
    color: 'var(--text-secondary)',
    maxWidth: 240,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  dateText: {
    color: 'var(--text-secondary)',
  },
  title: {
    fontSize: 19,
    fontWeight: 500,
    color: 'var(--link-color)',
    textDecoration: 'none',
    marginBottom: 4,
    lineHeight: 1.3,
    display: 'inline-block',
  },
  snippet: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    lineHeight: 1.57,
    margin: '0 0 8px 0',
  },
  moreBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary-color)',
    cursor: 'pointer',
    fontSize: 13.5,
    padding: 0,
    marginLeft: 4,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    fontSize: 12,
  },
  detailsBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '2px 0',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    outline: 'none',
  },
  scoreText: {
    color: 'var(--text-secondary)',
  },
  detailsPanel: {
    width: '100%',
    marginTop: 8,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 10,
    padding: 12,
    boxSizing: 'border-box',
  },
  scoresGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 8,
  },
  formulaBox: {
    background: 'var(--bg-primary)',
    borderRadius: 6,
    padding: 8,
    fontSize: 11,
    color: 'var(--text-secondary)',
    overflowX: 'auto',
    fontFamily: 'JetBrains Mono, monospace',
    border: '1px solid var(--border-color)',
  },
}
