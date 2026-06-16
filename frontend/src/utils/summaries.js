export const CURATED_SUMMARIES = {
  'prompt engineering': {
    title: 'Prompt Engineering Summary',
    definition: 'Prompt Engineering is the practice of structuring, refining, and optimizing natural language inputs (prompts) to direct Large Language Models (LLMs) toward generating high-quality, accurate, and contextually appropriate outputs.',
    keyConcepts: [
      'In-Context Learning (ICL): Teaching models via few-shot examples inside the prompt.',
      'Chain-of-Thought (CoT) Prompting: Encouraging the model to generate intermediate reasoning steps before the final answer.',
      'System Prompts: Defining the core persona, constraints, and instructions for the LLM.',
      'Prompt Optimization: Systematically evaluating and modifying templates to improve task accuracy.'
    ],
    applications: [
      'Automating prompt sequence construction for complex reasoning tasks.',
      'Standardizing LLM outputs in specific formats like JSON or SQL.',
      'Reducing hallucination rates in customer service chatbots and document search.',
      'Enabling tool use and function calling in agentic AI architectures.'
    ],
    relatedTopics: ['Large Language Models', 'Agentic AI', 'RAG (Retrieval-Augmented Generation)', 'System Prompts']
  },
  'rag': {
    title: 'RAG (Retrieval-Augmented Generation) Summary',
    definition: 'Retrieval-Augmented Generation (RAG) is a system architecture that optimizes LLM outputs by querying an authoritative, external knowledge base (usually a vector database) for relevant context before formulating a response.',
    keyConcepts: [
      'Document Chunking: Splitting long texts into semantic sections for retrieval.',
      'Vector Embeddings: Converting text chunks into mathematical vectors that capture semantic meaning.',
      'Dense Vector Search: Finding the most semantically similar chunks using similarity metrics like Cosine Distance.',
      'Generator Synthesis: Feeding retrieved passages into the LLM context to ground the generation.'
    ],
    applications: [
      'Enterprise search engines querying internal documents, wikis, and databases.',
      'Real-time Q&A assistants that access fresh, time-sensitive web information.',
      'Automated customer support tools grounded in product manuals and knowledge bases.',
      'Research analysis platforms summarizing large collections of academic papers.'
    ],
    relatedTopics: ['Vector Embeddings', 'Dense Vectors', 'Claude Sonnet RAG', 'LlamaIndex pipelines']
  },
  'agentic ai': {
    title: 'Agentic AI Summary',
    definition: 'Agentic AI refers to autonomous AI systems (agents) designed to solve complex, multi-step tasks by making independent decisions, calling external tools, and executing feedback loops.',
    keyConcepts: [
      'Reasoning Loop: Iterative processes (e.g., ReAct) where the agent plans, acts, and observes.',
      'Tool Integration: Giving agents access to APIs, search engines, compilers, and databases.',
      'Memory Management: Using short-term context windows and long-term vector stores to persist state.',
      'Multi-Agent Collaboration: Coordinating specialized agents to solve subproblems.'
    ],
    applications: [
      'Autonomous software development agents capable of writing, compiling, and debugging code.',
      'Advanced virtual assistants orchestrating travel bookings, emails, and calendar schedules.',
      'Automated financial analysis and trading systems executing data-driven strategies.',
      'Cognitive workflows coordinating data pipelines and research synthesis.'
    ],
    relatedTopics: ['Cognitive AI Agents', 'LangChain framework', 'Mistral AI Agents', 'Autonomous Agents']
  },
  'transformers': {
    title: 'Transformers Architecture Summary',
    definition: 'The Transformer is a deep learning architecture introduced in 2017 that relies on the self-attention mechanism to capture long-range dependencies in sequential data, forming the foundation of modern Large Language Models.',
    keyConcepts: [
      'Self-Attention Mechanism: Calculating the mathematical relevance of every word in a sequence relative to all others.',
      'Multi-Head Attention: Allowing the model to focus on different parts of the sequence simultaneously.',
      'Positional Encoding: Injecting order/position data into tokens since transformers process sequences in parallel.',
      'Encoder-Decoder Framework: Separating sequence comprehension (encoder) from sequence generation (decoder).'
    ],
    applications: [
      'Powering state-of-the-art LLMs (GPT-4, Gemini, Llama, Claude).',
      'Translating languages, summarizing texts, and autocomplete systems.',
      'Extending into computer vision (Vision Transformers) and audio analysis.',
      'Enabling high-fidelity molecular modeling and protein folding prediction.'
    ],
    relatedTopics: ['Google Gemini Pro', 'Xenova/all-MiniLM-L6-v2', 'Large Language Models', 'Attention Mechanism']
  },
  'machine learning': {
    title: 'Machine Learning Basics Summary',
    definition: 'Machine Learning (ML) is a branch of artificial intelligence focused on building algorithms that learn patterns from data to make predictions or decisions without being explicitly programmed.',
    keyConcepts: [
      'Supervised Learning: Training models on labeled data (e.g., classification, regression).',
      'Unsupervised Learning: Finding hidden structures in unlabeled data (e.g., clustering, PCA).',
      'Reinforcement Learning: Training agents to maximize cumulative reward through environment trials.',
      'Overfitting & Evaluation: Safeguarding models from memorizing training data using validation splits.'
    ],
    applications: [
      'Email spam filtering and automated classification systems.',
      'Product recommendations on streaming and e-commerce platforms.',
      'Fraud detection in banking and anomaly detection in industrial manufacturing.',
      'Medical diagnostics classifying imaging scans for clinical support.'
    ],
    relatedTopics: ['Neural Networks', 'Supervised Classifier Models', 'XGBoost', 'PyTorch and TensorFlow']
  }
};

