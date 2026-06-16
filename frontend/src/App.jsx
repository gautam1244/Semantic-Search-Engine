import { useState, useEffect, useCallback, useRef } from 'react'
import SearchBar from './components/SearchBar'
import ResultCard from './components/ResultCard'
import Sidebar from './components/Sidebar'
import { CURATED_SUMMARIES, getDynamicSummary, getFollowUpQuestions } from './utils/summaries'

const API = import.meta.env.VITE_API_URL || ''
const CATEGORIES_FALLBACK = ['All', 'AI', 'Programming', 'Science', 'History', 'Health', 'Technology']

// Latency Sparkline Custom SVG Component
function LatencySparkline({ data }) {
  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No search latency logs yet.</p>
  }
  const maxVal = Math.max(...data.map(d => d.latency_ms), 10)
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 80 - (d.latency_ms / maxVal) * 60
    return `${x},${y}`
  }).join(' ')

  return (
    <div style={styles.dashboardCard}>
      <h4 style={styles.chartTitle}>Live Query Latency (Last 15 queries)</h4>
      <div style={{ height: 110, position: 'relative' }}>
        <svg viewBox="0 0 100 80" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Grid lines */}
          <line x1="0" y1="20" x2="100" y2="20" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="80" x2="100" y2="80" stroke="var(--border-color)" strokeWidth="0.5" />

          {/* Area */}
          <polygon
            points={`0,80 ${points} 100,80`}
            fill="rgba(52, 191, 145, 0.12)"
          />
          {/* Path line */}
          <polyline
            fill="none"
            stroke="var(--primary-color)"
            strokeWidth="2"
            points={points}
          />
          {/* Circles */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 80 - (d.latency_ms / maxVal) * 60
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2.5"
                fill="var(--primary-color)"
                stroke="var(--bg-card)"
                strokeWidth="0.8"
              >
                <title>{`Query: "${d.query}"\nLatency: ${d.latency_ms}ms`}</title>
              </circle>
            )
          })}
        </svg>
      </div>
      <div style={styles.chartFooter}>
        <span>Oldest</span>
        <span>Peak: {maxVal.toFixed(1)}ms</span>
        <span>Latest</span>
      </div>
    </div>
  )
}

