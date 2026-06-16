import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { pipeline } from '@xenova/transformers';
import { Pinecone } from '@pinecone-database/pinecone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, './data');
const DOCUMENTS_CSV = path.join(DATA_DIR, 'documents.csv');
const EMBEDDINGS_JSON = path.join(DATA_DIR, 'embeddings.json');
const ANALYTICS_CSV = path.join(DATA_DIR, 'analytics.csv');

// Initialize Pinecone client conditionally
let pineconeClient = null;
let pineconeIndex = null;

function getPineconeIndex() {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;
  
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_pinecone_api_key_here') {
    return null;
  }
  
  if (!pineconeIndex) {
    try {
      pineconeClient = new Pinecone({ apiKey });
      pineconeIndex = pineconeClient.index(indexName || 'semantic-search');
    } catch (err) {
      console.error('Failed to initialize Pinecone Client:', err);
      return null;
    }
  }
  return pineconeIndex;
}

// Load documents from CSV
export function loadDocuments() {
  return new Promise((resolve, reject) => {
    const docs = [];
    if (!fs.existsSync(DOCUMENTS_CSV)) {
      return reject(new Error(`Source documents file not found at: ${DOCUMENTS_CSV}`));
    }
    fs.createReadStream(DOCUMENTS_CSV)
      .pipe(csv())
      .on('data', (data) => {
        data.id = parseInt(data.id);
        data.popularity = parseInt(data.popularity || 0);
        docs.push(data);
      })
      .on('end', () => resolve(docs))
      .on('error', (err) => reject(err));
  });
}

// Load query logs from CSV
export function loadAnalytics() {
  return new Promise((resolve, reject) => {
    const logs = [];
    if (!fs.existsSync(ANALYTICS_CSV)) {
      return resolve([]);
    }
    fs.createReadStream(ANALYTICS_CSV)
      .pipe(csv())
      .on('data', (data) => {
        data.results_count = parseInt(data.results_count || 0);
        data.latency_ms = parseFloat(data.latency_ms || 0);
        logs.push(data);
      })
      .on('end', () => resolve(logs))
      .on('error', (err) => reject(err));
  });
}

