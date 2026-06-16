import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();
import { 
  search, 
  getRecommendations, 
  getTrendingSearches, 
  getRecentSearches, 
  getAnalyticsStats,
  loadDocuments,
  getEmbeddings,
  getSearchSuggestions,
  getTrendingTopics
} from './search.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    message: "Semantic Search Engine Node.js API",
    status: "online",
    backend: "Transformers.js (all-MiniLM-L6-v2) + Local Embeddings Cache"
  });
});

app.get('/search', async (req, res) => {
  const { q, category, top_n, w_sem, w_key, w_pop, w_rec, w_cat } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ detail: "Search query q is required." });
  }

  // Parse parameters and apply fallbacks
  const topN = parseInt(top_n) || 10;
  let wSem = w_sem !== undefined ? parseFloat(w_sem) : 0.50;
  let wKey = w_key !== undefined ? parseFloat(w_key) : 0.20;
  let wPop = w_pop !== undefined ? parseFloat(w_pop) : 0.10;
  let wRec = w_rec !== undefined ? parseFloat(w_rec) : 0.10;
  let wCat = w_cat !== undefined ? parseFloat(w_cat) : 0.10;

  // Normalize weights
  const totalW = wSem + wKey + wPop + wRec + wCat;
  if (totalW > 0) {
    wSem = wSem / totalW;
    wKey = wKey / totalW;
    wPop = wPop / totalW;
    wRec = wRec / totalW;
    wCat = wCat / totalW;
  } else {
    wSem = 0.50;
    wKey = 0.20;
    wPop = 0.10;
    wRec = 0.10;
    wCat = 0.10;
  }

  try {
    const results = await search({
      query: q,
      category: category || null,
      topN,
      wSem,
      wKey,
      wPop,
      wRec,
      wCat
    });

    const latencyMs = results.length > 0 ? results[0].latency_ms : 0.0;
    const interpretedQuery = results.length > 0 ? results[0].interpreted_query : q;

    res.json({
      query: q,
      interpreted_query: interpretedQuery,
      category: category || null,
      total: results.length,
      latency_ms: latencyMs,
      weights: {
        semantic: parseFloat(wSem.toFixed(4)),
        keyword: parseFloat(wKey.toFixed(4)),
        popularity: parseFloat(wPop.toFixed(4)),
        recency: parseFloat(wRec.toFixed(4)),
        category_boost: parseFloat(wCat.toFixed(4))
      },
      results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

app.get('/suggestions', async (req, res) => {
  const { q } = req.query;
  try {
    const suggestions = await getSearchSuggestions(q);
    res.json({ suggestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

app.get('/categories', async (req, res) => {
  try {
    const docs = await loadDocuments();
    const categoriesSet = new Set(docs.map(d => d.category).filter(Boolean));
    const categories = ['All', ...Array.from(categoriesSet).sort()];
    res.json({ categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

app.get('/trending', async (req, res) => {
  const limit = parseInt(req.query.limit) || 8;
  try {
    const trending = await getTrendingSearches(limit);
    res.json({ trending });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

app.get('/trending-topics', async (req, res) => {
  try {
    const topics = await getTrendingTopics();
    res.json({ topics });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

app.get('/recent', async (req, res) => {
  const limit = parseInt(req.query.limit) || 8;
  try {
    const recent = await getRecentSearches(limit);
    res.json({ recent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

app.get('/recommendations', async (req, res) => {
  const { q, exclude } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ detail: "Query parameter q is required." });
  }

  const excludeIds = exclude
    ? exclude.split(',').map(Number).filter(n => !isNaN(n))
    : [];

  try {
    const recs = await getRecommendations(q, excludeIds);
    res.json({ recommendations: recs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

app.get('/analytics-stats', async (req, res) => {
  try {
    const stats = await getAnalyticsStats();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

app.post('/rebuild-index', async (req, res) => {
  try {
    const docs = await loadDocuments();
    await getEmbeddings(docs, true);
    res.json({
      message: "Index rebuilt successfully",
      total_docs: docs.length,
      backend: "Transformers.js (all-MiniLM-L6-v2) + Local Embeddings Cache"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

app.get('/api/config', (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0;
  res.json({
    gemini_available: hasKey
  });
});

app.post('/api/brief', async (req, res) => {
  const { query, results } = req.body;
  
  if (!query || !query.trim()) {
    return res.status(400).json({ error: "Query is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({ error: "Gemini API Key is not configured on the backend server." });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const context = results && results.length > 0
      ? results.map((r, i) => `[Doc ${i + 1}] Title: ${r.title}\nContent: ${r.content}`).join('\n\n')
      : "No documents found.";

    const prompt = `
You are an expert AI Research Assistant built into Semantica (a document search engine).
Your task is to synthesize a structured topic briefing based ONLY on the context documents retrieved for the user's query: "${query}".

If the query is not fully covered by the context, summarize what is available and generate appropriate concepts.
You MUST respond with a JSON object matching this exact schema:
{
  "title": "A short, professional title for the brief (e.g. 'Cloud Security and IAM')",
  "definition": "A 2-3 sentence definition/synthesis explaining the topic based on the context documents.",
  "keyConcepts": [
    "Concept 1: Short description/context",
    "Concept 2: Short description/context",
    "Concept 3: Short description/context",
    "Concept 4: Short description/context"
  ],
  "applications": [
    "Application 1 details",
    "Application 2 details",
    "Application 3 details"
  ],
  "relatedTopics": [
    "Topic 1",
    "Topic 2",
    "Topic 3",
    "Topic 4"
  ],
  "followUps": [
    "A relevant follow-up question (e.g. 'What is IAM?')",
    "Another relevant follow-up question",
    "A third relevant follow-up question"
  ]
}

Only return the raw JSON object. Do not include markdown code block wraps (\`\`\`json).

Retrieved Context:
${context}
`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error) {
    console.error("Gemini briefing error:", error);
    res.status(500).json({ error: "Failed to generate AI summary: " + error.message });
  }
});

// Serve static assets from frontend (only if build folder exists)
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Fallback to index.html for React Router / SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Graceful root response in standalone API deployment
  app.get('/', (req, res) => {
    res.json({
      message: "Semantic Search Engine Node.js API",
      status: "online",
      backend: "Transformers.js (all-MiniLM-L6-v2) + Local Embeddings Cache"
    });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