// Vertical Bar Chart Custom CSS Component
function VolumeChart({ data }) {
  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No search volume logs yet.</p>
  }
  const maxVal = Math.max(...data.map(d => d.count), 5)
  return (
    <div style={styles.dashboardCard}>
      <h4 style={styles.chartTitle}>Search Volume (Last 10 Active Days)</h4>
      <div style={styles.vBarContainer}>
        {data.map((d, i) => {
          const heightPct = (d.count / maxVal) * 100
          return (
            <div key={i} style={styles.vBarColumn}>
              <div style={styles.vBarCount}>{d.count}</div>
              <div style={{ ...styles.vBarFiller, height: `${heightPct}%` }} />
              <div style={styles.vBarLabel}>{d.date.slice(5)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Horizontal Progress Bar Category Breakdown Component
function CategoryBreakdown({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No category log data yet.</p>
  }
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  return (
    <div style={styles.dashboardCard}>
      <h4 style={styles.chartTitle}>Category Filter Usage</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(data).map(([cat, count]) => {
          const pct = (count / total) * 100
          return (
            <div key={cat}>
              <div style={styles.hBarLabelRow}>
                <span style={{ fontWeight: 600 }}>{cat === 'All' ? 'None (All)' : cat}</span>
                <span>{count} ({pct.toFixed(0)}%)</span>
              </div>
              <div style={styles.hBarTrack}>
                <div style={{ ...styles.hBarFill, width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('search') // search | analytics
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [categories, setCategories] = useState(CATEGORIES_FALLBACK)
  const [activeCategory, setActiveCategory] = useState('All')
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [totalFound, setTotalFound] = useState(0)
  const [searchLatency, setSearchLatency] = useState(0.0)

  // LLM Query expansion & admin states
  const [interpretedQuery, setInterpretedQuery] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminPasscode, setAdminPasscode] = useState('')
  const [adminError, setAdminError] = useState('')

  // Sliders for dynamic reranking weights
  const [showTuning, setShowTuning] = useState(false)
  const [wSem, setWSem] = useState(0.50)
  const [wKey, setWKey] = useState(0.20)
  const [wPop, setWPop] = useState(0.10)
  const [wRec, setWRec] = useState(0.10)
  const [wCat, setWCat] = useState(0.10)

  // Analytics tab stats
  const [analyticsStats, setAnalyticsStats] = useState({
    total_queries: 0,
    avg_latency: 0.0,
    categories: {},
    queries_by_day: [],
    latency_history: [],
    total_documents: 0,
  })
  const [trendingTopics, setTrendingTopics] = useState([])

  const [assistantMode, setAssistantMode] = useState('local') // local | gemini
  const [isGeminiAvailable, setIsGeminiAvailable] = useState(false)

  // AI Research Assistant states & refs
  const [summaryState, setSummaryState] = useState('idle') // idle | parsing | generating | completed
  const [summaryData, setSummaryData] = useState(null)
  const [streamedDefinition, setStreamedDefinition] = useState('')
  const [streamedConcepts, setStreamedConcepts] = useState([])
  const [streamedApps, setStreamedApps] = useState([])
  const [streamedRelated, setStreamedRelated] = useState([])

  const defIntervalRef = useRef(null)
  const conceptIntervalRef = useRef(null)
  const appIntervalRef = useRef(null)
  const relatedIntervalRef = useRef(null)
  const summaryTimeoutRef = useRef(null)

  const clearSummaryIntervals = () => {
    if (defIntervalRef.current) clearInterval(defIntervalRef.current)
    if (conceptIntervalRef.current) clearInterval(conceptIntervalRef.current)
    if (appIntervalRef.current) clearInterval(appIntervalRef.current)
    if (relatedIntervalRef.current) clearInterval(relatedIntervalRef.current)
    if (summaryTimeoutRef.current) clearTimeout(summaryTimeoutRef.current)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => clearSummaryIntervals()
  }, [])

  // Theme synchronization
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme')
      localStorage.setItem('theme', 'dark')
    } else {
      document.body.classList.remove('dark-theme')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  // Fetch categories and backend config on mount
  useEffect(() => {
    fetch(`${API}/categories`)
      .then(r => r.json())
      .then(d => setCategories(d.categories || CATEGORIES_FALLBACK))
      .catch(() => { })

    fetch(`${API}/api/config`)
      .then(r => r.json())
      .then(d => setIsGeminiAvailable(!!d.gemini_available))
      .catch(() => { })
  }, [])

  // Fetch analytics stats whenever active tab changes to analytics
  const fetchAnalytics = useCallback(() => {
    fetch(`${API}/analytics-stats`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setAnalyticsStats(data)
        }
      })
      .catch(err => console.error(err))

    fetch(`${API}/trending-topics`)
      .then(r => r.json())
      .then(data => setTrendingTopics(data.topics || []))
      .catch(err => console.error(err))
  }, [])

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics()
    }
  }, [activeTab, fetchAnalytics])

  const runSearch = useCallback(async (q, cat = activeCategory) => {
    if (!q.trim()) {
      setResults([])
      setRecommendations([])
      setStatus('idle')
      setSearchLatency(0)
      return
    }
    setQuery(q)
    setStatus('loading')
    try {
      const params = new URLSearchParams({
        q,
        top_n: 10,
        w_sem: wSem.toString(),
        w_key: wKey.toString(),
        w_pop: wPop.toString(),
        w_rec: wRec.toString(),
        w_cat: wCat.toString(),
      })
      if (cat && cat !== 'All') params.set('category', cat)

      const [searchRes, recRes] = await Promise.all([
        fetch(`${API}/search?${params}`).then(r => r.json()),
        fetch(`${API}/recommendations?q=${encodeURIComponent(q)}`).then(r => r.json()),
      ])

      setResults(searchRes.results || [])
      setTotalFound(searchRes.total || 0)
      setSearchLatency(searchRes.latency_ms || 0.0)
      setRecommendations(recRes.recommendations || [])
      setInterpretedQuery(searchRes.interpreted_query || q)
      setStatus('done')
      
      // Reset AI summary
      clearSummaryIntervals()
      setSummaryState('idle')
      setSummaryData(null)
      setStreamedDefinition('')
      setStreamedConcepts([])
      setStreamedApps([])
      setStreamedRelated([])
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }, [activeCategory, wSem, wKey, wPop, wRec, wCat])

  const startBriefingStream = (summary) => {
    setSummaryData(summary)
    setSummaryState('generating')

    const words = summary.definition.split(' ')
    let wordIdx = 0
    let currentDefText = ''
    
    defIntervalRef.current = setInterval(() => {
      if (wordIdx < words.length) {
        currentDefText += (wordIdx === 0 ? '' : ' ') + words[wordIdx]
        setStreamedDefinition(currentDefText)
        wordIdx++
      } else {
        clearInterval(defIntervalRef.current)
        
        let conceptIdx = 0
        conceptIntervalRef.current = setInterval(() => {
          if (conceptIdx < summary.keyConcepts.length) {
            const conceptVal = summary.keyConcepts[conceptIdx];
            setStreamedConcepts(prev => [...prev, conceptVal])
            conceptIdx++
          } else {
            clearInterval(conceptIntervalRef.current)
            
            let appIdx = 0
            appIntervalRef.current = setInterval(() => {
              if (appIdx < summary.applications.length) {
                const appVal = summary.applications[appIdx];
                setStreamedApps(prev => [...prev, appVal])
                appIdx++
              } else {
                clearInterval(appIntervalRef.current)
                
                let relatedIdx = 0
                relatedIntervalRef.current = setInterval(() => {
                  if (relatedIdx < summary.relatedTopics.length) {
                    const relatedVal = summary.relatedTopics[relatedIdx];
                    setStreamedRelated(prev => [...prev, relatedVal])
                    relatedIdx++
                  } else {
                    clearInterval(relatedIntervalRef.current)
                    setSummaryState('completed')
                  }
                }, 150)
              }
            }, 150)
          }
        }, 150)
      }
    }, 25)
  }

  const getFallbackSummary = (q, docs) => {
    const cleanQ = q.toLowerCase().trim();
    let summary = null;
    const matchedKey = Object.keys(CURATED_SUMMARIES).find(key => cleanQ.includes(key));
    if (matchedKey) {
      summary = { ...CURATED_SUMMARIES[matchedKey] };
    } else {
      summary = getDynamicSummary(q, docs);
    }
    summary.sources = docs.slice(0, 3).map(doc => doc.title);
    summary.followUps = getFollowUpQuestions(docs[0]?.category, q);
    return summary;
  };

  const triggerSummaryGeneration = useCallback((q, docs) => {
    if (!docs || docs.length === 0) return
    
    clearSummaryIntervals()
    setSummaryState('parsing')
    setSummaryData(null)
    setStreamedDefinition('')
    setStreamedConcepts([])
    setStreamedApps([])
    setStreamedRelated([])

    if (assistantMode === 'gemini' && isGeminiAvailable) {
      fetch(`${API}/api/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, results: docs })
      })
      .then(res => {
        if (!res.ok) throw new Error("Backend response error");
        return res.json();
      })
      .then(summary => {
        summary.sources = docs.slice(0, 3).map(doc => doc.title);
        startBriefingStream(summary);
      })
      .catch(err => {
        console.error(err);
        const summary = getFallbackSummary(q, docs);
        startBriefingStream(summary);
      });
    } else {
      summaryTimeoutRef.current = setTimeout(() => {
        const summary = getFallbackSummary(q, docs);
        startBriefingStream(summary);
      }, 800);
    }
  }, [assistantMode, isGeminiAvailable])

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat)
    if (query) runSearch(query, cat)
  }

  const handleSidebarQuery = (q) => {
    setActiveCategory('All')
    runSearch(q, 'All')
  }

  const resetWeights = () => {
    setWSem(0.50)
    setWKey(0.20)
    setWPop(0.10)
    setWRec(0.10)
    setWCat(0.10)
  }

  // Group results by category and subject
  // Subject is extracted by splitting title on " using "
  const getClusteredResults = () => {
    const categoriesGroup = {}
    results.forEach((r) => {
      const cat = r.category || 'Other'
      const subject = r.title ? r.title.split(' using ')[0] : 'General'

      if (!categoriesGroup[cat]) {
        categoriesGroup[cat] = {}
      }
      if (!categoriesGroup[cat][subject]) {
        categoriesGroup[cat][subject] = []
      }
      categoriesGroup[cat][subject].push(r)
    })
    return categoriesGroup
  }

  const goHome = () => {
    setQuery('')
    setResults([])
    setRecommendations([])
    setStatus('idle')
    setActiveCategory('All')
    setInterpretedQuery('')
    
    clearSummaryIntervals()
    setSummaryState('idle')
    setSummaryData(null)
    setStreamedDefinition('')
    setStreamedConcepts([])
    setStreamedApps([])
    setStreamedRelated([])
  }

  const handleAdminUnlock = () => {
    if (adminPasscode === 'admin' || adminPasscode === 'admin123') {
      setIsAdmin(true)
      setShowAdminModal(false)
      setActiveTab('analytics')
      setAdminPasscode('')
      setAdminError('')
    } else {
      setAdminError('Invalid passcode. Access Denied.')
    }
  }

  const isHome = status === 'idle' || !query.trim()

  return (
    <div style={styles.root} className={darkMode ? 'dark-theme' : ''}>
      <style>{`
        :root {
          --bg-primary: #f8fafc;
          --bg-card: #ffffff;
          --border-color: #e2e8f0;
          --text-primary: #0f172a;
          --text-secondary: #64748b;
          --primary-color: #34bf91ff;
          --primary-hover: #2da87f;
          --link-color: #34bf91ff;
          --accent-color: #48d8a4;
          --accent-bg: rgba(52, 191, 145, 0.08);
          --accent-text: #2da87f;
          --input-bg: #ffffff;
          --slider-track: #e2e8f0;
        }
        .dark-theme {
          --bg-primary: #090d16;
          --bg-card: #111827;
          --border-color: #1f2937;
          --text-primary: #f3f4f6;
          --text-secondary: #9ca3af;
          --primary-color: #34bf91ff;
          --primary-hover: #2da87f;
          --link-color: #48d8a4;
          --accent-color: #6ee7b7;
          --accent-bg: rgba(52, 191, 145, 0.15);
          --accent-text: #6ee7b7;
          --input-bg: #1f2937;
          --slider-track: #374151;
        }
        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
          transition: background-color 0.2s ease, color 0.2s ease;
          margin: 0;
          font-family: 'Inter', sans-serif;
        }
        @keyframes pulse {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes rotate-sparkle {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes mic-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .mic-button {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 50%;
          transition: all 0.2s;
          outline: none;
          margin-right: 4px;
        }
        .mic-button:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .mic-active {
          animation: mic-pulse 1.5s infinite;
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }
        .ai-followup-btn {
          color: var(--link-color);
          transition: color 0.15s ease;
        }
        .ai-followup-btn:hover {
          color: var(--primary-hover) !important;
        }
      `}</style>

      {/* Navigation bar - Always visible, but adapts to Home vs Results */}
      <nav style={isHome ? styles.navHome : styles.navResults}>
        {!isHome && (
          <div style={styles.navLogo} onClick={goHome}>
            <span style={styles.navLogoText}>Semantica</span>
          </div>
        )}

        <div style={styles.navActions}>
          <div style={styles.tabContainer}>
            <button
              onClick={() => setActiveTab('search')}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'search' ? styles.tabBtnActive : {}),
              }}
            >
              Search Portal
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('analytics')}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'analytics' ? styles.tabBtnActive : {}),
                }}
              >
                System Analytics
              </button>
            )}
          </div>

          <button
            onClick={() => {
              if (isAdmin) {
                setIsAdmin(false)
                setActiveTab('search')
              } else {
                setShowAdminModal(true)
              }
            }}
            style={styles.adminToggle}
            title={isAdmin ? "Lock Admin Console" : "Admin Login"}
            aria-label="Toggle Admin Access"
          >
            {isAdmin ? (
              <svg width="18" height="18" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </button>

          <button onClick={() => setDarkMode(!darkMode)} style={styles.themeToggle} aria-label="Toggle Theme">
            {darkMode ? (
              <svg width="18" height="18" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Main Search View */}
      {activeTab === 'search' && (
        <>
          {/* Conditional Layout: Home Layout */}
          {isHome ? (
            <div style={styles.homeContainer}>
              <div style={styles.homeLogoSection}>
                <h1 style={styles.homeLogoText}>Semantica</h1>
                <p style={styles.homeSubtitle}>Advanced AI-powered vector document search engine</p>
              </div>

              <div style={styles.homeSearchWrapper}>
                <SearchBar
                  onSearch={(q) => runSearch(q)}
                  onCategoryChange={handleCategoryChange}
                  categories={categories}
                  activeCategory={activeCategory}
                />
              </div>

              {/* Tuning weights toggle */}
              <div style={styles.tunerTriggerRow}>
                <button onClick={() => setShowTuning(!showTuning)} style={styles.tuningBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span>{showTuning ? 'Hide Settings' : 'Customize Reranking Weights'}</span>
                </button>
              </div>

              {showTuning && (
                <div style={styles.homeTunerContainer}>
                  {renderTuner()}
                </div>
              )}

              {/* Home Features / Info */}
              <div style={styles.homeFeatures}>
                <div style={styles.idleGrid}>
                  {[
                    { title: 'Dense Vectors', desc: 'Precomputed text embeddings using SentenceTransformers' },
                    { title: 'FAISS Indexing', desc: 'Performs Approximate Nearest Neighbors vector clustering' },
                    { title: 'Adaptive Ranker', desc: 'Allows custom-weighted blends of three ranking metrics' },
                    { title: 'Analytics Logs', desc: 'Tracks real-time latencies, query counts, and filters' },
                  ].map(f => (
                    <div key={f.title} style={styles.featureCard}>
                      <span style={styles.featureTitle}>{f.title}</span>
                      <span style={styles.featureDesc}>{f.desc}</span>
                    </div>
                  ))}
                </div>

                <p style={styles.exampleQueries}>
                  Try queries:{' '}
                  {['machine learning basics', 'Roman history', 'healthy eating', 'JavaScript frameworks'].map((q) => (
                    <button key={q} onClick={() => runSearch(q)} style={styles.exampleBtn}>{q}</button>
                  ))}
                </p>
              </div>
            </div>
          ) : (
            /* Results Layout */
            <div style={styles.resultsContainer}>
              <div style={styles.resultsHeaderRow}>
                <div style={styles.resultsSearchBox}>
                  <SearchBar
                    onSearch={(q) => runSearch(q)}
                    onCategoryChange={handleCategoryChange}
                    categories={categories}
                    activeCategory={activeCategory}
                  />
                </div>

                <button onClick={() => setShowTuning(!showTuning)} style={styles.resultsTuningBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span>Weights</span>
                </button>
              </div>

              {showTuning && (
                <div style={styles.resultsTunerWrapper}>
                  {renderTuner()}
                </div>
              )}

              <main style={styles.main}>
                {/* Results Column */}
                <div style={styles.resultsList}>
                  {status === 'done' && (
                    <div style={styles.statusBar}>
                      <span style={styles.statusText}>
                        Found {totalFound} results ({searchLatency} ms)
                      </span>
                      <span style={styles.aiLabel}>Vector Search Active</span>
                    </div>
                  )}

                  {status === 'done' && query && interpretedQuery && query.toLowerCase().trim() !== interpretedQuery.toLowerCase().trim() && (
                    <div style={styles.llmInterpretedBanner}>
                      <span style={styles.llmBadge}>LLM Understanding</span>
                      <span style={styles.llmInterpretedText}>
                        Interpreted intent as: <strong style={{ color: 'var(--primary-color)' }}>"{interpretedQuery}"</strong>
                      </span>
                    </div>
                  )}

                  {/* AI Research Assistant Mode Widget */}
                  {status === 'done' && results.length > 0 && (
                    <div style={styles.aiBriefingCard}>
                      <div style={styles.aiBriefingHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5" style={summaryState === 'generating' || summaryState === 'parsing' ? styles.sparkleAnim : {}}>
                            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707m0-12.728.707.707m10.607 10.607.707.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
                          </svg>
                          <span style={styles.aiBriefingTitle}>AI Research Assistant</span>
                        </div>
                        
                        {/* Comparison Mode Selector Toggle */}
                        <div style={styles.aiToggleContainer}>
                          <button
                            onClick={() => {
                              if (assistantMode !== 'local') {
                                setAssistantMode('local');
                                clearSummaryIntervals();
                                setSummaryState('idle');
                                setSummaryData(null);
                                setStreamedDefinition('');
                                setStreamedConcepts([]);
                                setStreamedApps([]);
                                setStreamedRelated([]);
                              }
                            }}
                            style={{
                              ...styles.aiToggleBtn,
                              ...(assistantMode === 'local' ? styles.aiToggleBtnActive : {}),
                            }}
                          >
                            Local Assist
                          </button>
                          <button
                            onClick={() => {
                              if (assistantMode !== 'gemini') {
                                setAssistantMode('gemini');
                                clearSummaryIntervals();
                                setSummaryState('idle');
                                setSummaryData(null);
                                setStreamedDefinition('');
                                setStreamedConcepts([]);
                                setStreamedApps([]);
                                setStreamedRelated([]);
                              }
                            }}
                            style={{
                              ...styles.aiToggleBtn,
                              ...(assistantMode === 'gemini' ? styles.aiToggleBtnActive : {}),
                            }}
                          >
                            Gemini AI
                          </button>
                        </div>
                      </div>

                      {summaryState === 'idle' && assistantMode === 'gemini' && !isGeminiAvailable && (
                        <div style={styles.aiWarningCard}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" style={{ marginRight: 8, flexShrink: 0 }}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
                          </svg>
                          <span style={{ fontSize: 12.5, color: '#f59e0b', fontWeight: 500, textAlign: 'left', lineHeight: 1.4 }}>
                            Gemini API Key missing. Please create and add <strong>GEMINI_API_KEY</strong> inside <code>backend/.env</code>, then restart the server.
                          </span>
                        </div>
                      )}

                      {summaryState === 'idle' && (
                        <div style={styles.aiBriefingIdle}>
                          <p style={styles.aiBriefingPrompt}>
                            {assistantMode === 'gemini'
                              ? <span>Analyze search results for <strong style={{ color: 'var(--primary-color)' }}>"{query}"</strong> using live Google Gemini LLM synthesis.</span>
                              : <span>Analyze search results for <strong style={{ color: 'var(--primary-color)' }}>"{query}"</strong> using rule-based local semantic briefing.</span>
                            }
                          </p>
                          <button
                            onClick={() => triggerSummaryGeneration(query, results)}
                            style={{
                              ...styles.aiBriefingBtn,
                              ...(assistantMode === 'gemini' && !isGeminiAvailable ? styles.aiBriefingBtnDisabled : {})
                            }}
                            disabled={assistantMode === 'gemini' && !isGeminiAvailable}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                            Generate {assistantMode === 'gemini' ? 'Gemini' : 'Local'} Summary
                          </button>
                        </div>
                      )}

                      {summaryState === 'parsing' && (
                        <div style={styles.aiBriefingLoading}>
                          <div style={styles.aiPulsingBar}>
                            <div style={styles.aiPulsingFill} />
                          </div>
                          <span style={styles.aiLoadingText}>Analyzing document patterns and generating key insights...</span>
                        </div>
                      )}

                      {(summaryState === 'generating' || summaryState === 'completed') && summaryData && (
                        <div style={styles.aiBriefingContent}>
                          <h3 style={styles.aiContentTitle}>{summaryData.title}</h3>
                          
                          <div style={styles.aiSection}>
                            <h4 style={styles.aiSectionHeader}>Definition</h4>
                            <p style={styles.aiDefParagraph}>
                              {streamedDefinition}
                              {summaryState === 'generating' && streamedDefinition.length < summaryData.definition.length && (
                                <span style={styles.aiCursor}>|</span>
                              )}
                            </p>
                          </div>
                          
                          {summaryData.sources && summaryData.sources.length > 0 && (
                            <div style={styles.aiSection}>
                              <h4 style={styles.aiSectionHeader}>Sources Used</h4>
                              <div style={styles.aiSourcesList}>
                                {summaryData.sources.map((source, idx) => (
                                  <div key={idx} style={styles.aiSourceItem}>
                                    <span style={styles.aiCheckIcon}>✓</span>
                                    <span style={styles.aiSourceText}>{source}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {streamedConcepts.length > 0 && (
                            <div style={styles.aiSection}>
                              <h4 style={styles.aiSectionHeader}>Key Concepts</h4>
                              <ul style={styles.aiBulletList}>
                                {streamedConcepts.map((concept, idx) => (
                                  <li key={idx} style={styles.aiBulletItem}>{concept}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {streamedApps.length > 0 && (
                            <div style={styles.aiSection}>
                              <h4 style={styles.aiSectionHeader}>Applications</h4>
                              <ul style={styles.aiBulletList}>
                                {streamedApps.map((app, idx) => (
                                  <li key={idx} style={styles.aiBulletItem}>{app}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {streamedRelated.length > 0 && (
                            <div style={styles.aiSection}>
                              <h4 style={styles.aiSectionHeader}>Related Topics</h4>
                              <div style={styles.aiPillsRow}>
                                {streamedRelated.map((topic, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleSidebarQuery(topic)}
                                    style={styles.aiPillBtn}
                                  >
                                    {topic}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {summaryState === 'completed' && summaryData.followUps && summaryData.followUps.length > 0 && (
                            <div style={styles.aiSection}>
                              <h4 style={styles.aiSectionHeader}>Ask AI</h4>
                              <div style={styles.aiFollowUpList}>
                                {summaryData.followUps.map((question, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleSidebarQuery(question)}
                                    className="ai-followup-btn"
                                    style={styles.aiFollowUpBtn}
                                  >
                                    <span style={styles.aiFollowUpIcon}>✦</span>
                                    <span style={styles.aiFollowUpText}>{question}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {status === 'loading' && (
                    <div style={styles.loadingCard}>
                      <div style={styles.pulseRow}>
                        {[1, 2, 3].map(i => (
                          <div key={i} style={{ ...styles.pulse, animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
                        Encoding query and retrieving nearest vectors...
                      </p>
                    </div>
                  )}

                  {status === 'error' && (
                    <div style={styles.errorCard}>
                      <p style={{ margin: '0 0 4px 0', color: '#ef4444', fontWeight: 600 }}>Backend Server Error</p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
                        Check your python environment and ensure FastAPI is running.
                      </p>
                    </div>
                  )}

                  {status === 'done' && results.length === 0 && (
                    <div style={styles.emptyCard}>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>No results found</p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
                        Try checking your spelling or adjusting categories.
                      </p>
                    </div>
                  )}

                  {status === 'done' && results.length > 0 && (
                    <div style={styles.clusterContainer}>
                      {Object.entries(getClusteredResults()).map(([cat, subjects]) => (
                        <div key={cat} style={styles.clusterCategoryGroup}>
                          {/* Category Header */}
                          <div style={styles.clusterCategoryHeader}>
                            <svg width="18" height="18" fill="none" stroke="var(--primary-color)" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                            <span style={styles.clusterCategoryTitle}>{cat}</span>
                          </div>

                          <div style={styles.clusterSubjectsList}>
                            {Object.entries(subjects).map(([subject, docsList], subIdx, subArr) => {
                              const isLastSubject = subIdx === subArr.length - 1;
                              const branchChar = isLastSubject ? '└' : '├';
                              return (
                                <div key={subject} style={styles.clusterSubjectGroup}>
                                  {/* Subject Header */}
                                  <div style={styles.clusterSubjectHeader}>
                                    <span style={styles.clusterBranch}>{branchChar}</span>
                                    <svg width="14" height="14" fill="none" stroke="var(--text-secondary)" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: 6, marginLeft: 4 }}>
                                      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5a6 6 0 0 0 8.49 8.49l6.75-6.75z" />
                                    </svg>
                                    <span style={styles.clusterSubjectTitle}>{subject}</span>
                                    <span style={styles.clusterCountBadge}>{docsList.length}</span>
                                  </div>

                                  {/* Documents List */}
                                  <div style={{
                                    ...styles.clusterDocsList,
                                    borderLeft: isLastSubject ? '1px solid transparent' : '1px solid var(--border-color)',
                                  }}>
                                    {docsList.map((doc, docIdx) => (
                                      <div key={doc.id} style={styles.clusterDocItem}>
                                        <ResultCard result={doc} rank={docIdx + 1} query={query} weights={{ semantic: wSem, keyword: wKey, popularity: wPop, recency: wRec, category_boost: wCat }} />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sidebar Column */}
                <Sidebar
                  onQuerySelect={handleSidebarQuery}
                  recommendations={recommendations}
                />
              </main>
            </div>
          )}
        </>
      )}

      {/* Analytics Dashboard View */}
      {activeTab === 'analytics' && (
        <main style={{ ...styles.main, flexDirection: 'column' }}>
          {/* Stats Header Grid */}
          <div style={styles.statsGrid}>
            <div style={styles.kpiCard}>
              <span style={styles.kpiTitle}>Total Search Queries</span>
              <span style={styles.kpiValue}>{analyticsStats.total_queries}</span>
              <span style={styles.kpiSubtitle}>Logged in analytics database</span>
            </div>

            <div style={styles.kpiCard}>
              <span style={styles.kpiTitle}>Average Execution Latency</span>
              <span style={{ ...styles.kpiValue, color: 'var(--primary-color)' }}>
                {analyticsStats.avg_latency.toFixed(1)} ms
              </span>
              <span style={styles.kpiSubtitle}>FastAPI + FAISS routing speed</span>
            </div>

            <div style={styles.kpiCard}>
              <span style={styles.kpiTitle}>Embedding Pipeline</span>
              <span style={{ ...styles.kpiValue, color: '#10b981', fontSize: 22 }}>
                FAISS FlatIP
              </span>
              <span style={styles.kpiSubtitle}>all-MiniLM-L6-v2 model</span>
            </div>

            <div style={styles.kpiCard}>
              <span style={styles.kpiTitle}>Database Corpus Size</span>
              <span style={styles.kpiValue}>{analyticsStats.total_documents || 0} Docs</span>
              <span style={styles.kpiSubtitle}>Documents CSV file records</span>
            </div>
          </div>

          {/* Visualisations Grid */}
          <div style={styles.chartsRow}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <VolumeChart data={analyticsStats.queries_by_day} />
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <CategoryBreakdown data={analyticsStats.categories} />
            </div>
          </div>

          {/* Trends Detection Row */}
          <div style={styles.chartsRow}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={styles.dashboardCard}>
                <h4 style={styles.chartTitle}>Google-Style Trends Detection</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {trendingTopics.map((t) => (
                    <div key={t.topic} style={styles.trendRow}>
                      <div style={styles.trendLabelRow}>
                        {t.trend === 'up' ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                            <polyline points="16 7 22 7 22 13" />
                          </svg>
                        ) : t.trend === 'down' ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                            <polyline points="16 17 22 17 22 11" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{t.topic}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.count} searches</span>
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        color: t.trend === 'up' ? '#10b981' : t.trend === 'down' ? '#ef4444' : 'var(--text-secondary)',
                        background: t.trend === 'up' ? 'rgba(16, 185, 129, 0.1)' : t.trend === 'down' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                      }}>
                        <span>{t.growth > 0 ? `+${t.growth}%` : `${t.growth}%`}</span>
                        <span style={{ marginLeft: 2 }}>{t.trend === 'up' ? '↑' : t.trend === 'down' ? '↓' : '→'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={styles.chartsRow}>
            <div style={{ flex: 1.5, minWidth: 280 }}>
              <LatencySparkline data={analyticsStats.latency_history} />
            </div>

            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={styles.dashboardCard}>
                <h4 style={styles.chartTitle}>Live Server Query Log</h4>
                <div style={styles.logList}>
                  {analyticsStats.latency_history.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Log is empty</p>
                  ) : (
                    [...analyticsStats.latency_history].reverse().map((log, i) => (
                      <div key={i} style={styles.logItem}>
                        <span style={styles.logQuery}>"{log.query}"</span>
                        <span style={styles.logLatency}>{log.latency_ms.toFixed(1)}ms</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Admin Passcode Modal */}
      {showAdminModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <svg width="24" height="24" fill="none" stroke="var(--primary-color)" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <h3 style={styles.modalTitle}>Admin Access Required</h3>
            </div>
            <p style={styles.modalText}>
              System Analytics features are restricted. Enter the passcode to unlock the administrator dashboard.
            </p>
            <input
              type="password"
              placeholder="Enter admin passcode"
              value={adminPasscode}
              onChange={(e) => {
                setAdminPasscode(e.target.value)
                setAdminError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdminUnlock()
              }}
              style={styles.modalInput}
              autoFocus
            />
            {adminError && <p style={styles.modalError}>{adminError}</p>}
            <div style={styles.modalActions}>
              <button
                onClick={() => {
                  setShowAdminModal(false)
                  setAdminPasscode('')
                  setAdminError('')
                }}
                style={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button onClick={handleAdminUnlock} style={styles.modalUnlockBtn}>
                Unlock Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  function renderTuner() {
    return (
      <div style={styles.tuningPanel}>
        <div style={styles.tunerHeader}>
          <span style={styles.tunerTitle}>Hybrid Ranker Settings (Weights sum to 1.0)</span>
          <button onClick={resetWeights} style={styles.resetBtn}>Reset Defaults</button>
        </div>
        <div style={styles.slidersGrid}>
          {/* Semantic */}
          <div style={styles.sliderCell}>
            <div style={styles.sliderLabelRow}>
              <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>Semantic Relevance</span>
              <span style={styles.sliderValue}>{(wSem * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={wSem}
              onChange={(e) => setWSem(parseFloat(e.target.value))}
              style={styles.rangeInput}
            />
            <p style={styles.sliderHelp}>Boosts documents based on vector distance from the query model</p>
          </div>

          {/* Keyword BM25 */}
          <div style={styles.sliderCell}>
            <div style={styles.sliderLabelRow}>
              <span style={{ fontWeight: 600, color: '#06b6d4' }}>Keyword Match (BM25)</span>
              <span style={styles.sliderValue}>{(wKey * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={wKey}
              onChange={(e) => setWKey(parseFloat(e.target.value))}
              style={styles.rangeInput}
            />
            <p style={styles.sliderHelp}>Boosts documents based on lexical term matching (BM25 score)</p>
          </div>

          {/* Popularity */}
          <div style={styles.sliderCell}>
            <div style={styles.sliderLabelRow}>
              <span style={{ fontWeight: 600, color: '#f59e0b' }}>Document Popularity</span>
              <span style={styles.sliderValue}>{(wPop * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={wPop}
              onChange={(e) => setWPop(parseFloat(e.target.value))}
              style={styles.rangeInput}
            />
            <p style={styles.sliderHelp}>Boosts highly-cited or trending document files</p>
          </div>

          {/* Recency */}
          <div style={styles.sliderCell}>
            <div style={styles.sliderLabelRow}>
              <span style={{ fontWeight: 600, color: '#10b981' }}>Content Freshness</span>
              <span style={styles.sliderValue}>{(wRec * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={wRec}
              onChange={(e) => setWRec(parseFloat(e.target.value))}
              style={styles.rangeInput}
            />
            <p style={styles.sliderHelp}>Favours newer publications using exponential age decay</p>
          </div>

          {/* Category Boost */}
          <div style={styles.sliderCell}>
            <div style={styles.sliderLabelRow}>
              <span style={{ fontWeight: 600, color: '#ec4899' }}>Category Intent Boost</span>
              <span style={styles.sliderValue}>{(wCat * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={wCat}
              onChange={(e) => setWCat(parseFloat(e.target.value))}
              style={styles.rangeInput}
            />
            <p style={styles.sliderHelp}>Boosts documents in categories that match the query intent keywords</p>
          </div>
        </div>
      </div>
    )
  }
}

const styles = {
  root: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    transition: 'background-color 0.2s, color 0.2s',
  },
  // Top nav styles
  navHome: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '16px 24px',
    background: 'transparent',
    gap: 16,
  },
  navResults: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px',
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border-color)',
    gap: 16,
  },
  navLogo: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  navLogoText: {
    fontSize: 18,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  // Center Home layout styles
  homeContainer: {
    maxWidth: 680,
    margin: '0 auto',
    padding: '80px 24px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    textAlign: 'center',
  },
  homeLogoSection: {
    marginBottom: 28,
  },
  homeLogoText: {
    fontSize: 48,
    fontWeight: 800,
    margin: '0 0 8px 0',
    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-1.5px',
  },
  homeSubtitle: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    margin: 0,
    fontWeight: 400,
  },
  homeSearchWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  tunerTriggerRow: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 20,
  },
  tuningBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 12,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'all 0.15s',
  },
  homeTunerContainer: {
    width: '100%',
    marginBottom: 24,
    textAlign: 'left',
  },
  homeFeatures: {
    marginTop: 40,
    borderTop: '1px solid var(--border-color)',
    paddingTop: 32,
  },
  // Results view layout styles
  resultsContainer: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '24px 24px 40px',
    boxSizing: 'border-box',
  },
  resultsHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  resultsSearchBox: {
    flex: 1,
    minWidth: 0,
  },
  resultsTuningBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 20,
    height: 44,
    padding: '0 16px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  resultsTunerWrapper: {
    marginBottom: 20,
  },
  // Main split layout
  main: {
    display: 'flex',
    gap: 32,
    alignItems: 'flex-start',
  },
  resultsList: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottom: '1px solid var(--border-color)',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  aiLabel: {
    fontSize: 11,
    color: 'var(--accent-text)',
    fontWeight: 600,
    background: 'var(--accent-bg)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  // Tuning panel common styles
  tuningPanel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    padding: 16,
  },
  tunerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: 8,
  },
  tunerTitle: { fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' },
  resetBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary-color)',
    cursor: 'pointer',
    fontSize: 11.5,
    fontWeight: 600,
  },
  slidersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  },
  sliderCell: {
    display: 'flex',
    flexDirection: 'column',
  },
  sliderLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12.5,
    marginBottom: 6,
  },
  sliderValue: { fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' },
  rangeInput: {
    width: '100%',
    height: 5,
    borderRadius: 999,
    background: 'var(--slider-track)',
    outline: 'none',
    cursor: 'pointer',
    accentColor: 'var(--primary-color)',
  },
  sliderHelp: { fontSize: 10.5, color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.3 },
  // Tab styles
  tabContainer: {
    display: 'flex',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 20,
    padding: 2,
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '6px 14px',
    borderRadius: 18,
    cursor: 'pointer',
    fontSize: 12.5,
    fontWeight: 500,
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.15s',
  },
  tabBtnActive: {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    fontWeight: 600,
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 20,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  },
  // Features Grid
  idleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  featureCard: {
    background: 'var(--bg-card)',
    borderRadius: 10,
    padding: 14,
    border: '1px solid var(--border-color)',
    textAlign: 'left',
  },
  featureTitle: {
    fontWeight: 600,
    fontSize: 13,
    color: 'var(--text-primary)',
    display: 'block',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    display: 'block',
  },
  exampleQueries: {
    fontSize: 12.5,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    margin: 0,
  },
  exampleBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 11.5,
    color: 'var(--primary-color)',
    cursor: 'pointer',
    fontWeight: 500,
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.15s',
  },
  // States card
  loadingCard: {
    borderRadius: 12,
    padding: '40px 0',
    textAlign: 'center',
  },
  pulseRow: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--primary-color)',
    animation: 'pulse 0.8s ease-in-out infinite alternate',
  },
  errorCard: {
    background: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 10,
    padding: 20,
    textAlign: 'center',
  },
  emptyCard: {
    background: 'transparent',
    border: '1px dashed var(--border-color)',
    borderRadius: 10,
    padding: 40,
    textAlign: 'center',
  },
  // Analytics sub-styles
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    width: '100%',
    marginBottom: 16,
  },
  kpiCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  kpiTitle: { fontSize: 10.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 2px' },
  kpiSubtitle: { fontSize: 10, color: 'var(--text-secondary)' },
  chartsRow: {
    display: 'flex',
    gap: 16,
    width: '100%',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  dashboardCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  chartTitle: { margin: '0 0 16px', fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 },
  chartFooter: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginTop: 8 },
  vBarContainer: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 110, paddingBottom: 6 },
  vBarColumn: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, margin: '0 3px' },
  vBarCount: { fontSize: 9, fontWeight: 700, color: 'var(--primary-color)', marginBottom: 2 },
  vBarFiller: { width: '100%', background: 'linear-gradient(to top, var(--primary-color), var(--accent-color))', borderRadius: '3px 3px 0 0', minHeight: 4 },
  vBarLabel: { fontSize: 8, color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'nowrap' },
  hBarLabelRow: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-primary)', marginBottom: 4 },
  hBarTrack: { height: 6, background: 'var(--bg-primary)', borderRadius: 999, overflow: 'hidden' },
  hBarFill: { height: '100%', background: 'var(--accent-color)', borderRadius: 999 },
  logList: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 110, overflowY: 'auto' },
  logItem: { display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 11 },
  logQuery: { fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 },
  logLatency: { fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary-color)' },
  trendRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
  },
  trendLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  adminToggle: {
    width: 36,
    height: 36,
    borderRadius: 20,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modalContent: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    textAlign: 'center',
  },
  modalHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  modalText: {
    fontSize: 13.5,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: '0 0 16px 0',
  },
  modalInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid var(--border-color)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 14.5,
    textAlign: 'center',
    outline: 'none',
    marginBottom: 12,
  },
  modalError: {
    color: '#ef4444',
    fontSize: 12.5,
    fontWeight: 600,
    margin: '0 0 12px 0',
  },
  modalActions: {
    display: 'flex',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 8,
    border: '1px solid var(--border-color)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: 13.5,
    cursor: 'pointer',
  },
  modalUnlockBtn: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 8,
    border: 'none',
    background: 'var(--primary-color)',
    color: 'white',
    fontWeight: 600,
    fontSize: 13.5,
    cursor: 'pointer',
  },
  llmInterpretedBanner: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--accent-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    padding: '10px 14px',
    marginBottom: 14,
    gap: 10,
  },
  llmBadge: {
    background: 'var(--primary-color)',
    color: 'white',
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  llmInterpretedText: {
    fontSize: 13,
    color: 'var(--text-primary)',
  },
  clusterContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    marginTop: 8,
  },
  clusterCategoryGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  clusterCategoryHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'var(--accent-bg)',
    borderRadius: 8,
    marginBottom: 8,
  },
  clusterCategoryTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  clusterSubjectsList: {
    display: 'flex',
    flexDirection: 'column',
  },
  clusterSubjectGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  clusterSubjectHeader: {
    display: 'flex',
    alignItems: 'center',
    height: 32,
    color: 'var(--text-secondary)',
  },
  clusterBranch: {
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    width: 16,
    display: 'inline-block',
    textAlign: 'center',
  },
  clusterSubjectTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  clusterCountBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '1px 6px',
    marginLeft: 8,
  },
  clusterDocsList: {
    paddingLeft: 16,
    marginLeft: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  clusterDocItem: {
    width: '100%',
  },
  sparkleAnim: {
    animation: 'rotate-sparkle 6s linear infinite',
  },
  aiBriefingCard: {
    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.04) 0%, rgba(139, 92, 246, 0.01) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.25)',
    borderRadius: 16,
    padding: '20px 24px',
    marginBottom: 24,
    boxShadow: '0 8px 30px rgba(124, 58, 237, 0.05)',
  },
  aiBriefingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottom: '1px solid rgba(124, 58, 237, 0.1)',
    paddingBottom: 12,
  },
  aiBriefingTitle: {
    fontSize: 15.5,
    fontWeight: 700,
    color: 'var(--primary-color)',
    letterSpacing: '-0.3px',
  },
  aiModeBadge: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--accent-text)',
    background: 'var(--accent-bg)',
    padding: '2px 8px',
    borderRadius: 12,
    letterSpacing: '0.5px',
  },
  aiBriefingIdle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  aiBriefingPrompt: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: 1.5,
  },
  aiBriefingBtn: {
    background: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    borderRadius: 20,
    padding: '8px 18px',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
  },
  aiBriefingLoading: {
    padding: '12px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  aiPulsingBar: {
    height: 4,
    background: 'var(--border-color)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  aiPulsingFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '40%',
    background: 'var(--primary-color)',
    borderRadius: 2,
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  aiLoadingText: {
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  aiBriefingContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    textAlign: 'left',
  },
  aiContentTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: '0 0 4px 0',
    letterSpacing: '-0.3px',
  },
  aiSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  aiSectionHeader: {
    fontSize: 12.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    letterSpacing: '0.5px',
    margin: 0,
  },
  aiDefParagraph: {
    fontSize: 14.5,
    color: 'var(--text-primary)',
    lineHeight: 1.55,
    margin: 0,
  },
  aiCursor: {
    fontWeight: 100,
    color: 'var(--primary-color)',
    animation: 'pulse 1s infinite',
    marginLeft: 2,
  },
  aiBulletList: {
    margin: 0,
    paddingLeft: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  aiBulletItem: {
    fontSize: 14,
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
  aiPillsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  aiPillBtn: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    padding: '6px 14px',
    fontSize: 12.5,
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontWeight: 500,
  },
  aiSourcesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 4,
  },
  aiSourceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13.5,
    color: 'var(--text-primary)',
  },
  aiCheckIcon: {
    color: 'var(--primary-color)',
    fontWeight: 'bold',
    fontSize: 14,
  },
  aiSourceText: {
    lineHeight: 1.4,
  },
  aiFollowUpList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 6,
  },
  aiFollowUpBtn: {
    background: 'transparent',
    border: 'none',
    padding: '4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13.5,
    textAlign: 'left',
    outline: 'none',
    transition: 'color 0.15s ease',
  },
  aiFollowUpIcon: {
    color: 'var(--primary-color)',
    fontSize: 12,
  },
  aiFollowUpText: {
    borderBottom: '1px solid transparent',
    transition: 'border-color 0.15s ease',
  },
  aiToggleContainer: {
    display: 'flex',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    padding: 2,
  },
  aiToggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '4px 10px',
    borderRadius: 14,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.15s',
  },
  aiToggleBtnActive: {
    background: 'var(--bg-card)',
    color: 'var(--primary-color)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  aiBriefingBtnDisabled: {
    background: 'var(--border-color)',
    color: 'var(--text-secondary)',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  aiWarningCard: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: 10,
    padding: '10px 14px',
    marginBottom: 12,
  },
}
