import { useEffect, useState } from 'react'

const API = 'http://localhost:8000'

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <span style={styles.sectionTitle}>{title}</span>
      </div>
      {children}
    </div>
  )
}

export default function Sidebar({ onQuerySelect, recommendations }) {
  return (
    <aside style={styles.sidebar}>
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Section title="Related Documents">
          {recommendations.map((r) => (
            <button key={r.id} onClick={() => onQuerySelect(r.title)} style={styles.recCard}>
              <span style={styles.recTitle}>{r.title}</span>
              <span style={styles.recCat}>{r.category}</span>
            </button>
          ))}
        </Section>
      )}

      {/* System Architecture */}
      <Section title="System Architecture">
        <div style={styles.aboutList}>
          {[
            ['Embeddings Pipeline', 'SentenceTransformers (all-MiniLM-L6-v2)'],
            ['Vector Search Index', 'FAISS Approximate Nearest Neighbors (ANN)'],
            ['Distance Metric', 'Cosine Similarity (Inner Product / L2 Norm)'],
            ['Rerank Weights', 'Adjustable Semantic, Popularity & Recency'],
            ['Telemetry API', 'Active search metrics, volume & latency tracking'],
          ].map(([k, v]) => (
            <div key={k} style={styles.aboutItem}>
              <span style={styles.aboutKey}>{k}</span>
              <span style={styles.aboutVal}>{v}</span>
            </div>
          ))}
        </div>
      </Section>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: 270,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  section: {
    background: 'var(--bg-card)',
    borderRadius: 12,
    padding: '16px',
    border: '1px solid var(--border-color)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  recCard: {
    width: '100%',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '8px 10px',
    textAlign: 'left',
    cursor: 'pointer',
    marginBottom: 6,
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    transition: 'background 0.12s, border-color 0.12s',
  },
  recTitle: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 },
  recCat: { fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: 500 },
  aboutList: { display: 'flex', flexDirection: 'column', gap: 8 },
  aboutItem: { display: 'flex', flexDirection: 'column', gap: 1 },
  aboutKey: { fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)' },
  aboutVal: { fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.4 },
}
