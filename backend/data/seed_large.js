import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '.');
const DOCUMENTS_CSV = path.join(DATA_DIR, 'documents.csv');

// Templates for categories
const data = {
  'AI': {
    subjects: ['Large Language Models', 'Retrieval-Augmented Generation', 'Agentic AI', 'Prompt Engineering', 'Generative Adversarial Networks', 'Transformers Architecture', 'Cognitive AI Agents', 'RLHF Alignment', 'Text-to-Image Diffusion', 'Vector Embeddings'],
    actions: ['optimizes context retrieval', 'enables autonomous reasoning', 'reshapes conversational applications', 'aligns neural model behaviors', 'translates unstructured text representations', 'mitigates demographic token bias', 'automates prompt sequence construction', 'handles continuous multi-turn conversations', 'generates synthetic code files', 'performs high-dimensional vector search'],
    techs: ['OpenAI GPT-4', 'Meta Llama 3', 'Google Gemini Pro', 'LangChain framework', 'LlamaIndex pipelines', 'HuggingFace pipelines', 'ChromaDB vectors', 'Stable Diffusion', 'Claude Sonnet', 'Mistral AI']
  },
  'ML': {
    subjects: ['Deep Neural Networks', 'Supervised Classifier Models', 'Gradient Boosting Machines', 'Convolutional Image Models', 'Recurrent sequence modeling', 'Clustering Algorithms', 'Anomaly detection networks', 'Hyperparameter tuning runs', 'Feature extraction pipelines', 'Linear regression baselines'],
    actions: ['minimizes loss function values', 'predicts categorical target variables', 'extracts spatial image features', 'captures historical time-series patterns', 'segments customer demographic groups', 'identifies out-of-distribution telemetry anomalies', 'optimizes network weight vectors', 'normalizes raw input distributions', 'prevents overfitting training splits', 'evaluates validation dataset accuracy'],
    techs: ['TensorFlow models', 'PyTorch runtime', 'Scikit-Learn estimators', 'XGBoost ensembles', 'Keras architectures', 'Pandas dataframes', 'NumPy operations', 'Matplotlib plots', 'Seaborn heatmaps', 'ONNX runtimes']
  },
  'Programming': {
    subjects: ['JavaScript Event Loop', 'TypeScript Type Constraints', 'Python Asyncio execution', 'React Virtual DOM', 'Rust memory safety lifetimes', 'Go concurrency channels', 'REST API designs', 'SOLID design patterns', 'Git branching pipelines', 'Docker container files'],
    actions: ['handles asynchronous network callbacks', 'prevents compilation syntax exceptions', 'implements reusable modular functions', 'manages local state synchronization', 'avoids thread race conditions', 'serializes structured JSON payloads', 'decouples service dependency layers', 'tracks code branch differences', 'packages portable microservices dependencies', 'accelerates compile execution benchmarks'],
    techs: ['NodeJS runtime', 'Vite bundle compiler', 'TypeScript compiler', 'FastAPI framework', 'Docker containers', 'Kubernetes clusters', 'ExpressJS middlewares', 'Redux state store', 'Pytest test suites', 'Rust Cargo compiler']
  },
  'Cloud': {
    subjects: ['Cloud Infrastructure Provisioning', 'Kubernetes Pod Orchestration', 'Serverless Functions Deployment', 'Multi-region load balancing', 'IAM Role permissions policies', 'Virtual Private Networks', 'Object Storage bucketing', 'Database replication clusters', 'CDN caching edges', 'CI/CD deployment pipelines'],
    actions: ['scales container workload counts', 'minimizes system response latency', 'manages elastic compute capacities', 'filters unauthorized network packets', 'replicates persistent data volumes', 'caches static assets globally', 'deploys cloud formation architectures', 'monitors server uptime telemetry', 'coordinates load distributing rules', 'automates container packaging builds'],
    techs: ['AWS EC2', 'Google Cloud GKE', 'Microsoft Azure VMs', 'Terraform scripts', 'Kubernetes charts', 'AWS Lambda', 'Cloudflare Workers', 'Docker Hub registers', 'Prometheus monitoring', 'Grafana dashboards']
  },
  'Data Engineering': {
    subjects: ['ETL Data Pipelines', 'Data Warehouse Schemas', 'Distributed Spark Jobs', 'Stream Processing Queues', 'Database Index Tuning', 'Parquet File partitioning', 'Data Lakehouse Architectures', 'Message Broker streams', 'Data Validation Quality', 'Relational database schemas'],
    actions: ['transforms batch text raw datasets', 'aggregates transactional metric rows', 'processes high-throughput event logs', 'optimizes sql query performance', 'prunes partitioned filesystem directories', 'cleans duplicate database records', 'syncs multi-source ingestion feeds', 'manages database transaction locks', 'logs schema evolution changes', 'enforces column validation schemas'],
    techs: ['Apache Spark clusters', 'Apache Kafka topics', 'Snowflake databases', 'PostgreSQL database', 'dbt transform projects', 'Apache Airflow DAGs', 'Apache Flink streams', 'Redis cache clusters', 'MongoDB documents', 'Databricks runtimes']
  }
};

const generateArticles = () => {
  const articles = [];
  let globalId = 1;
  const startDate = new Date('2025-12-01');

  Object.entries(data).forEach(([category, templates]) => {
    for (let i = 1; i <= 450; i++) {
      const subj = templates.subjects[i % templates.subjects.length];
      const action = templates.actions[(i + 3) % templates.actions.length];
      const tech = templates.techs[(i + 7) % templates.techs.length];

      // Assemble a rich unique title and content
      const title = `${subj} using ${tech} (Part ${i})`;
      const content = `${subj} represent a key methodology in modern system architectures. Implementing this with ${tech} effectively ${action}. This setup is highly performant, handles scaling gracefully, and is standard across industry applications. Practical integration requires configuring components, managing state, and testing edge cases.`;
      
      // Calculate a date within the past 180 days
      const daysOffset = Math.floor((i / 450) * 180);
      const pubDate = new Date(startDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
      const dateString = pubDate.toISOString().slice(0, 10);

      // Sizing of popularity (100 - 900)
      const popularity = 100 + ((i * 7 + 13) % 800);

      // Clean URL friendly slug
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const url = `https://example.com/${category.toLowerCase().replace(' ', '-')}/${slug}`;

      articles.push({
        id: globalId++,
        title,
        content,
        category,
        url,
        date: dateString,
        popularity
      });
    }
  });

  return articles;
};

const writeCsv = (articles) => {
  const headers = 'id,title,content,category,url,date,popularity\n';
  const escapeCsv = (str) => {
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = articles.map(a => 
    `${a.id},${escapeCsv(a.title)},${escapeCsv(a.content)},${a.category},${a.url},${a.date},${a.popularity}`
  ).join('\n') + '\n';

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DOCUMENTS_CSV, headers + rows, 'utf-8');
  console.log(`Successfully seeded ${articles.length} articles to ${DOCUMENTS_CSV}`);
};

const articles = generateArticles();
writeCsv(articles);
