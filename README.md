# 🔍 Semantic Search Engine - Node.js CLI Tool

An AI-powered command-line interface (CLI) search engine with semantic understanding, smart hybrid ranking, and automatic search telemetry logging — built in Node.js.

---

## Directory Structure

```
semantic-search-engine/
├── data/
│   ├── documents.csv      ← Document corpus
│   ├── embeddings.json    ← Precomputed document embeddings cache
│   └── analytics.csv      ← Telemetry log tracking search history
│
├── node_modules/          ← Installed node dependencies
├── search.js              ← Core search script & CLI routing logic
├── package.json           ← Node project configuration
└── package-lock.json
```

---

## Features

- **Semantic Search**: Understands matching meaning instead of just exact keywords, utilizing the `Xenova/all-MiniLM-L6-v2` transformer model running locally.
- **Auto-Caching Embeddings**: Generates document embeddings on the first run and caches them in `data/embeddings.json` for subsequent searches to run in milliseconds.
- **Hybrid Reranking Engine**: Combines semantic closeness, document popularity, and content freshness into a single score.
- **Telemetry & Logging**: Automatically saves search queries, execution latency, results count, and categories to `data/analytics.csv` for query diagnostics.
- **Filtering**: Supports category-level filtering of results.

---

## Ranking Algorithm

The final score for each document is computed as a weighted sum of three distinct features:

```
final_score = w_sem × semantic_relevance
            + w_pop × popularity_score   (normalized document popularity)
            + w_rec × recency_score      (exponential age decay, half-life 180 days)
```

The default weights are:
- **Semantic Weight (`w_sem`)**: `0.75`
- **Popularity Weight (`w_pop`)**: `0.15`
- **Recency Weight (`w_rec`)**: `0.10`

---

## Installation & Setup

Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

```bash
# Install dependencies
npm install
```

---

## Usage

You can run search queries directly using `node search.js`:

```bash
# Basic query search
node search.js "machine learning basics"

# Search with category filtering (e.g., Programming)
node search.js "typescript structures" --category "Programming"

# Limit the number of top results returned (default: 5)
node search.js "space flight" --top 3

# Customize hybrid ranking weights
node search.js "climate change" --w_sem 0.60 --w_pop 0.30 --w_rec 0.10

# Force rebuild the document embeddings cache from documents.csv
node search.js "artificial intelligence" --rebuild
```

### Full Options Reference

```bash
node search.js --help
```

---

## Document Corpus & Analytics

### Adding Documents
You can expand or edit the document catalog in `data/documents.csv`. The format requires the following columns:
`id,title,content,category,url,date,popularity`

*Note: If you add new documents, run search with the `--rebuild` flag to regenerate the embeddings cache.*

### Viewing Telemetry
Query history, execution latencies, and categories filtered are logged under `data/analytics.csv` for monitoring system load and query statistics.
