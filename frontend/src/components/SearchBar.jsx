import { useState, useRef, useEffect } from 'react'

const isSpeechSupported = typeof window !== 'undefined' && (!!window.SpeechRecognition || !!window.webkitSpeechRecognition)

export default function SearchBar({ onSearch, onCategoryChange, categories, activeCategory }) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Suggestions states
  const [suggestions, setSuggestions] = useState([])
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Voice Search states
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  const suggestDebounceRef = useRef(null)
  const wrapperRef = useRef(null)

  // Speech recognition cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsListening(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const rec = new SpeechRecognition()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'

    rec.onstart = () => {
      setIsListening(true)
    }

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      if (transcript) {
        setQuery(transcript)
        triggerSearch(transcript)
      }
    }

    rec.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    rec.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setIsListening(false)
    }
  }

  // Click outside listener to close suggestions and clear focus state
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false)
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSuggestions = async (val) => {
    try {
      const API = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${API}/suggestions?q=${encodeURIComponent(val)}`)
      const data = await res.json()
      setSuggestions(data.suggestions || [])
      setShowSuggestions(data.suggestions && data.suggestions.length > 0 && focused)
    } catch (err) {
      console.error('Failed to fetch suggestions:', err)
    }
  }

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setActiveSuggestion(-1)

    // Debounced suggestions fetching
    clearTimeout(suggestDebounceRef.current)
    if (val.trim().length > 0) {
      suggestDebounceRef.current = setTimeout(() => fetchSuggestions(val), 150)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const triggerSearch = async (q) => {
    if (!q.trim()) return
    setLoading(true)
    setShowSuggestions(false)
    setFocused(false)
    await onSearch(q.trim())
    setLoading(false)
  }

  const handleSelectSuggestion = (s) => {
    setQuery(s)
    setSuggestions([])
    setShowSuggestions(false)
    triggerSearch(s)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (activeSuggestion >= 0 && activeSuggestion < suggestions.length) {
        handleSelectSuggestion(suggestions[activeSuggestion])
      } else {
        triggerSearch(query)
      }
    } else if (e.key === 'ArrowDown') {
      if (showSuggestions && suggestions.length > 0) {
        e.preventDefault()
        setActiveSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
      }
    } else if (e.key === 'ArrowUp') {
      if (showSuggestions && suggestions.length > 0) {
        e.preventDefault()
        setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setActiveSuggestion(-1)
    }
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    onSearch('')
  }

  const handleFocus = () => {
    setFocused(true)
    if (query.trim().length > 0 && suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  return (
    <div style={styles.wrapper} ref={wrapperRef}>
      {/* Search input */}
      <div
        style={{
          ...styles.inputWrapper,
          ...(focused ? styles.inputWrapperFocused : {}),
        }}
      >
        <span style={styles.searchIcon}>
          {loading ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="10">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
              </circle>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          )}
        </span>

        <input
          type="text"
          value={query}
          placeholder="Search by meaning, not just keywords..."
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          style={styles.input}
          autoComplete="off"
          spellCheck={false}
        />

        {query && (
          <button onClick={handleClear} style={styles.clearBtn} aria-label="Clear">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {isSpeechSupported && (
          <button
            onClick={toggleListening}
            className={`mic-button ${isListening ? 'mic-active' : ''}`}
            title={isListening ? "Listening... Click to stop" : "Search by voice"}
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8" />
            </svg>
          </button>
        )}

        <button
          onClick={() => triggerSearch(query)}
          style={styles.searchBtn}
          disabled={!query.trim()}
        >
          Search
        </button>
      </div>

      {/* Floating Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={styles.suggestionsDropdown}>
          {suggestions.map((s, idx) => (
            <div
              key={s}
              onClick={() => handleSelectSuggestion(s)}
              onMouseEnter={() => setActiveSuggestion(idx)}
              style={{
                ...styles.suggestionItem,
                ...(activeSuggestion === idx ? styles.suggestionItemActive : {}),
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={styles.suggestionIcon}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Category tabs (Google style) */}
      <div style={styles.catRow}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            style={{
              ...styles.catPill,
              ...(activeCategory === cat ? styles.catPillActive : {}),
            }}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    width: '100%',
    maxWidth: 760,
    margin: '0 auto',
    position: 'relative',
  },
  catRow: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    scrollbarWidth: 'none',
    padding: '0 4px',
    marginTop: 12,
    borderBottom: '1px solid var(--border-color)',
  },
  catPill: {
    padding: '8px 12px 10px',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 13.5,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'Inter, sans-serif',
    whiteSpace: 'nowrap',
    outline: 'none',
  },
  catPillActive: {
    color: 'var(--primary-color)',
    borderBottomColor: 'var(--primary-color)',
    fontWeight: 600,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 32,
    padding: '10px 10px 10px 22px',
    gap: 12,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  },
  inputWrapperFocused: {
    borderColor: 'var(--primary-color)',
    boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.3), 0 4px 14px rgba(0,0,0,0.08)',
  },
  searchIcon: { display: 'flex', alignItems: 'center', flexShrink: 0 },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: 17,
    color: 'var(--text-primary)',
    background: 'transparent',
    fontFamily: 'Inter, sans-serif',
    minWidth: 0,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    padding: 6,
    borderRadius: 6,
  },
  searchBtn: {
    background: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    borderRadius: 24,
    padding: '10px 24px',
    fontSize: 14.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '60px',
    left: 0,
    right: 0,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    zIndex: 100,
    padding: '8px 0',
  },
  suggestionItem: {
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: 14.5,
    color: 'var(--text-primary)',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    transition: 'background 0.15s',
  },
  suggestionItemActive: {
    background: 'var(--bg-primary)',
  },
  suggestionIcon: {
    opacity: 0.5,
    flexShrink: 0,
  },
}