// Get the model instance
let extractor;
async function getModel() {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

// Compute embedding vector
async function computeEmbedding(text, model) {
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// Compute dot product (cosine similarity of normalized vectors)
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

// Load precomputed embeddings or rebuild if missing
export async function getEmbeddings(docs, forceRebuild = false) {
  // 1. If Pinecone is configured, rebuild the index on the cloud database
  const pIndex = getPineconeIndex();
  
  if (pIndex) {
    try {
      console.log(`Rebuilding Pinecone vector index. Generating embeddings for ${docs.length} documents...`);
      const model = await getModel();
      const records = [];

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const text = doc.title + '. ' + doc.content;
        const embedding = await computeEmbedding(text, model);

        records.push({
          id: `doc-${doc.id}`,
          values: embedding,
          metadata: {
            id: doc.id,
            title: doc.title,
            content: doc.content,
            category: doc.category || 'Other',
            url: doc.url || '',
            date: doc.date || '2025-12-01',
            popularity: doc.popularity || 0
          }
        });

        if ((i + 1) % 50 === 0 || i === docs.length - 1) {
          console.log(`Progress: ${i + 1}/${docs.length} embeddings generated. Upserting batch to Pinecone...`);
          const batch = records.splice(0, records.length);
          await pIndex.upsert(batch);
        }
      }
      console.log('Pinecone database successfully indexed.');
    } catch (err) {
      console.error('Failed to index documents into Pinecone:', err);
    }
  }

  // 2. Local JSON cache fallback logic
  if (!forceRebuild && fs.existsSync(EMBEDDINGS_JSON)) {
    try {
      const data = JSON.parse(fs.readFileSync(EMBEDDINGS_JSON, 'utf-8'));
      if (data.length === docs.length) {
        return data;
      }
    } catch (e) {
      // Rebuild on error
    }
  }

  console.log(`Generating local embeddings backup cache for ${docs.length} documents...`);
  const model = await getModel();
  const embeddingsList = [];
  
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const text = doc.title + '. ' + doc.content;
    const embedding = await computeEmbedding(text, model);
    embeddingsList.push({ id: doc.id, embedding });

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${docs.length} local embeddings generated...`);
    }
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(EMBEDDINGS_JSON, JSON.stringify(embeddingsList), 'utf-8');
  console.log('Local embeddings backup cache successfully saved.');
  return embeddingsList;
}

// Query Expansion Mapping
const QUERY_EXPANSIONS = {
  "prompt": ["prompt engineering", "llm prompts", "system prompts", "ai prompting"],
  "prompts": ["prompt engineering", "llm prompts", "system prompts", "ai prompting"],
  "llm": ["large language model", "transformers", "generative ai", "gpt"],
  "llms": ["large language model", "transformers", "generative ai", "gpt"],
  "rag": ["retrieval augmented generation", "vector search", "hybrid search", "embeddings"],
  "agent": ["agentic ai", "autonomous agents", "tool use", "reasoning loop"],
  "agents": ["agentic ai", "autonomous agents", "tool use", "reasoning loop"],
  "cloud": ["aws", "azure", "google cloud", "kubernetes", "cloud native"],
  "data": ["data engineering", "pipeline", "etl", "data warehouse", "spark"]
};

// LLM-Based Query Understanding Rule Engine
export function llmQueryUnderstand(query) {
  if (!query) return '';
  const cleanQuery = query.trim().toLowerCase();

  // 1. Role / Career Path Intent
  // e.g. "become an ai engineer", "how to be python developer", "career as data scientist"
  const careerRegex = /^(?:how\s+to\s+become|how\s+to\s+be|become|career\s+as|career\s+in|get\s+a\s+job\s+as|work\s+as)(?:\s+an?|\s+the)?\s+(.+)$/i;
  if (careerRegex.test(cleanQuery)) {
    const role = cleanQuery.match(careerRegex)[1];
    return `skills required for ${role}`;
  }

  // 2. Learning / Education Intent
  // e.g. "learn machine learning", "study cloud native", "course on react"
  const learningRegex = /^(?:how\s+to\s+learn|learn|study|course\s+on|tutorial\s+for|guide\s+to)(?:\s+an?|\s+the)?\s+(.+)$/i;
  if (learningRegex.test(cleanQuery)) {
    const topic = cleanQuery.match(learningRegex)[1];
    return `tutorials, courses, and syllabus for learning ${topic}`;
  }

  // 3. Technical Implementation Intent
  // e.g. "how to build a model", "how to implement transformers", "configure kubernetes"
  const configRegex = /^(?:how\s+to\s+build|how\s+to\s+implement|how\s+to\s+deploy|how\s+to\s+setup|configure|deploy|setup|implement)(?:\s+an?|\s+the)?\s+(.+)$/i;
  if (configRegex.test(cleanQuery)) {
    const tech = cleanQuery.match(configRegex)[1];
    return `implementation guide, setup steps, and code examples for ${tech}`;
  }

  // 4. Definition / Explanatory Intent
  // e.g. "what is rag", "define generative ai", "explain transformers"
  const definitionRegex = /^(?:what\s+is|what\s+are|define|explain|meaning\s+of)(?:\s+an?|\s+the)?\s+(.+)$/i;
  if (definitionRegex.test(cleanQuery)) {
    const concept = cleanQuery.match(definitionRegex)[1];
    return `introduction, core definition, and architecture concepts of ${concept}`;
  }

  // Default fallback: return query as is
  return query;
}

// Expand input query using synonym mapping
export function expandQuery(query) {
  if (!query) return '';
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const expandedTerms = new Set();
  
  words.forEach(word => {
    expandedTerms.add(word);
    if (QUERY_EXPANSIONS[word]) {
      QUERY_EXPANSIONS[word].forEach(term => {
        term.split(/\s+/).forEach(w => expandedTerms.add(w.toLowerCase()));
      });
    }
  });

  return Array.from(expandedTerms).join(' ');
}

// Simple BM25 Lexical Scorer
class BM25Searcher {
  constructor(docs) {
    this.docs = docs;
    this.N = docs.length;
    this.k1 = 1.2;
    this.b = 0.75;
    
    this.docTokens = [];
    this.docLengths = [];
    this.avgDocLength = 0;
    this.docFreqs = {}; // term -> doc count
    
    this.initialize();
  }

  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  initialize() {
    let totalLength = 0;
    
    this.docs.forEach((doc) => {
      const text = doc.title + ' ' + doc.content;
      const tokens = this.tokenize(text);
      this.docTokens.push(tokens);
      this.docLengths.push(tokens.length);
      totalLength += tokens.length;

      const uniqueTerms = new Set(tokens);
      uniqueTerms.forEach(term => {
        this.docFreqs[term] = (this.docFreqs[term] || 0) + 1;
      });
    });

    this.avgDocLength = totalLength / this.N;
  }

  getIDF(term) {
    const n = this.docFreqs[term] || 0;
    return Math.log(((this.N - n + 0.5) / (n + 0.5)) + 1);
  }

  score(query, docIdx) {
    const qTokens = this.tokenize(query);
    const docTokens = this.docTokens[docIdx];
    const docLen = this.docLengths[docIdx];
    
    const tf = {};
    docTokens.forEach(t => {
      tf[t] = (tf[t] || 0) + 1;
    });

    let score = 0;
    qTokens.forEach(term => {
      if (this.docFreqs[term]) {
        const idf = this.getIDF(term);
        const termFreq = tf[term] || 0;
        
        const numerator = termFreq * (this.k1 + 1);
        const denominator = termFreq + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));
        
        score += idf * (numerator / denominator);
      }
    });

    return score;
  }
}

let bm25Instance = null;
let lastDocsLength = 0;

async function getBM25Searcher(docs) {
  if (!bm25Instance || lastDocsLength !== docs.length) {
    bm25Instance = new BM25Searcher(docs);
    lastDocsLength = docs.length;
  }
  return bm25Instance;
}

// Log search metadata to analytics.csv
function logQuery(query, resultsCount, categoryFilter, latencyMs) {
  const timestamp = new Date().toISOString();
  const escapeCsv = (str) => {
    if (str === undefined || str === null) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const row = `${escapeCsv(query.toLowerCase().trim())},${timestamp},${resultsCount},${escapeCsv(categoryFilter || 'All')},${latencyMs.toFixed(2)}\n`;
  const headers = 'query,timestamp,results_count,category_filter,latency_ms\n';

  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ANALYTICS_CSV)) {
    fs.writeFileSync(ANALYTICS_CSV, headers + row, 'utf-8');
  } else {
    fs.appendFileSync(ANALYTICS_CSV, row, 'utf-8');
  }
}

// Core search implementation
export async function search({
  query,
  category = null,
  topN = 10,
  wSem = 0.50,
  wKey = 0.20,
  wPop = 0.10,
  wRec = 0.10,
  wCat = 0.10,
}) {
  if (!query || !query.trim()) {
    return [];
  }

  const startTime = performance.now();
  const docs = await loadDocuments();

  // 1. Run LLM-Based Query Understanding
  const interpretedQuery = llmQueryUnderstand(query);

  // 2. Run Query Expansion on interpreted query
  const expandedQuery = expandQuery(interpretedQuery);

  const model = await getModel();
  const queryEmbedding = await computeEmbedding(expandedQuery, model);

  // Get BM25 Scorer
  const bm25Searcher = await getBM25Searcher(docs);

  // Category intent keywords detection
  const CATEGORY_KEYWORDS = {
    "AI": ["ai", "llm", "llms", "prompt", "rag", "agent", "agents", "gpt", "llama", "gemini", "claude", "diffusion", "embeddings", "transformers"],
    "ML": ["ml", "machine learning", "neural", "classification", "supervised", "regression", "xgboost", "pytorch", "tensorflow", "keras", "scikit", "onnx", "clustering"],
    "Programming": ["programming", "code", "javascript", "typescript", "python", "react", "rust", "go", "asyncio", "api", "rest", "git", "docker", "node", "npm", "vite"],
    "Cloud": ["cloud", "aws", "gcp", "azure", "kubernetes", "k8s", "pod", "serverless", "iam", "vpn", "terraform", "prometheus", "grafana"],
    "Data Engineering": ["data", "etl", "pipeline", "warehouse", "spark", "kafka", "snowflake", "postgres", "dbt", "airflow", "flink", "parquet", "lakehouse"]
  };

  const queryLower = query.toLowerCase();
  const queryMatchedCategories = new Set();
  Object.entries(CATEGORY_KEYWORDS).forEach(([cat, keywords]) => {
    if (keywords.some(kw => queryLower.includes(kw))) {
      queryMatchedCategories.add(cat);
    }
  });

  let candidates = [];
  const pIndex = getPineconeIndex();

  if (pIndex) {
    try {
      console.log('Querying Pinecone Vector Database...');
      const queryResponse = await pIndex.query({
        vector: queryEmbedding,
        topK: 50,
        includeMetadata: true
      });

      candidates = queryResponse.matches.map(match => {
        const meta = match.metadata;
        const docIdx = docs.findIndex(d => d.id === meta.id);
        const bm25Score = docIdx >= 0 ? bm25Searcher.score(expandedQuery, docIdx) : 0;
        return {
          id: meta.id,
          title: meta.title,
          content: meta.content,
          category: meta.category,
          url: meta.url,
          date: meta.date,
          popularity: meta.popularity,
          vector_raw: match.score,
          bm25_raw: bm25Score
        };
      });

      if (category && category !== 'All') {
        candidates = candidates.filter(
          (doc) => doc.category.toLowerCase() === category.toLowerCase()
        );
      }
    } catch (err) {
      console.error('Pinecone query failed, falling back to local search index:', err);
      candidates = []; // reset to force fallback
    }
  }

  // Fallback if Pinecone is not set or failed (yielding 0 candidates)
  if (candidates.length === 0) {
    const docEmbeddings = await getEmbeddings(docs);
    const embMap = new Map();
    for (const item of docEmbeddings) {
      embMap.set(item.id, item.embedding);
    }

    candidates = docs.map((doc, idx) => {
      const docEmb = embMap.get(doc.id);
      const semanticScore = docEmb ? cosineSimilarity(queryEmbedding, docEmb) : 0;
      const bm25Score = bm25Searcher.score(expandedQuery, idx);
      
      return { 
        id: doc.id,
        title: doc.title,
        content: doc.content,
        category: doc.category,
        url: doc.url,
        date: doc.date,
        popularity: doc.popularity,
        vector_raw: semanticScore,
        bm25_raw: bm25Score
      };
    });

    if (category && category !== 'All') {
      candidates = candidates.filter(
        (doc) => doc.category.toLowerCase() === category.toLowerCase()
      );
    }
  }

  if (candidates.length === 0) {
    const latencyMs = performance.now() - startTime;
    logQuery(query, 0, category, latencyMs);
    return [];
  }

  // 2. Score Normalization
  const maxBm25 = Math.max(...candidates.map(c => c.bm25_raw), 0.0001);
  const minBm25 = Math.min(...candidates.map(c => c.bm25_raw));
  const maxVector = Math.max(...candidates.map(c => c.vector_raw), 0.0001);
  const minVector = Math.min(...candidates.map(c => c.vector_raw));

  candidates.forEach(c => {
    c.bm25_score = (c.bm25_raw - minBm25) / (maxBm25 - minBm25 || 1);
    c.vector_score = (c.vector_raw - minVector) / (maxVector - minVector || 1);
    
    // Stage 1 Hybrid combination (50/50 balance)
    c.hybrid_score = 0.5 * c.bm25_score + 0.5 * c.vector_score;
  });

  // 3. Stage 1 Retrieval: Get Top 50 candidates by Hybrid Score
  candidates.sort((a, b) => b.hybrid_score - a.hybrid_score);
  const top50 = candidates.slice(0, 50);

  // 4. Stage 2 Reranking: Apply user weights on the Top 50
  const maxPop = Math.max(...top50.map((d) => d.popularity), 1) || 1;
  const now = new Date();

  const ranked = top50.map((doc) => {
    const popScore = doc.popularity / maxPop;
    let recencyScore = 0.5;
    try {
      const pubDate = new Date(doc.date || '2025-12-01');
      const daysOld = Math.floor((now - pubDate) / (1000 * 60 * 60 * 24));
      recencyScore = Math.exp(-daysOld / 180);
    } catch (e) {
      // Fallback
    }

    const catBoost = queryMatchedCategories.has(doc.category) ? 1.0 : 0.0;
    const finalScore = wSem * doc.vector_score + wKey * doc.bm25_score + wPop * popScore + wRec * recencyScore + wCat * catBoost;

    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      category: doc.category,
      url: doc.url,
      date: doc.date,
      popularity: doc.popularity,
      popularity_score: parseFloat(popScore.toFixed(4)),
      recency_score: parseFloat(recencyScore.toFixed(4)),
      semantic_score: parseFloat(doc.vector_score.toFixed(4)),
      keyword_score: parseFloat(doc.bm25_score.toFixed(4)),
      category_boost_score: parseFloat(catBoost.toFixed(4)),
      final_score: parseFloat(finalScore.toFixed(4)),
    };
  });

  ranked.sort((a, b) => b.final_score - a.final_score);
  const results = ranked.slice(0, topN);

  const latencyMs = performance.now() - startTime;
  logQuery(query, results.length, category, latencyMs);

  // Add latency and query understanding metadata to each result
  results.forEach((r) => {
    r.latency_ms = parseFloat(latencyMs.toFixed(2));
    r.interpreted_query = interpretedQuery;
  });

  return results;
}

// Get related recommendations
export async function getRecommendations(query, excludeIds = []) {
  const allResults = await search({ query, topN: 10 });
  const excludeSet = new Set(excludeIds.map(Number));
  
  // Exclude top results by default if not passed
  if (excludeSet.size === 0) {
    allResults.slice(0, 5).forEach(r => excludeSet.add(r.id));
  }
  
  const recs = allResults.filter(r => !excludeSet.has(r.id));
  return recs.slice(0, 3).map(r => ({
    id: r.id,
    title: r.title,
    category: r.category
  }));
}

// Get trending search queries from the past 7 days
export async function getTrendingSearches(limit = 8) {
  try {
    const logs = await loadAnalytics();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const counts = {};
    logs.forEach((log) => {
      const ts = new Date(log.timestamp);
      if (ts >= cutoff) {
        const q = log.query.toLowerCase().trim();
        counts[q] = (counts[q] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (e) {
    return [];
  }
}

// Get unique recent search queries
export async function getRecentSearches(limit = 8) {
  try {
    const logs = await loadAnalytics();
    const seen = new Set();
    const recent = [];
    
    for (let idx = logs.length - 1; idx >= 0; idx--) {
      const q = logs[idx].query.toLowerCase().trim();
      if (!seen.has(q)) {
        seen.add(q);
        recent.push(q);
      }
      if (recent.length >= limit) break;
    }
    return recent;
  } catch (e) {
    return [];
  }
}

// Aggregate analytics statistics
export async function getAnalyticsStats() {
  try {
    const logs = await loadAnalytics();
    const docs = await loadDocuments();
    const total_queries = logs.length;
    const total_documents = docs.length;
    
    const avg_latency = total_queries > 0 
      ? logs.reduce((sum, log) => sum + log.latency_ms, 0) / total_queries 
      : 0;

    const categories = logs.reduce((counts, log) => {
      const cat = log.category_filter || 'All';
      counts[cat] = (counts[cat] || 0) + 1;
      return counts;
    }, {});

    const dateGroups = {};
    logs.forEach((log) => {
      const d = log.timestamp ? log.timestamp.slice(0, 10) : '';
      if (d) dateGroups[d] = (dateGroups[d] || 0) + 1;
    });

    const queries_by_day = Object.entries(dateGroups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);

    const latency_history = logs
      .slice(-15)
      .map((log) => ({ query: log.query, latency_ms: log.latency_ms }));

    return {
      total_queries,
      avg_latency: parseFloat(avg_latency.toFixed(2)),
      categories,
      queries_by_day,
      latency_history,
      total_documents,
    };
  } catch (e) {
    return { error: e.message };
  }
}

// Get autocomplete search suggestions based on logs and documents
export async function getSearchSuggestions(prefix, limit = 5) {
  if (!prefix || !prefix.trim()) {
    return [];
  }

  const p = prefix.toLowerCase().trim();
  const pTokens = p.split(/\s+/).filter(Boolean);
  if (pTokens.length === 0) {
    return [];
  }

  // Helper to check if candidate contains words that start with all input tokens
  const matchKeywords = (candidate) => {
    const cTokens = candidate.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return pTokens.every(pToken =>
      cTokens.some(cToken => cToken.startsWith(pToken))
    );
  };
  
  try {
    const logs = await loadAnalytics();
    const docs = await loadDocuments();

    // 1. Find matching historical queries
    const queryCounts = {};
    logs.forEach((log) => {
      const q = log.query.toLowerCase().trim();
      if (matchKeywords(q)) {
        queryCounts[q] = (queryCounts[q] || 0) + 1;
      }
    });

    const sortedQueries = Object.entries(queryCounts)
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);

    // 2. Find matching document titles
    const matchingTitles = [];
    docs.forEach((doc) => {
      const title = doc.title.toLowerCase().trim();
      if (matchKeywords(title)) {
        matchingTitles.push(title);
      }
    });

    // 3. Merge and deduplicate
    const merged = Array.from(new Set([...sortedQueries, ...matchingTitles]));

    // 4. Partition sorting: direct startsWith matches first, followed by other keyword matches
    const startsWithMatches = [];
    const otherMatches = [];

    merged.forEach((item) => {
      if (item.startsWith(p)) {
        startsWithMatches.push(item);
      } else {
        otherMatches.push(item);
      }
    });

    return [...startsWithMatches, ...otherMatches].slice(0, limit);
  } catch (e) {
    console.error('Error getting search suggestions:', e);
    return [];
  }
}

// Automatically detect trending topics based on search history (growth analysis)
export async function getTrendingTopics() {
  try {
    const logs = await loadAnalytics();

    // Definitions of topics and their keywords
    const topicDefinitions = [
      { name: 'LLMs', keywords: ['llm', 'llms', 'large language model', 'large language models'] },
      { name: 'RAG', keywords: ['rag', 'retrieval-augmented generation', 'retrieval augmented generation'] },
      { name: 'Agentic AI', keywords: ['agentic', 'agentic ai', 'ai agents', 'agents'] },
      { name: 'Machine Learning', keywords: ['machine learning', 'ml', 'neural networks'] },
      { name: 'Python Programming', keywords: ['python', 'py', 'fastapi'] },
      { name: 'Modern Frontend', keywords: ['react', 'javascript', 'typescript', 'css', 'grid'] },
    ];

    if (logs.length === 0) {
      return topicDefinitions.map(t => ({
        topic: t.name,
        count: 0,
        growth: 0,
        trend: 'stable'
      }));
    }

    // Sort chronologically to make splitting accurate
    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Split logs in half to represent "recent" vs "older" query volumes
    const half = Math.ceil(sortedLogs.length / 2);
    const olderLogs = sortedLogs.slice(0, half);
    const recentLogs = sortedLogs.slice(half);

    const checkMatch = (query, keywords) => {
      const q = query.toLowerCase().trim();
      return keywords.some(k => q.includes(k));
    };

    const results = topicDefinitions.map((topic) => {
      let recentCount = 0;
      let olderCount = 0;

      recentLogs.forEach(log => {
        if (checkMatch(log.query, topic.keywords)) recentCount++;
      });
      olderLogs.forEach(log => {
        if (checkMatch(log.query, topic.keywords)) olderCount++;
      });

      const totalCount = recentCount + olderCount;
      
      let growth = 0;
      let trend = 'stable';

      if (olderCount === 0 && recentCount > 0) {
        growth = recentCount * 50; // Visual approximation of growth
        trend = 'up';
      } else if (olderCount > 0) {
        growth = Math.round(((recentCount - olderCount) / olderCount) * 100);
        if (growth > 0) {
          trend = 'up';
        } else if (growth < 0) {
          trend = 'down';
        }
      }

      // Safeguard for growth representation
      if (growth === 0 && recentCount > olderCount) {
        growth = 10;
        trend = 'up';
      }

      return {
        topic: topic.name,
        count: totalCount,
        growth,
        trend
      };
    });

    // Sort: trending topics first (growth descending), then by count
    return results.sort((a, b) => {
      if (a.growth !== b.growth) return b.growth - a.growth;
      return b.count - a.count;
    });
  } catch (e) {
    console.error('Error in getTrendingTopics:', e);
    return [];
  }
}