export const getDynamicSummary = (query, results) => {
  const q = query.trim();
  
  // Format title
  const formattedTitle = q.split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') + ' Summary';

  // Try to build definition from top search results
  let definition = '';
  const topDoc = results[0];
  if (topDoc && topDoc.content) {
    // Take the first two sentences of the top matching document
    const sentences = topDoc.content.split(/[.!?]\s+/);
    definition = sentences.slice(0, 2).join('. ') + '.';
  } else {
    definition = `Synthesis of document search results matching query "${q}". These documents cover concepts within the ${results[0]?.category || 'general'} category.`;
  }

  // Key concepts: Extract names, tools or methods from titles of top documents
  const keyConcepts = results.slice(0, 4).map((doc) => {
    const cleanTitle = doc.title.replace(/\s*\(Part\s*\d+\)\s*/i, '');
    return `${cleanTitle}: Explore core configurations, setup methodologies, and systems integration details within this document.`;
  });

  // Applications: Use common system design application bullets based on category
  let applications = [
    'Integrating architectural elements and configuring core state interfaces.',
    'Enhancing scalability and performance profiles in standard production workflows.',
    'Validating edge cases and maintaining data layer interfaces.'
  ];
  if (results[0]?.category === 'AI' || results[0]?.category === 'ML') {
    applications = [
      'Automating complex tasks and enhancing interactive chat/reasoning flows.',
      'Structuring context retrieval pipelines to ground model outputs.',
      'Training and fine-tuning model behaviors via feedback iterations.'
    ];
  } else if (results[0]?.category === 'Programming' || results[0]?.category === 'Cloud') {
    applications = [
      'Writing testable, modular logic blocks to facilitate robust software architectures.',
      'Deploying services inside scalable microservice container topologies.',
      'Optimizing async execution flows, resource handlers, and data mapping modules.'
    ];
  }

  // Related topics: Extract unique categories or terms from search results
  const relatedTopicsSet = new Set();
  results.slice(0, 6).forEach(doc => {
    if (doc.category) relatedTopicsSet.add(doc.category);
    const terms = doc.title.split(' using ')[0].split(' ');
    if (terms.length > 0) {
      relatedTopicsSet.add(terms[0]);
    }
  });
  const relatedTopics = Array.from(relatedTopicsSet).slice(0, 4);

  return {
    title: formattedTitle,
    definition,
    keyConcepts,
    applications,
    relatedTopics
  };
};

export const getFollowUpQuestions = (category, query) => {
  const cat = (category || 'AI').toUpperCase();
  const q = query.toLowerCase();
  
  if (cat === 'CLOUD' || q.includes('cloud') || q.includes('iam') || q.includes('k8s')) {
    return [
      'What is IAM?',
      'Explain GKE in simple words.',
      'Compare IAM vs RBAC.'
    ];
  }
  if (cat === 'AI' || q.includes('prompt') || q.includes('rag') || q.includes('agent')) {
    return [
      'What is Retrieval-Augmented Generation (RAG)?',
      'Explain Chain-of-Thought prompting in simple words.',
      'Compare GPT-4 vs Claude Sonnet for code.'
    ];
  }
  if (cat === 'ML' || q.includes('learning') || q.includes('model')) {
    return [
      'What is Overfitting in machine learning?',
      'Explain gradient boosting in simple words.',
      'Compare PyTorch vs TensorFlow models.'
    ];
  }
  if (cat === 'PROGRAMMING' || q.includes('js') || q.includes('react') || q.includes('typescript')) {
    return [
      'What are Mapped Types in TypeScript?',
      'Explain JavaScript Event Loop in simple words.',
      'Compare REST API vs GraphQL query performance.'
    ];
  }
  if (cat === 'DATA ENGINEERING' || q.includes('spark') || q.includes('etl') || q.includes('database')) {
    return [
      'What is ACID compliance in Delta Lake?',
      'Explain Spark Broadcast Joins in simple words.',
      'Compare Snowflake schemas vs BigQuery partitioning.'
    ];
  }
  
  // Default fallback questions
  return [
    `How does ${query} work under the hood?`,
    `What are the production best practices for ${query}?`,
    `Compare different tools used for ${query}.`
  ];
};
