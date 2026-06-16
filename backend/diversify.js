import fs from 'fs';
import path from 'path';

const OUTPUT_PATH = './data/documents.csv';

// Base topics definitions per category (25 topics per category)
const TOPICS = {
  AI: [
    {
      topic: 'Retrieval-Augmented Generation',
      slug: 'retrieval-augmented-generation',
      tools: ['Pinecone', 'LlamaIndex', 'ChromaDB', 'Weaviate'],
      snippets: [
        'Retrieval-Augmented Generation (RAG) integrates Pinecone vector index queries with dense retrieval. By chunking text documents, encoding them, and fetching context passages via Cosine Similarity, the LLM prompt is augmented with factual sources to dramatically reduce hallucination rates.',
        'Implementing RAG using LlamaIndex allows automatic query translation and metadata filtering. Feeding document structures into index nodes ensures structured context parsing, maintaining hierarchical relations for precise answer synthesis in production.',
        'ChromaDB-based RAG workflows scale local embeddings using lightweight SQLite vector stores. Chunking documents using recursive character separators preserves code block structures, enabling high-fidelity software documentation Q&A pipelines.',
        'Weaviate RAG architectures leverage sparse-dense hybrid search (BM25 + vector). Combining keyword token matching with dense embeddings provides a balanced score, resolving exact technical terms while capturing semantic concept intent.'
      ]
    },
    {
      topic: 'Agentic Decision Loops',
      slug: 'agentic-decision-loops',
      tools: ['LangChain', 'CrewAI', 'AutoGen', 'Semantic Kernel'],
      snippets: [
        'Agentic AI loops built in LangChain leverage ReAct (Reasoning and Acting) patterns. By structuring prompt reasoning steps alongside tool binders, agents decide dynamically when to invoke database API endpoints and when to synthesize responses.',
        'CrewAI multi-agent orchestrations coordinate specialized agent personas. Defining specific tasks, role boundaries, and shared memory contexts allows complex software engineering requirements to be decomposed and solved cooperatively.',
        'AutoGen architectures enable conversational multi-agent dialogue loops. Designing automated executor and coding agents lets the system write, execute, and debug code modules locally until test coverage standards are satisfied.',
        'Semantic Kernel integrates native function calling with AI planner interfaces. Exposing business logic schemas as tools allows models to schedule multi-step task execution chains while adhering to strict security parameters.'
      ]
    },
    {
      topic: 'Prompt Engineering Optimization',
      slug: 'prompt-engineering',
      tools: ['GPT-4o', 'Claude Sonnet', 'Gemini Pro', 'Mistral Large'],
      snippets: [
        'Prompt engineering on GPT-4o benefits from structured system instructions and Chain-of-Thought (CoT) formatting. Forcing the model to output its intermediate reasoning schema step-by-step increases math and logical reasoning output scores.',
        'Claude Sonnet prompts benefit from XML tag segmentation. Separating system guidelines, prompt variables, and few-shot examples using brackets reduces context confusion and ensures high compliance with JSON schema outputs.',
        'Gemini Pro prompt workflows leverage broad context windows by loading entire API manuals directly. Applying needle-in-a-haystack verification structures guarantees retrieval accuracy across million-token document stores.',
        'Mistral Large prompting workflows optimize few-shot context examples. Ordering prompt examples by semantic distance improves model behavior alignment and stabilizes categorical output classifications.'
      ]
    },
    {
      topic: 'Vector Embedding Alignment',
      slug: 'vector-embeddings',
      tools: ['OpenAI text-embedding-3', 'Cohere Embed v3', 'HuggingFace all-MiniLM', 'Voyage AI'],
      snippets: [
        'OpenAI text-embedding-3 models generate high-dimensional vectors that support dimension truncation. Reducing dimensions from 3072 to 1024 via PCA-aligned projections preserves 99% of similarity metrics while reducing storage costs.',
        'Cohere Embed v3 optimizes vector representations for compression and classification. Using binary quantization matches floating-point search accuracy in memory-constrained vector indexes, saving significant hardware overhead.',
        'HuggingFace all-MiniLM-L6-v2 runs locally to generate 384-dimensional embeddings. Designed for lightweight runtime environments, this transformer model provides sub-millisecond encoding speeds for semantic document search.',
        'Voyage AI domain-specific embedding models are fine-tuned for code search. Capturing structural syntax mapping increases code snippet retrieval precision compared to general-purpose text embedding networks.'
      ]
    },
    {
      topic: 'Model Evaluation Metrics',
      slug: 'model-evaluation',
      tools: ['Ragas', 'Promptfoo', 'LangSmith', 'Phoenix'],
      snippets: [
        'Ragas evaluates RAG pipeline metrics including faithfulness, answer relevance, and context recall. Scoring synthetic test sets identifies weak retrieval nodes and guides embedding chunk configuration changes.',
        'Promptfoo automates CI/CD prompt assertion testing. Defining strict regex, Webhook, and semantic model validations prevents prompt regressions when deploying new system instructions to production clients.',
        'LangSmith monitors trace logic across complex LLM execution graphs. Inspecting token latencies and prompt inputs across individual database loops highlights backend processing bottlenecks.',
        'Phoenix provides real-time clustering analytics of user queries. Visualizing high-dimensional embeddings highlights areas where the system yields poor answers, pinpointing missing corpus topics.'
      ]
    },
    {
      topic: 'Context Window Constraints',
      slug: 'context-window-constraints',
      tools: ['RoPE scaling', 'FlashAttention', 'Ring Attention', 'State Space Models'],
      snippets: [
        'Rotary Position Embedding (RoPE) scaling extends sequence lengths in transformer models. Dynamically adjusting base frequencies allows models to process long texts beyond original pre-training thresholds.',
        'FlashAttention optimizes CUDA memory access patterns for self-attention layers. Reducing intermediate matrix read-writes speed up processing speeds by 3x on modern tensor core hardware layouts.',
        'Ring Attention scales contexts to millions of tokens across distributed hardware clusters. Sharding sequence attention matrices across network rings removes single-node memory barriers.',
        'State Space Models (SSMs) process sequences in linear time complexity. Replacing traditional self-attention with continuous state representations enables infinite sequence length tracking without quadratic memory scaling.'
      ]
    },
    {
      topic: 'System Persona Guidelines',
      slug: 'system-personas',
      tools: ['System Prompts', 'Config Schemas', 'API Constraints', 'Safety Filters'],
      snippets: [
        'System prompt boundaries restrict LLM actions to specific tasks. Setting strict rules regarding output tone, safety guidelines, and persona constraints prevents social engineering jailbreaks.',
        'Configuring system prompt templates dynamically injects real-time date metadata. Grounding models with current time contexts ensures relative recency queries (e.g., "last week") parse correctly.',
        'API constraints map natural language model intents to rigid function signatures. Providing explicit TypeScript schemas inside system contexts forces clean JSON outputs.',
        'Deploying safety filter systems overrides model generation on sensitive inputs. Parsing output tokens against toxicity vectors prevents harmful or offensive response delivery.'
      ]
    },
    {
      topic: 'Few-Shot Learning Patterns',
      slug: 'few-shot-learning',
      tools: ['Instruction Tuning', 'Context Retrieval', 'In-Context Examples', 'Token Buffers'],
      snippets: [
        'Few-shot learning injects raw task input-output examples directly into context. Providing three to five highly diverse test examples steers generation style without updating underlying network weights.',
        'Dynamic context retrieval fetches few-shot examples that match the user query. Semantic search indexes past query-answer logs to inject the most relevant demonstrations into the prompt.',
        'Formatting in-context examples requires strict delimiters to prevent target confusion. Using clear separators prevents models from mixing example inputs with real prompt instructions.',
        'Managing few-shot token buffers balances example diversity against context limits. Pruning long examples ensures adequate workspace remains for generation tasks.'
      ]
    },
    {
      topic: 'Semantic Query Routing',
      slug: 'semantic-query-routing',
      tools: ['Semantic Router', 'LangChain Router', 'LiteLLM', 'Custom Embeddings'],
      snippets: [
        'Semantic Router routes queries using embedding similarity thresholds. Bypassing expensive LLM evaluations for common intent categories routes traffic in milliseconds.',
        'LangChain router chains combine classification prompts with execution paths. Directing complex commands to specialized sub-agents yields optimal execution performance.',
        'LiteLLM standardizes routing models across multiple upstream API vendors. Load-balancing traffic across fallback servers ensures high availability and cost optimization.',
        'Custom embedding routers map queries to semantic clusters representing index paths. Classifying query embeddings with SVMs determines the best search corpus.'
      ]
    },
    {
      topic: 'Graph RAG Systems',
      slug: 'graph-rag',
      tools: ['Neo4j', 'FalkorDB', 'LangChain Graph', 'NetworkX'],
      snippets: [
        'Neo4j integration enables Graph RAG by combining vector indexing with graph traversals. Querying entity relations alongside text search links disconnected document insights.',
        'FalkorDB speeds up Graph RAG workflows by keeping knowledge graphs in memory. Graph queries return entity linkages in milliseconds, ideal for real-time applications.',
        'LangChain Graph components convert unstructured texts into structured triples (Subject-Predicate-Object). Visualizing these connections uncovers deep network relationships.',
        'NetworkX analysis scripts cluster text segments based on semantic graph density. Structuring text hierarchies around key nodes improves summarization accuracy.'
      ]
    },
    {
      topic: 'Synthetic Dataset Gen',
      slug: 'synthetic-data-generation',
      tools: ['LLM pipelines', 'Bias Scrubber', 'Format Validators', 'Scale Scripts'],
      snippets: [
        'Generating synthetic training sets requires strict variation parameters. Prompting LLMs to write code scripts using different structures increases model coverage.',
        'Bias scrubbers clean synthetic data by removing repetitive phrases and patterns. Validating data diversity maintains performance when training sub-models.',
        'Format validators check synthetic records against rigid JSON schemas. Discarding invalid generations maintains data quality across pipeline datasets.',
        'Scaling script workflows generate thousands of synthetic text records concurrently. Managing task limits prevents API throttling during execution runs.'
      ]
    },
    {
      topic: 'Attention Layer Details',
      slug: 'attention-layers',
      tools: ['Multi-Head Attention', 'Self-Attention', 'Grouped-Query Attention', 'Sparse Attention'],
      snippets: [
        'Multi-Head Attention projects query, key, and value vectors into multiple subspaces. Learning diverse contextual mappings captures complex grammatical dependencies.',
        'Self-Attention computes semantic alignment scores across all words in a sequence. Generating correlation matrices allows tokens to aggregate context information dynamically.',
        'Grouped-Query Attention (GQA) reduces key-value memory overhead in large LLMs. Sharing key-value heads across multiple query heads speeds up inference speeds.',
        'Sparse Attention limits attention calculations to a subset of token pairs. Restricting sequence processing grids allows models to process long texts efficiently.'
      ]
    },
    {
      topic: 'Text-to-SQL Pipelines',
      slug: 'text-to-sql',
      tools: ['Vanna.ai', 'SQLAlchemy', 'Postgres Schema', 'Prompt Templates'],
      snippets: [
        'Vanna.ai integrates vector search with text-to-SQL pipelines. Storing schema definitions, DDL files, and golden query templates retrieves accurate SQL schemas.',
        'SQLAlchemy wrappers validate generated SQL commands prior to execution. Parsing queries in sandboxed environments prevents destructive execution runs.',
        'Postgres schema design for LLMs includes comprehensive column descriptions. Providing explicit comments on foreign keys improves foreign table join accuracy.',
        'Prompt templates for database generation require schema declarations. Demarcating input limits and query rules prevents SQL injection attempts.'
      ]
    },
    {
      topic: 'Router Architectures',
      slug: 'router-architectures',
      tools: ['MoE Routers', 'Proxy Servers', 'Fallback Gates', 'API Gateways'],
      snippets: [
        'Mixture of Experts (MoE) routers direct token processing to specialized expert networks. Dynamically gating active layers maintains high quality while cutting compute costs.',
        'Proxy servers distribute LLM requests across global API endpoints. Handling rate limits on proxy layers guarantees service availability.',
        'Fallback gates route failed API queries to secondary models. Catching timeout events on fallback gates preserves user session state.',
        'API gateways secure routing pipelines with authentication scopes. Gating user access limits abuse on public vector search services.'
      ]
    },
    {
      topic: 'Guardrails & Safety',
      slug: 'guardrails-safety',
      tools: ['Llama Guard', 'NeMo Guardrails', 'Perspective API', 'Moderation API'],
      snippets: [
        'Llama Guard classifies prompt queries against pre-defined safety categories. Gating inputs prior to LLM evaluation prevents prompt injection and abuse.',
        'NeMo Guardrails enforces structure compliance on model outputs. Restricting dialogue state updates prevents models from violating system boundaries.',
        'Perspective API evaluates toxicity metrics of text segments. Flagging high-probability toxicity tags filters harmful chat histories.',
        'OpenAI Moderation API provides classification for dangerous inputs. Utilizing moderation endpoints ensures compliance with platform safety policies.'
      ]
    },
    {
      topic: 'Embedding Model Tuning',
      slug: 'embedding-model-tuning',
      tools: ['SentenceTransformers', 'Contrastive Loss', 'Matryoshka Embeddings', 'Triplet Loss'],
      snippets: [
        'SentenceTransformers training loops fine-tune embeddings on domain corpus files. Adding custom linear layers aligns representations for specific search terms.',
        'Contrastive loss optimizes vector distances during model training. Minimizing distance between positive pairs while pushing negative pairs apart improves retrieval.',
        'Matryoshka Representation Learning trains embeddings that retain utility across truncated sizes. Storing smaller prefix vectors reduces index storage overhead.',
        'Triplet loss aligns embedding clusters using anchor, positive, and negative inputs. Maximizing marginal separation groups related articles cleanly.'
      ]
    },
    {
      topic: 'Tokenizer Efficiency',
      slug: 'tokenizer-efficiency',
      tools: ['Byte-Pair Encoding', 'SentencePiece', 'Tiktoken', 'WordPiece'],
      snippets: [
        'Byte-Pair Encoding (BPE) compiles characters into optimal token vocabularies. Iteratively merging frequent character sequences maximizes token utility.',
        'SentencePiece tokenizes texts without pre-defining whitespace boundaries. Treating text as unicode sequences simplifies multilingual tokenizer configuration.',
        'Tiktoken implements fast BPE tokenization for OpenAI model architectures. High-speed Rust processing loops compress raw strings in microseconds.',
        'WordPiece splits words into sub-word tokens using statistical likelihood metrics. Capturing prefix configurations improves rare term indexing.'
      ]
    },
    {
      topic: 'Model Quantization',
      slug: 'model-quantization',
      tools: ['AWQ quantization', 'GPTQ methods', 'GGUF formats', 'BitsAndBytes'],
      snippets: [
        'Activation-aware Weight Quantization (AWQ) protects salient weights during quantization. Compressing LLMs to 4-bit representation preserves model accuracy.',
        'GPTQ calibration processes weights row-by-row to minimize quantization errors. Compressing large weights allows execution on single consumer graphics cards.',
        'GGUF formatting packages model weights, tokenizers, and metadata into unified files. Supporting CPU-GPU memory sharding runs local LLMs efficiently.',
        'BitsAndBytes provides 8-bit and 4-bit matrix multiplication kernels. Dynamically loading quantized layers cuts GPU memory footprint during inference.'
      ]
    },
    {
      topic: 'Multi-Modal Pipelines',
      slug: 'multi-modal-pipelines',
      tools: ['CLIP models', 'LLaVA model', 'Vision Transformers', 'Vector Search'],
      snippets: [
        'CLIP models project image and text tokens into a shared vector space. Calculating similarity scores between images and texts enables cross-modal search.',
        'LLaVA architecture integrates vision encoders with language decoders. Processing combined image-text prompts enables natural image descriptions.',
        'Vision Transformers (ViT) process images as grids of localized patches. Applying self-attention layer tracks structural correlations within image segments.',
        'Vector search indexes multi-modal embeddings within unified databases. Querying visual datasets with natural descriptions retrieves matched files.'
      ]
    },
    {
      topic: 'Autonomous Coding Agents',
      slug: 'coding-agents',
      tools: ['Swe-bench', 'Docker Sandboxes', 'Git workflows', 'AST Parsers'],
      snippets: [
        'Swe-bench benchmark tests coding agents on real GitHub issues. Resolving complete repository bugs requires planning, tool use, and debugging loops.',
        'Docker sandboxes isolate coding agent execution environments. Running untested code within isolated containers prevents host system compromises.',
        'Git workflow agents automate pull request loops. Generating branches, staging modifications, and pushing revisions handles automated maintenance tasks.',
        'AST parsers evaluate syntax validity of agent-written code blocks. Inspecting abstract syntax trees identifies syntax issues prior to compilation.'
      ]
    },
    {
      topic: 'Memory Store Design',
      slug: 'memory-stores',
      tools: ['Redis Vector', 'Zep Memory', 'LangChain Memory', 'DynamoDB'],
      snippets: [
        'Redis vector indexing stores active conversation sessions with semantic layers. Querying history logs based on cosine distance brings relevant memories into context.',
        'Zep memory microservices manage and enrich LLM conversation logs. Automatically summarizing old messages keeps history sizes optimized.',
        'LangChain memory buffers serialize chat transcripts for LLM inputs. Selecting windowed history structures matches token limit configurations.',
        'DynamoDB tables store durable session histories for distributed apps. Fetching transcripts using partition keys scales session tracking.'
      ]
    },
    {
      topic: 'Function Calling Tools',
      slug: 'function-calling',
      tools: ['JSON Schemas', 'Tool Binders', 'Response Parsers', 'Type Guards'],
      snippets: [
        'JSON schemas define available function tools for LLM generation. Structuring explicit argument parameter requirements avoids parsing issues.',
        'Tool binders link custom Python code functions to model APIs. Exposing docstrings as tool descriptions helps models select correct utilities.',
        'Response parsers extract function call arguments from raw LLM streams. Converting output syntax formats ensures arguments process cleanly.',
        'Type guards validate LLM tool parameters at runtime. Gating function arguments against validation definitions prevents script crashes.'
      ]
    },
    {
      topic: 'Mixture of Experts',
      slug: 'mixture-of-experts',
      tools: ['Routing Networks', 'Sparse Layers', 'DeepSeek MoE', 'Mixtral 8x7B'],
      snippets: [
        'Routing networks decide token allocation across Expert layers. Distributing compute workloads keeps total parameters manageable.',
        'Sparse Expert layers process subsets of activation arrays. Activating specific layer indices cuts total compute requirements.',
        'DeepSeek MoE structures expert layers into fine-grained modules. Allocating base experts alongside shared parameters improves reasoning.',
        'Mixtral 8x7B shards layers into 8 distinct expert units. Activating 2 experts per token balances inference speeds with accuracy.'
      ]
    },
    {
      topic: 'RLHF Alignment loops',
      slug: 'rlhf-alignment',
      tools: ['PPO training', 'DPO methods', 'Reward Models', 'KTO alignment'],
      snippets: [
        'Proximal Policy Optimization (PPO) aligns model generation via reinforcement learning. Calculating policy gradients against reward feedback improves output quality.',
        'Direct Preference Optimization (DPO) optimizes model behavior directly on pairwise preferences. Bypassing reward model training simplifies alignment runs.',
        'Reward models score LLM completions on criteria like helpfulness. Training classification networks on human evaluations automates feedback.',
        'Kahneman-Tversky Optimization (KTO) aligns models using binary feedback flags. Optimizing generation utilities on binary flags avoids pairwise data requirements.'
      ]
    },
    {
      topic: 'Prompt Injection Safety',
      slug: 'prompt-injection-safety',
      tools: ['Input Sanitizers', 'Delimiter Enforcements', 'Instruction Isolation', 'LLM Evaluators'],
      snippets: [
        'Input sanitizers filter malicious query patterns. Removing escape sequences and prompt keywords blocks model instruction overrides.',
        'Delimiter enforcements wrap user inputs in random tokens. Clearly separating user inputs from system guidelines prevents model confusion.',
        'Instruction isolation patterns restrict model execution permissions. Confining user inputs to strict variable boxes blocks injection attempts.',
        'LLM evaluator scripts analyze final prompts for injection behaviors. Gating prompt setups prior to processing catches safety threats.'
      ]
    }
  ],
  ML: [
    {
      topic: 'XGBoost Classification',
      slug: 'xgboost-classification',
      tools: ['scikit-learn', 'XGBClassifier', 'DMatrix format', 'Optuna tuning'],
      snippets: [
        'XGBoost classification models build gradient-boosted decision trees. Computing split structures based on gradient scores minimizes target errors.',
        'XGBClassifier wraps core tree boosting algorithms in scikit-learn APIs. Fitting models on training arrays generates quick predictions.',
        'DMatrix formats optimize memory layout structures for XGBoost training. Loading columns into cache-aligned arrays speeds up compute runs.',
        'Optuna tuning scripts find best hyperparameter ranges for XGBoost classifiers. Iterating on parameters like max_depth maximizes accuracy.'
      ]
    },
    {
      topic: 'PyTorch Deep Learning',
      slug: 'pytorch-deep-learning',
      tools: ['nn.Module', 'AdamOptimizer', 'DataLoader loops', 'Tensor sharding'],
      snippets: [
        'PyTorch deep learning architectures inherit from nn.Module interfaces. Overriding forward execution maps computational graph connections.',
        'AdamOptimizer dynamically scales learning rates for network weights. Tracking gradient statistics helps models converge efficiently.',
        'DataLoader loops manage batch sharding and worker thread logistics. Pre-fetching input batches onto hardware caches avoids training delays.',
        'Tensor sharding splits model weight layers across multiple compute cards. Synchronizing parameters with communication loops scales training.'
      ]
    },
    {
      topic: 'TensorFlow Classification',
      slug: 'tensorflow-classification',
      tools: ['Keras sequential', 'Conv2D layers', 'TFRecord files', 'TensorBoard'],
      snippets: [
        'Keras sequential models construct multi-layer classification networks. Stacking fully connected layers maps inputs to output classes.',
        'Conv2D layers apply spatial filter matrices to image arrays. Extracting local image patterns enables visual representation learning.',
        'TFRecord files organize datasets into sequential binary records. Streaming large datasets using tf.data APIs bypasses local storage limits.',
        'TensorBoard logs training metrics and loss statistics for active runs. Visualizing weight distributions tracks model convergence.'
      ]
    },
    {
      topic: 'Scikit-Learn Clustering',
      slug: 'scikit-learn-clustering',
      tools: ['KMeans', 'DBSCAN', 'Silhouette metrics', 'PCA decomposition'],
      snippets: [
        'KMeans partitions datasets into clusters by minimizing distance to centroids. Iteratively updating centroid coordinates groups similar samples.',
        'DBSCAN identifies clusters based on sample density patterns. Defining epsilon distance thresholds groups samples while identifying noise points.',
        'Silhouette scores evaluate cluster separation quality. Measuring average distance to internal samples vs neighbor clusters checks grouping accuracy.',
        'PCA decomposition scales high-dimensional data arrays to lower projections. Visualizing principal components highlights major variance patterns.'
      ]
    },
    {
      topic: 'Feature Engineering',
      slug: 'feature-engineering',
      tools: ['Target Encoding', 'OneHotEncoder', 'PolynomialFeatures', 'Imputer classes'],
      snippets: [
        'Target encoding replaces category values with mean target rates. Incorporating category statistics improves classification model metrics.',
        'OneHotEncoder transforms categorical features into sparse binary grids. Mapping values to columns prevents artificial ordering issues.',
        'PolynomialFeatures generates cross-product terms from numeric features. Capturing non-linear interactions improves model fitting.',
        'Imputer classes handle missing data values using mean statistics. Filling missing inputs prevents pipeline failures during fitting.'
      ]
    },
    {
      topic: 'Hyperparameter Tuning',
      slug: 'hyperparameter-tuning',
      tools: ['GridSearchCV', 'RandomizedSearchCV', 'Optuna framework', 'Ray Tune'],
      snippets: [
        'GridSearchCV performs exhaustive parameter sweeps over search grids. Evaluating parameters via cross-validation identifies optimal estimators.',
        'RandomizedSearchCV samples parameter configurations from distributions. Searching random parameters limits training time costs.',
        'Optuna framework implements Bayesian search algorithms for parameter tuning. Directing search budgets to promising options improves accuracy.',
        'Ray Tune coordinates distributed parameter tuning across server groups. Running training loops concurrently cuts optimization time.'
      ]
    },
    {
      topic: 'Regularization Methods',
      slug: 'regularization-methods',
      tools: ['L1 Lasso', 'L2 Ridge', 'ElasticNet', 'Dropout layers'],
      snippets: [
        'L1 Lasso regularization adds absolute parameter penalties to loss. Shrinking non-essential weights to zero performs automatic feature selection.',
        'L2 Ridge regularization adds squared parameter penalties to loss functions. Constraining weight magnitudes prevents overfitting issues.',
        'ElasticNet combines L1 and L2 penalties into single loss calculations. Balancing penalties groups correlated variables efficiently.',
        'Dropout layers randomly disable model connections during training iterations. Forcing the network to learn redundant representations stabilizes accuracy.'
      ]
    },
    {
      topic: 'Gradient Descent Optimizers',
      slug: 'gradient-descent-optimizers',
      tools: ['SGD', 'RMSprop', 'AdamW', 'AdaGrad'],
      snippets: [
        'Stochastic Gradient Descent (SGD) updates parameters using single batch steps. Adding momentum parameters prevents getting stuck in local minima.',
        'RMSprop adjusts learning rates using root mean square gradient stats. Scaling updates prevents exploding gradients during RNN training.',
        'AdamW decouples weight decay steps from gradient update calculations. Correcting weight decay steps improves general training outputs.',
        'AdaGrad adapts learning rates by tracking historical squared gradients. Scaling updates down for frequent features handles sparse data sets.'
      ]
    },
    {
      topic: 'Time Series Forecasting',
      slug: 'time-series-forecasting',
      tools: ['Prophet', 'ARIMA models', 'LSTM layers', 'Temporal Fusion'],
      snippets: [
        'Prophet model algorithms forecast seasonal trends using additive parameters. Handling calendar changes and holidays simplifies setup.',
        'ARIMA models capture autoregressive and moving average patterns. Differencing non-stationary data trends stabilizes predictions.',
        'LSTM networks track sequential dependencies across historical timelines. Retaining memory vectors across steps resolves vanishing gradients.',
        'Temporal Fusion Transformers integrate multi-horizon forecasting tasks. Attention layers weigh importance of historic inputs.'
      ]
    },
    {
      topic: 'Dimensionality Reduction',
      slug: 'dimensionality-reduction',
      tools: ['t-SNE', 'UMAP', 'PCA', 'Autoencoders'],
      snippets: [
        't-SNE visualizes high-dimensional datasets by projecting similarity probabilities. Mapping samples to 2D plots shows local groupings.',
        'UMAP preserves global dataset structures while scaling down dimension sizes. Graph projections run faster than t-SNE algorithms.',
        'PCA projects dataset coordinates onto orthogonal variance vectors. Retaining primary components captures primary information.',
        'Autoencoders compress input data arrays using bottleneck layer networks. Reconstructing inputs from bottleneck layers learns optimal vectors.'
      ]
    },
    {
      topic: 'Anomaly Detection Loops',
      slug: 'anomaly-detection',
      tools: ['Isolation Forest', 'One-Class SVM', 'Local Outlier Factor', 'Elliptic Envelope'],
      snippets: [
        'Isolation Forest isolates anomaly records using decision trees. Shorter paths to samples indicate high probability of anomalies.',
        'One-Class SVM classifies normal data boundaries within high dimensions. Identifying border areas flags out-of-distribution values.',
        'Local Outlier Factor (LOF) calculates local density scores for samples. Lower density relative to neighbors indicates outliers.',
        'Elliptic Envelope fits robust covariance estimators to normal data. Assuming Gaussian data outlines clean outlier thresholds.'
      ]
    },
    {
      topic: 'Cross-Validation Splits',
      slug: 'cross-validation',
      tools: ['KFold', 'StratifiedKFold', 'TimeSeriesSplit', 'GroupKFold'],
      snippets: [
        'KFold shards datasets into equal cross-validation splits. Testing models on hold-out splits yields unbiased accuracy estimates.',
        'StratifiedKFold maintains class ratio balances across cross-validation splits. Essential for unbalanced datasets, it ensures valid metrics.',
        'TimeSeriesSplit respects temporal order when cross-validating historical datasets. Using rolling history folds prevents future data leakage.',
        'GroupKFold prevents training on groups present in validation folds. Evaluating models on unseen groups tests generalization.'
      ]
    },
    {
      topic: 'Ensemble Learning Tools',
      slug: 'ensemble-learning',
      tools: ['VotingClassifier', 'StackingRegressor', 'Random Forest', 'AdaBoost'],
      snippets: [
        'VotingClassifier averages predictions from multiple independent classifiers. Combining predictions offsets errors from individual models.',
        'StackingRegressor trains meta-estimators on validation predictions. Combining different model formats yields optimal targets.',
        'Random Forest trains multiple decision trees using bootstrap aggregation. Averaging outputs limits variance without increasing bias.',
        'AdaBoost trains decision trees sequentially by increasing weights on errors. Emphasizing hard cases stabilizes weak models.'
      ]
    },
    {
      topic: 'Decision Tree Splitting',
      slug: 'decision-trees',
      tools: ['Gini Impurity', 'Entropy', 'Information Gain', 'MSE split'],
      snippets: [
        'Gini Impurity measures probability of incorrect classification at nodes. Minimizing index scores generates optimal tree splits.',
        'Entropy measures system uncertainty within dataset split targets. Selecting split directions that maximize information gain refines nodes.',
        'Information Gain computes entropy drops across split candidate options. Higher values indicate clean feature divisions.',
        'MSE split criteria evaluate variance drops in regression trees. Minimizing squared errors at nodes selects best split values.'
      ]
    },
    {
      topic: 'Logistic Regression Baselines',
      slug: 'logistic-regression',
      tools: ['Sigmoid function', 'Binary Cross-Entropy', 'LBFGS solver', 'ROC AUC'],
      snippets: [
        'Logistic regression applies sigmoid transformations to linear scores. Mapping predictions to probability scales targets binary outcomes.',
        'Binary Cross-Entropy measures distance between actual classes and probabilities. Minimizing loss optimizes baseline regression weights.',
        'LBFGS solvers approximate second derivative statistics for optimization. Solving baseline weights converges rapidly in limited memory.',
        'ROC AUC evaluates baseline performance across classification thresholds. Checking true vs false positive rates checks model separation.'
      ]
    },
    {
      topic: 'Model Calibration loops',
      slug: 'model-calibration',
      tools: ['Platt Scaling', 'Isotonic Regression', 'Brier Score', 'Calibration Curves'],
      snippets: [
        'Platt Scaling calibrates classification probabilities using logistic transformations. Aligning outputs ensures probability scores reflect real frequencies.',
        'Isotonic Regression fits non-parametric monotonic curves to calibrate predictions. Realizing calibration transformations handles non-linear errors.',
        'Brier Score calculates mean squared errors of predicted probabilities. Lower scores indicate well-calibrated confidence outputs.',
        'Calibration curves plot actual fractions of positives against predictions. Checking plots shows systematic confidence issues.'
      ]
    },
    {
      topic: 'Confusion Matrix Metrics',
      slug: 'confusion-matrix',
      tools: ['Precision & Recall', 'F1-Score', 'True Positives', 'Matthews Correlation'],
      snippets: [
        'Confusion matrices partition predictions into true and false coordinates. Tracking classification details guides performance changes.',
        'Precision measures actual positive ratios, while Recall tracks captured targets. Balancing metrics avoids high false positive rates.',
        'F1-Score calculates harmonic means of Precision and Recall. Using F1 scores checks model quality on imbalanced sets.',
        'Matthews Correlation Coefficient (MCC) tracks all four matrix quadrants. MCC checks classification performance regardless of class splits.'
      ]
    },
    {
      topic: 'ONNX Model Conversion',
      slug: 'onnx-conversion',
      tools: ['onnxmltools', 'tf2onnx', 'ONNX Runtime', 'TensorRT'],
      snippets: [
        'onnxmltools converts scikit-learn models into standardized ONNX formats. Defining input shapes enables cross-platform predictions.',
        'tf2onnx serializes TensorFlow computation graphs into ONNX formats. Optimizing operators speeds up model deployment.',
        'ONNX Runtime runs model inferences on target CPU and GPU devices. Standardizing runtimes speeds up production performance.',
        'TensorRT compilation optimizes ONNX networks on target hardware. Sharding layers to tensor engines maximizes execution speeds.'
      ]
    },
    {
      topic: 'Reinforcement Learning',
      slug: 'reinforcement-learning',
      tools: ['Q-Learning', 'Gymnasium environments', 'DQN networks', 'Policy Gradients'],
      snippets: [
        'Q-Learning updates state-action tables using temporal difference steps. Maximizing expected rewards selects optimal actions.',
        'Gymnasium environments standardize interface structures for reinforcement learning. Exposing state steps and rewards structures agent trials.',
        'Deep Q-Networks (DQN) approximate action-value tables using neural networks. Replay buffers stabilize network convergence.',
        'Policy gradient methods optimize action probability distributions directly. Gating updates with advantage metrics handles complex environments.'
      ]
    },
    {
      topic: 'Data Leakage Prevention',
      slug: 'data-leakage',
      tools: ['Pipeline class', 'ColumnTransformer', 'Feature scaling', 'Target masking'],
      snippets: [
        'Scikit-learn Pipeline classes chain processing steps with model training. Preventing data leakage guarantees valid model evaluation metrics.',
        'ColumnTransformer separates processing rules by data types. Restricting scaling transforms to training sets avoids data leakage.',
        'Feature scaling scales variables using training split variance. Applying transforms to test splits prevents ahead-of-time bias.',
        'Target masking flags target data prior to feature generation. Restricting training data prevents model memorization errors.'
      ]
    },
    {
      topic: 'Support Vector Machines',
      slug: 'svm-classifiers',
      tools: ['RBF Kernel', 'Support Vectors', 'Hinge Loss', 'SMOTE alignment'],
      snippets: [
        'Support Vector Machines (SVM) identify decision hyperplanes that maximize margins. Storing boundary coordinates classifies data.',
        'RBF kernels project samples into high dimensions via similarity calculations. Mapping relationships solves complex boundary challenges.',
        'Hinge loss penalizes classification boundary violations during training. Minimizing loss maximizes separation boundaries.',
        'SMOTE alignment balances dataset classes prior to SVM training. Generating synthetic boundary samples offsets class imbalance.'
      ]
    },
    {
      topic: 'Random Forest Logic',
      slug: 'random-forest',
      tools: ['Bagging estimators', 'Out-Of-Bag error', 'Feature Importance', 'Tree limit'],
      snippets: [
        'Random Forest classifiers build independent decision trees concurrently. Selecting random features at nodes limits tree correlation.',
        'Out-Of-Bag (OOB) error evaluates forest models using unsampled data. Measuring OOB scores replaces traditional cross-validation.',
        'Feature importance calculates mean impurity drops across variables. Identifying top estimators simplifies classification schemas.',
        'Managing tree limits balances classification accuracy with search speeds. Pruning forests keeps file sizes and memory requirements optimized.'
      ]
    },
    {
      topic: 'NLP Classification',
      slug: 'nlp-classification',
      tools: ['TF-IDF vectorizer', 'Word2Vec embeddings', 'N-grams analysis', 'Cosine similarity'],
      snippets: [
        'TF-IDF vectorizers convert text files into numeric frequency arrays. Down-weighting common words highlights important terms.',
        'Word2Vec embeddings generate vector representations of words based on context. Projection steps locate similar words near each other.',
        'N-grams analysis tracks sequences of words across document indices. Capturing phrases improves classification models.',
        'Cosine similarity measures angle separation between document vectors. Matching text vectors enables classification routing.'
      ]
    },
    {
      topic: 'Semi-Supervised Learn',
      slug: 'semi-supervised-learning',
      tools: ['LabelPropagation', 'Self-Training', 'Pseudo-Labeling', 'Graph diffusion'],
      snippets: [
        'LabelPropagation diffuses actual labels across dataset similarity graphs. Tagging unlabeled records speeds up training runs.',
        'Self-Training pipelines fit estimators on limited labeled datasets. Iteratively adding high-confidence predictions extends samples.',
        'Pseudo-labeling assigns predicted labels to unlabeled records. Training networks on merged datasets scales classification models.',
        'Graph diffusion calculates transition matrices across sample connections. Propagating category scores groups structural elements.'
      ]
    },
    {
      topic: 'Loss Function Tuning',
      slug: 'loss-functions',
      tools: ['Huber Loss', 'Mean Squared Error', 'Cross-Entropy', 'Focal Loss'],
      snippets: [
        'Huber Loss combines absolute and squared errors. Resisting outlier spikes stabilizes regression training loops.',
        'Mean Squared Error (MSE) penalizes large prediction errors quadratically. Minimizing MSE yields stable mean estimators.',
        'Cross-Entropy measures distance between actual targets and probabilities. Minimizing cross-entropy optimizes network parameters.',
        'Focal Loss dynamically scales down penalties for well-classified samples. Directing training focus to hard cases optimizes models.'
      ]
    }
  ],
  Programming: [
    {
      topic: 'TypeScript Generic Types',
      slug: 'typescript-generics',
      tools: ['keyof operator', 'Utility Types', 'Mapped Types', 'Type Constraints'],
      snippets: [
        'TypeScript generics enable writing reusable components with strict type checking. Designing parameterized types validates arguments at compile time.',
        'The keyof operator maps object properties to string union types. Restricting function arguments to valid object keys prevents execution crashes.',
        'Utility types like Pick and Omit generate custom type representations. Mapping schemas reduces code duplication across modules.',
        'Type constraints restrict generics using extends keywords. Gating parameter formats guarantees expected property interfaces.'
      ]
    },
    {
      topic: 'JS Event Loop mechanics',
      slug: 'js-event-loop',
      tools: ['Microtask Queue', 'Task Queue', 'requestAnimationFrame', 'call stack'],
      snippets: [
        'The JavaScript event loop coordinates single-threaded async execution. Offloading operations to web APIs keeps applications responsive.',
        'The Microtask queue processes Promise callbacks before the Task queue. Understanding execution order avoids UI bugs.',
        'Task queues schedule setTimeout and event callbacks. Gating execution steps coordinates async actions.',
        'Call stacks track currently executing execution frames. Managing nesting depth prevents stack overflow exceptions.'
      ]
    },
    {
      topic: 'React Render Optimizations',
      slug: 'react-render-optimization',
      tools: ['useMemo hook', 'useCallback hook', 'React.memo', 'virtual DOM'],
      snippets: [
        'The useMemo hook caches computed values across component renders. Limiting expensive recalculations optimizes app performance.',
        'The useCallback hook memoizes event handler references. Preventing child component re-renders stabilizes rendering loops.',
        'React.memo gates component updates using shallow property checks. Skipping rendering loops for unchanged data speeds up the UI.',
        'Virtual DOM algorithms compare component changes against page structures. Batching DOM mutations limits expensive redraws.'
      ]
    },
    {
      topic: 'Node.js Stream Processing',
      slug: 'node-stream-processing',
      tools: ['pipeline utility', 'Transform streams', 'backpressure control', 'Buffer allocation'],
      snippets: [
        'Node.js streams process files in chunks without overloading memory. Pipeline utilities handle stream close and error events.',
        'Transform streams modify chunks during execution runs. Encrypting or parsing records on the fly handles large files.',
        'Backpressure controls pause readable streams when write buffers fill. Managing throughput speeds prevents process crashes.',
        'Buffer allocations manage memory arrays during streaming. Reusing allocated memory limits garbage collection latency.'
      ]
    },
    {
      topic: 'REST API Best Practices',
      slug: 'rest-api-design',
      tools: ['HTTP Status codes', 'JSON payloads', 'Rate Limiting', 'CORS rules'],
      snippets: [
        'REST API design maps resources to standard HTTP verbs. Selecting appropriate status codes simplifies developer integration.',
        'JSON payload layouts format resources consistently. Standardizing response fields ensures clean client-side parsing.',
        'Rate limiting endpoints prevents service abuse. Returning Retry-After headers throttles aggressive scripts.',
        'CORS rules restrict cross-origin access scopes. Restricting origins protects internal API paths.'
      ]
    },
    {
      topic: 'GraphQL Query Tuning',
      slug: 'graphql-query-tuning',
      tools: ['DataLoader tool', 'Query complexity', 'Resolvers schema', 'N+1 queries'],
      snippets: [
        'DataLoader batches and caches query requests to databases. Resolving relational data in single operations speeds up APIs.',
        'Query complexity analyzers check request depth limits. Rejecting nested queries blocks Denial of Service attacks.',
        'GraphQL resolver schemas map queries to database queries. Writing optimal resolvers avoids query duplication.',
        'The N+1 query problem occurs when fetching relations in loops. DataLoader resolves this by batching requests.'
      ]
    },
    {
      topic: 'Go Concurrency Channeling',
      slug: 'go-concurrency',
      tools: ['Goroutines', 'select block', 'sync.WaitGroup', 'buffered channels'],
      snippets: [
        'Go concurrency scales background tasks using lightweight goroutines. Managing execution scopes coordinates concurrent tasks.',
        'The select block coordinates communication across multiple channels. Handling timeout channels prevents program lockups.',
        'sync.WaitGroup blocks execution until concurrent tasks complete. Synchronizing routines avoids early program termination.',
        'Buffered channels control task throughput without blocking threads. Managing buffer sizes stabilizes task routing.'
      ]
    },
    {
      topic: 'Python Asyncio Loops',
      slug: 'python-asyncio',
      tools: ['async/await', 'TaskGroup context', 'aiohttp client', 'event loop'],
      snippets: [
        'Python asyncio coordinates concurrent I/O tasks. Using async/await keywords offloads blocking wait states.',
        'TaskGroup contexts manage concurrent tasks as groups. Ensuring task cleanup avoids resource leaks.',
        'aiohttp client tools fetch multiple URLs concurrently. Managing request pools optimizes scraping pipelines.',
        'Event loop execution schedules coroutines onto single threads. Registering callback handlers coordinates runtime tasks.'
      ]
    },
    {
      topic: 'CSS Grid Page Layouts',
      slug: 'css-grid-layouts',
      tools: ['grid-template-areas', 'minmax function', 'gap formatting', 'auto-fit column'],
      snippets: [
        'CSS Grid templates layout page components in two dimensions. Defining custom areas simplifies responsive coding.',
        'The minmax function defines flexible column boundaries. Scaling grid tracks with browser sizes keeps layouts clean.',
        'Gap formatting separates grid cells without margin hacks. Standardizing gaps aligns page layouts.',
        'The auto-fit rule generates responsive column layouts without media queries. Fitting tracks to viewport widths simplifies CSS.'
      ]
    },
    {
      topic: 'Vite Bundling Options',
      slug: 'vite-bundling',
      tools: ['rollupOptions', 'Esbuild minification', 'Code Splitting', 'Hot Module Replacement'],
      snippets: [
        'Vite speeds up development by serving ES modules directly. Rollup builds optimize production assets.',
        'Esbuild minification strips comments and compiles code. Optimizing file transfers speeds up load times.',
        'Code splitting separates dependencies into lazy-loaded files. Fetching code dynamically cuts initial bundle sizes.',
        'Hot Module Replacement (HMR) updates components in memory. Preserving application state speeds up development loops.'
      ]
    },
    {
      topic: 'Docker Containerization',
      slug: 'docker-containerization',
      tools: ['Dockerfile steps', 'multi-stage builds', 'container networking', 'volume mounts'],
      snippets: [
        'Dockerfile instructions compile application files into portable container images. Layering steps caches compilation runs.',
        'Multi-stage builds separate development tools from runtime images. Excluding builder packages reduces final image sizes.',
        'Container networking connects isolated services across private hosts. Configuring port bindings exposes application routes.',
        'Volume mounts bind local directories to container file paths. Persisting database folders avoids data loss on restarts.'
      ]
    },
    {
      topic: 'Error Handling Strategies',
      slug: 'error-handling',
      tools: ['try/catch boundaries', 'Custom Error classes', 'global middleware', 'Sentry logging'],
      snippets: [
        'Try/catch boundaries prevent exceptions from crashing execution loops. Isolating risky logic blocks handles failures.',
        'Custom error classes wrap internal exception codes with context. Propagating specific types simplifies API responses.',
        'Global middleware handlers catch uncaught exceptions. Returning formatted errors avoids leaking stack details.',
        'Sentry logging utilities capture production errors with breadcrumbs. Tracking stack traces speeds up bug resolution.'
      ]
    },
    {
      topic: 'JWT Auth Architecture',
      slug: 'jwt-authentication',
      tools: ['jsonwebtoken package', 'Secret key signing', 'Access/Refresh token', 'expiry validations'],
      snippets: [
        'JWT authentication formats session profiles into signed tokens. Verifying signatures validates user identity without DB lookups.',
        'Secret key signing protects token payloads against tampering. Rotating keys regularly secures authentication endpoints.',
        'Access and refresh token pairings secure active sessions. Refreshing access tokens limits token exposure.',
        'Expiry validations check token dates prior to request routing. Rejecting expired tokens blocks unauthorized requests.'
      ]
    },
    {
      topic: 'SQL Query Tuning Logic',
      slug: 'sql-query-tuning',
      tools: ['EXPLAIN ANALYZE', 'Indexes mapping', 'Common Table Expressions', 'Join constraints'],
      snippets: [
        'EXPLAIN ANALYZE outputs execution plans for SQL queries. Identifying index scan locations highlights tuning targets.',
        'Mapping database indexes to filter column combinations avoids full table scans. Speeding up search loops cuts query latency.',
        'Common Table Expressions (CTE) split complex SQL into readable blocks. Using materialized CTEs avoids redundant calculations.',
        'Optimizing join constraints prevents database loops from checking rows twice. Aligning keys indexes table lookups.'
      ]
    },
    {
      topic: 'Memory Leak Debugging',
      slug: 'memory-leak-debugging',
      tools: ['Heap Snapshots', 'Chrome DevTools', 'garbage collector', 'Chrome memory profile'],
      snippets: [
        'Heap snapshots capture memory allocations inside execution runtimes. Comparing snapshots identifies growing objects.',
        'Chrome DevTools profiling tracks memory footprints across tasks. Pinpointing memory spikes highlights leaking components.',
        'The garbage collector frees memory from unreferenced variables. Resolving active closures allows variables to clean up.',
        'Memory profile timelines monitor active object allocations. Visualizing memory levels flags resource leaks.'
      ]
    },
    {
      topic: 'Git Collaborative Flow',
      slug: 'git-collaborative-flow',
      tools: ['rebase utility', 'interactive merge', 'squash commitments', 'cherry-pick actions'],
      snippets: [
        'Git rebase rewrites branch history to maintain linear timelines. Resolving merge conflicts step-by-step keeps history clean.',
        'Interactive merge loops resolve file conflicts across developers. Using diff markers identifies source choices.',
        'Squashing commits merges minor commits prior to main branch merging. Maintaining clean commit history simplifies changes.',
        'Cherry-picking copies specific commit changes across branches. Applying patches avoids full branch updates.'
      ]
    },
    {
      topic: 'Testing with Jest framework',
      slug: 'jest-testing',
      tools: ['mock functions', 'snapshot tests', 'coverage reports', 'asynchronous test loops'],
      snippets: [
        'Jest mock functions stub network requests and database loops. Isolating testing components checks system behavior.',
        'Snapshot tests check UI components against reference files. Flagging markup modifications prevents unintended layout changes.',
        'Coverage reports show code paths executed during test runs. Tracking coverage percentages verifies test coverage.',
        'Asynchronous test loops verify Promise resolutions. Checking error assertions verifies exception handling.'
      ]
    },
    {
      topic: 'WebSockets Communication',
      slug: 'websockets-communication',
      tools: ['socket.io client', 'heartbeat logs', 'event listeners', 'reconnection options'],
      snippets: [
        'WebSockets enable real-time bidirectional messaging over single TCP sockets. Establishing channels speeds up updates.',
        'Socket.io clients manage socket connection state. Handling disconnect events prevents missing messages.',
        'Heartbeat messages monitor connection status across client groups. Pruning dead sockets keeps resources optimized.',
        'Configuring reconnection options auto-reestablishes dropped channels. Retrying with exponential backoff manages backend load.'
      ]
    },
    {
      topic: 'Clean Code Principles',
      slug: 'clean-code-principles',
      tools: ['SOLID principles', 'DRY conventions', 'Separation of concerns', 'naming syntax'],
      snippets: [
        'SOLID principles guide writing modular object-oriented software. Designing single-responsibility classes simplifies code maintenance.',
        'DRY (Don\'t Repeat Yourself) conventions eliminate copy-pasted blocks. Abstracting logic into utility methods limits bugs.',
        'Separation of concerns splits apps into distinct logic layers. Decoupling routes from databases isolates tests.',
        'Descriptive naming conventions clarify function intent. Using standard patterns makes code readable.'
      ]
    },
    {
      topic: 'Web Accessibility (a11y)',
      slug: 'web-accessibility',
      tools: ['ARIA attributes', 'semantic HTML', 'focus ring layouts', 'screen reader rules'],
      snippets: [
        'ARIA attributes describe complex interactive widgets to screen readers. Annotating elements enables navigation for disabled users.',
        'Semantic HTML elements define document structures natively. Using main, nav, and section tags structures accessibility.',
        'Focus ring styles highlight active elements during keyboard navigation. Maintaining ring visibility enables mouse-free navigation.',
        'Screen reader validation checks image alt texts. Providing descriptive labels details layout elements.'
      ]
    },
    {
      topic: 'Next.js Server Components',
      slug: 'nextjs-server-components',
      tools: ['React Server Components', 'Hydration pipeline', 'Static Site Generation', 'API routing'],
      snippets: [
        'React Server Components (RSC) render on backend servers, reducing client bundle sizes. Fetching databases directly simplifies coding.',
        'Hydration pipelines attach event handlers to server-rendered HTML. Aligning states prevents client-side rendering mismatches.',
        'Static Site Generation (SSG) compiles pages to static files. Caching pages on CDNs speeds up load times.',
        'Next.js API routing implements endpoint routes within page folders. Managing backend paths handles user requests.'
      ]
    },
    {
      topic: 'Design Patterns JS',
      slug: 'design-patterns-js',
      tools: ['Singleton pattern', 'Observer patterns', 'Factory patterns', 'Module layouts'],
      snippets: [
        'Singleton patterns restrict class instantiation to a single global instance. Managing single states handles shared caches.',
        'Observer patterns notify dependent components of state updates. Establishing registers decoples state management.',
        'Factory patterns construct objects without exposing creation logic. Instantiating classes based on inputs decouples types.',
        'Module layouts enclose private variables using closures. Exposing public interfaces structures code.'
      ]
    },
    {
      topic: 'State Management Design',
      slug: 'state-management',
      tools: ['Redux Toolkit', 'Zustand client', 'Context API', 'Immer state'],
      snippets: [
        'Redux Toolkit optimizes global state updates using slice stores. Dispatching actions validates state transitions.',
        'Zustand provides lightweight hook-based state management. Defining state actions in simple config files simplifies setups.',
        'The React Context API shares state values across component trees. Avoiding prop drilling coordinates global state.',
        'Immer utilities update state arrays using simple mutations. Writing draft mutations simplifies state logic.'
      ]
    },
    {
      topic: 'Garbage Collection Logic',
      slug: 'garbage-collection',
      tools: ['V8 Engine memory', 'Scavenger cycle', 'Mark-Sweep algorithms', 'Reference tracking'],
      snippets: [
        'The V8 engine allocates memory to execution heaps. Running garbage collection cycles reclaims inactive objects.',
        'Scavenger cycles quickly clean short-lived objects. Moving active objects to old generation space avoids memory bloat.',
        'Mark-Sweep algorithms search memory graphs for unreferenced objects. Reclaiming isolated blocks optimizes memory.',
        'Reference tracking counts active closures bound to variables. Breaking circular links enables cleanup.'
      ]
    },
    {
      topic: 'Microfrontend Architect',
      slug: 'microfrontends',
      tools: ['Module Federation', 'Custom Elements', 'import maps', 'shared scripts'],
      snippets: [
        'Module Federation loads compiled JavaScript builds dynamically. Sharing page components decouples team deployments.',
        'Custom Elements package framework widgets into web components. Bundling code inside HTML boundaries isolates styles.',
        'Import maps point script modules to URL paths. Loading dependencies dynamically cuts bundle overlaps.',
        'Shared runtime scripts align version dependencies across microfrontends. Gating imports prevents duplicate dependency loads.'
      ]
    }
  ],
  Cloud: [
    {
      topic: 'Google Cloud IAM Config',
      slug: 'gcp-iam-roles',
      tools: ['IAM Roles', 'GKE Access Controls', 'IAM Policy Management', 'Cloud Security', 'Service Account Permissions'],
      snippets: [
        'Google Cloud IAM configurations enforce least privilege principles. Gating resource access with IAM roles restricts user permissions.',
        'GKE access control strategies combine GCP IAM scopes with Kubernetes RBAC. Mapping roles to service accounts secures pod resources.',
        'IAM policy management guides establish permission audits. Monitoring policy modifications prevents security regressions.',
        'Cloud security fundamentals require locking down default permissions. Restricting API access scopes secures network boundaries.',
        'Service account permissions deep dives detail key rotation risks. Gating service keys with IAM permissions limits credential leakage.'
      ]
    },
    {
      topic: 'Kubernetes Pod Autoscaling',
      slug: 'k8s-pod-autoscaling',
      tools: ['Horizontal Pod Autoscaler', 'Prometheus metrics', 'Resource limits', 'Cluster Autoscaler'],
      snippets: [
        'Horizontal Pod Autoscaler (HPA) scales replica counts based on resource loads. Querying CPU limits matches pod scaling requirements.',
        'Prometheus metric adapters feed custom query inputs into HPA. Gating pods based on request volume handles traffic spikes.',
        'Resource limits prevent container loops from monopolizing CPU cores. Setting request bounds guarantees host memory structures.',
        'Cluster Autoscaler adds virtual machine nodes to host pools when resource space runs low. Scaling nodes prevents scheduling delays.'
      ]
    },
    {
      topic: 'VPC Peering Infrastructure',
      slug: 'vpc-peering',
      tools: ['VPC routing tables', 'Network Security Groups', 'VPN Gateways', 'Transit Gateway'],
      snippets: [
        'VPC peering connects isolated cloud networks over private routes. Adding routes to local tables routes traffic without internet hops.',
        'Network Security Groups restrict traffic access scopes across instance networks. Gating protocols and source ranges protects services.',
        'VPN gateways encrypt data streams connecting local offices to VPCs. Establishing secure tunnels protects corporate communications.',
        'Transit Gateway coordinates connections across multiple cloud VPCs. Routing hub traffic through transit gateways scales configurations.'
      ]
    },
    {
      topic: 'Serverless Scalability',
      slug: 'serverless-scaling',
      tools: ['AWS Lambda', 'Cloud Run', 'cold start optimization', 'Concurrency limits'],
      snippets: [
        'AWS Lambda scales computation tasks in response to request triggers. Managing concurrent executions handles workloads.',
        'Cloud Run scales container workloads using gRPC routing parameters. Scaling replicas to zero cuts runtime cost overhead.',
        'Cold start optimization reduces startup latencies. Bundling light code files minimizes container initialization delay.',
        'Concurrency limits restrict active lambda invocations. Setting execution bounds prevents database connection crashes.'
      ]
    },
    {
      topic: 'Terraform IaC Configurations',
      slug: 'terraform-iac',
      tools: ['Terraform state', 'Workspace configs', 'resource locks', 'IaC modules'],
      snippets: [
        'Terraform state maps configuration resources to real cloud instances. Securing state files prevents resource loss.',
        'Workspace configurations split environment state profiles. Isolating development from production paths manages tests.',
        'Resource locks block simultaneous deployment runs. Gating actions via DynamoDB tables avoids deployment conflicts.',
        'Reusable IaC modules standardize network configurations. Wrapping infrastructure patterns simplifies deployment setups.'
      ]
    },
    {
      topic: 'API Gateway Routing',
      slug: 'api-gateway',
      tools: ['Kong Gateway', 'AWS API Gateway', 'auth middleware', 'response caching'],
      snippets: [
        'Kong Gateway routes public client API requests to internal microservices. Managing upstream paths secures services.',
        'AWS API Gateway maps resources to lambda execution routes. Gating requests with token authorizers validates sessions.',
        'Auth middleware validates JWT signatures at gateway entries. Preventing unauthorized request routing protects microservices.',
        'Response caching limits duplicate backend service evaluations. Returning cached payloads speeds up APIs.'
      ]
    },
    {
      topic: 'Cloud Storage Security',
      slug: 'cloud-storage-security',
      tools: ['S3 bucket policies', 'KMS key encryption', 'Signed URLs', 'audit logging'],
      snippets: [
        'S3 bucket policies restrict public access boundaries. Configuring strict bucket constraints protects sensitive assets.',
        'KMS encryption keys secure uploaded files in cloud buckets. Rotating KMS keys regularly complies with audit scopes.',
        'Signed URLs grant temporary read access to private resources. Restricting URL expiration bounds prevents link exposure.',
        'Audit logging tracks cloud bucket transactions. Logging query events monitors access histories.'
      ]
    },
    {
      topic: 'Database Replication',
      slug: 'database-replication',
      tools: ['Aurora clusters', 'Read Replicas', 'Multi-AZ backup', 'Failover logic'],
      snippets: [
        'Aurora databases replicate storage partitions across multiple zones. Mirroring data blocks protects databases.',
        'Read replicas offload select query loads from primary database nodes. Routing read queries to replicas speeds up apps.',
        'Multi-AZ deployments provide automatic failover safety. Sharding backups guarantees restoration routes.',
        'Failover logic detects node offline events. Routing client connections to secondary servers maintains availability.'
      ]
    },
    {
      topic: 'Load Balancing Algorithms',
      slug: 'load-balancing',
      tools: ['Round Robin', 'Least Connections', 'Weighted routing', 'health check gates'],
      snippets: [
        'Round Robin algorithms distribute client requests sequentially across servers. Balancing request paths divides workloads.',
        'Least Connections routing directs traffic to servers with low active jobs. Handling persistent sessions balances loads.',
        'Weighted routing paths direct traffic based on server capacity ratings. Directing traffic to large instances optimizes apps.',
        'Health checks gate inactive backend servers. Removing offline nodes from load balancer pools maintains uptime.'
      ]
    },
    {
      topic: 'Prometheus Metric Monitor',
      slug: 'prometheus-monitoring',
      tools: ['PromQL syntax', 'node_exporter service', 'alertmanager scripts', 'time-series logs'],
      snippets: [
        'Prometheus scrapes real-time metrics from microservices. Querying metrics using PromQL locates performance bottlenecks.',
        'node_exporter services collect hardware usage metrics. Exporting usage stats monitors server resources.',
        'Alertmanager scripts evaluate metrics against target trigger thresholds. Routing alerts to Slack tracks service incidents.',
        'Time-series databases log metric histories. Analyzing metrics tracks application usage trends.'
      ]
    },
    {
      topic: 'Grafana Dashboard Layouts',
      slug: 'grafana-dashboards',
      tools: ['dashboard panels', 'custom variables', 'data source links', 'alert visualizer'],
      snippets: [
        'Grafana dashboards visualize real-time service metrics. Laying out visual panels monitors application states.',
        'Custom variables parameterize dashboard panels. Filtering dashboards by environment updates panels.',
        'Data source connections link Grafana to active databases. Fetching stats displays search analytics.',
        'Alert visualizer panels highlight active system warnings. Highlighting issue nodes notifies operations.'
      ]
    },
    {
      topic: 'CI/CD Deployment Pipelines',
      slug: 'cicd-pipelines',
      tools: ['GitHub Actions', 'Docker registry', 'Helm charts', 'canary testing'],
      snippets: [
        'GitHub Actions workflows compile code and run tests on code pushes. Automating build checks guarantees code quality.',
        'Docker registries store compiled images securely. Versioning images enables rollback options.',
        'Helm charts package Kubernetes manifests into deployment templates. Templating configurations scales deployments.',
        'Canary testing routes minor traffic shares to new versions. Evaluating error rates validates releases.'
      ]
    },
    {
      topic: 'Cloud CDN Cache Tuning',
      slug: 'cloud-cdn',
      tools: ['Cloudflare Edge', 'Cache-Control headers', 'Invalidation APIs', 'Edge Rules'],
      snippets: [
        'Cloudflare Edge servers cache static files close to user locations. Offloading static assets speeds up initial loads.',
        'Cache-Control headers configure caching durations. Setting max-age rules optimizes CDN storage.',
        'Invalidation APIs clear outdated files from edge caches. Purging paths on new builds pushes updates.',
        'Edge rules dynamically modify request parameters. Routing traffic based on user location optimizes latency.'
      ]
    },
    {
      topic: 'DNS Routing Policies',
      slug: 'dns-routing-policies',
      tools: ['Route 53', 'Geolocation routing', 'latency-based checks', 'failover records'],
      snippets: [
        'Route 53 manages public DNS routing tables. Configuring alias records maps domain queries to load balancers.',
        'Geolocation routing directs queries to regional servers. Routing European users to local hosting points complies with laws.',
        'Latency-based checks calculate network times from users to servers. Routing traffic over fast paths optimizes apps.',
        'Failover DNS records swap domain mappings when main servers fail. Pointing traffic to backup sites maintains uptime.'
      ]
    },
    {
      topic: 'Virtual Machine Provision',
      slug: 'vm-provisioning',
      tools: ['EC2 instances', 'metadata services', 'cloud-init config', 'security groups'],
      snippets: [
        'EC2 instances host backend services within virtual isolation. Selecting memory-optimized classes fits large databases.',
        'Instance metadata services query local runtime properties. Retrieving access tokens validates server scopes.',
        'cloud-init scripts configure system settings on boot. Installing packages on startup automates setups.',
        'Security groups restrict ports on virtual instances. Closing non-essential ports blocks hacking attempts.'
      ]
    },
    {
      topic: 'Serverless Databases',
      slug: 'serverless-databases',
      tools: ['DynamoDB partitions', 'Firestore scaling', 'connection pooling', 'NoSQL keys'],
      snippets: [
        'DynamoDB partitions data records across physical storage. Scaling compute capacity handles request spikes.',
        'Firestore indexes document changes in real time. Querying database collections fetches application assets.',
        'Connection pooling manages database sockets for serverless backends. Reusing connections avoids port crashes.',
        'Designing optimal NoSQL keys partition indices evenly. Avoiding hot keys prevents database performance limits.'
      ]
    },
    {
      topic: 'Network Security Groups',
      slug: 'network-security-groups',
      tools: ['ingress rules', 'egress rules', 'IP CIDR blocks', 'stateful firewalls'],
      snippets: [
        'Ingress rules filter incoming host traffic. Limiting ssh port access to corporate IPs secures servers.',
        'Egress rules govern outgoing traffic. Blocking outgoing traffic on random ports stops data theft.',
        'IP CIDR blocks define allowed host address ranges. Formatting subnets isolates network zones.',
        'Stateful firewalls track active connection states. Allowing return traffic simplifies security rules.'
      ]
    },
    {
      topic: 'Log Aggregation & ELK',
      slug: 'log-aggregation',
      tools: ['Elasticsearch', 'Logstash', 'Kibana panels', 'Filebeat services'],
      snippets: [
        'Elasticsearch indexes log records for search. Querying logs identifies application crashes.',
        'Logstash aggregates, parses, and cleans log records. Formatting inputs compiles data structures.',
        'Kibana panels visualize error frequencies over time. Spotting log spikes alerts operations.',
        'Filebeat services monitor log directories on virtual hosts. Streaming logs to central servers manages space.'
      ]
    },
    {
      topic: 'Cloud Migration Strategies',
      slug: 'cloud-migration',
      tools: ['Lift-and-Shift', 'Replatforming', 'Database Migration Service', 'offline transfers'],
      snippets: [
        'Lift-and-shift strategies move VMs to the cloud without code updates. Speeding up migrations lowers server costs.',
        'Replatforming updates database targets during migration. Swapping SQL instances for cloud equivalents cuts maintenance.',
        'Database Migration Service replicates database changes during migrations. Syncing changes minimizes cutover downtime.',
        'Offline storage devices transfer large data volumes to the cloud. Bypassing internet transfers avoids bandwidth limits.'
      ]
    },
    {
      topic: 'Service Mesh Routing',
      slug: 'service-mesh',
      tools: ['Istio proxies', 'envoy sidecar', 'mutual TLS', 'traffic splitting'],
      snippets: [
        'Istio proxies manage traffic routing across microservices. Configuring routing rules secures internal systems.',
        'Envoy sidecars capture container traffic automatically. Collecting latency metrics monitors application health.',
        'Mutual TLS (mTLS) encrypts inter-service communication. Verifying certificate identities blocks network attacks.',
        'Traffic splitting routes minor request shares to new versions. Evaluating error rates validates releases.'
      ]
    },
    {
      topic: 'Disaster Recovery Plans',
      slug: 'disaster-recovery',
      tools: ['RTO targets', 'RPO limits', 'Multi-Region backup', 'pilot light setups'],
      snippets: [
        'Recovery Time Objective (RTO) targets define allowed service recovery speeds. Testing recovery plans meets target windows.',
        'Recovery Point Objective (RPO) limits define allowed data loss volumes. Frequent backups meet strict data safety standards.',
        'Multi-region backups copy snapshot files to distant datacenters. Safeguarding snapshots handles regional failures.',
        'Pilot light setups keep minor database instances active in secondary regions. Scaling up on main failures recovers services.'
      ]
    },
    {
      topic: 'Secret Management Systems',
      slug: 'secret-management',
      tools: ['HashiCorp Vault', 'AWS Secrets Manager', 'dynamic credentials', 'access tokens'],
      snippets: [
        'HashiCorp Vault encrypts sensitive configuration variables. Restricting access to vault gates protects credentials.',
        'AWS Secrets Manager rotates database passwords automatically. Syncing passwords prevents application auth errors.',
        'Dynamic credentials generate temporary access keys for services. Expiring keys limits credential leakage.',
        'Access tokens authorize applications to query secret systems. Restricting token duration secures setups.'
      ]
    },
    {
      topic: 'Hybrid Cloud Architecture',
      slug: 'hybrid-cloud',
      tools: ['Direct Connect', 'Anthos management', 'local servers', 'VPC connectivity'],
      snippets: [
        'AWS Direct Connect bypasses public internet hops with dedicated physical links. Securing connections speeds up transfers.',
        'Anthos manages container applications across cloud and on-premise clusters. Standardizing platforms simplifies maintenance.',
        'Local database servers store sensitive data locally. Syncing non-sensitive workloads to the cloud optimizes costs.',
        'VPN connections bridge local networks to VPC subnets. Routing private IP traffic connects setups.'
      ]
    },
    {
      topic: 'Cost Optimization Alerts',
      slug: 'cost-optimization',
      tools: ['AWS Budgets', 'billing alarms', 'Auto-scaling policies', 'unused volume purge'],
      snippets: [
        'AWS Budgets tracks cloud spend against forecasts. Emailing warnings on cost jumps prevents billing surprises.',
        'Billing alarms monitor account charges using metrics. Warning administrators on spending changes flags leaks.',
        'Auto-scaling policies prune inactive virtual instances. Scaling down server counts cuts compute costs.',
        'Purging unattached storage volumes removes unused resource bills. Reclaiming disk space manages storage budgets.'
      ]
    },
    {
      topic: 'Multi-Region Deployment',
      slug: 'multi-region-deployment',
      tools: ['global load balancers', 'database replication', 'latency routing', 'regional gateways'],
      snippets: [
        'Global load balancers route requests to the nearest regional instance. Minimizing latency optimizes user experiences.',
        'Replicating databases across regions coordinates global states. Resolving write conflicts stabilizes apps.',
        'DNS latency routing maps domains to fast regional endpoints. Checking latency maps routes users to fast hosting.',
        'Deploying regional API gateways isolates service endpoints. Gating traffic locally manages API routing.'
      ]
    }
  ],
  'Data Engineering': [
    {
      topic: 'Spark Data Processing',
      slug: 'spark-processing',
      tools: ['PySpark', 'DataFrame API', 'RDD transformations', 'Broadcast Join'],
      snippets: [
        'PySpark processes large data tables across compute clusters. Compiling analytics workflows using lazy evaluation optimizes execution.',
        'DataFrame APIs apply relational query logic to cluster memory nodes. Grouping and filtering records cleans datasets.',
        'RDD transformations implement low-level cluster operations. Mapping and reducing partition arrays customizes tasks.',
        'Broadcast joins copy minor data tables to all worker nodes. Avoiding partition sharding loops speeds up join queries.'
      ]
    },
    {
      topic: 'Kafka Event Streaming',
      slug: 'kafka-streaming',
      tools: ['Kafka Producers', 'Consumer Groups', 'Topic Partitions', 'Schema Registry'],
      snippets: [
        'Kafka producers publish real-time events to distributed message brokers. Serializing messages into byte arrays speeds up pipelines.',
        'Consumer groups read topic data in parallel. Auto-balancing offsets across consumers tracks pipeline reads.',
        'Sharding topics into partitions scales message capacities. Configuring partitions increases concurrent consumer reads.',
        'Schema Registry validates event payloads against target schemas. Rejecting bad records guarantees data quality.'
      ]
    },
    {
      topic: 'Postgres Indexing Tuning',
      slug: 'postgres-indexing',
      tools: ['B-Tree Index', 'GIN Indexing', 'Partial Indexes', 'pg_stat_statements'],
      snippets: [
        'B-Tree indexes speed up range and equality queries on database tables. Ordering column values enables fast binary searches.',
        'GIN indexes speed up full-text searches and array matching. Mapping array terms to row lists indexes collections.',
        'Partial indexes limit indexing to rows matching filter criteria. Reducing index file sizes optimizes storage.',
        'pg_stat_statements tracks execution times of database queries. Analyzing logs identifies queries in need of tuning.'
      ]
    },
    {
      topic: 'Snowflake Schema Design',
      slug: 'snowflake-schemas',
      tools: ['Clustering Keys', 'Snowpipe ingestion', 'micro-partitions', 'Time Travel query'],
      snippets: [
        'Snowflake clustering keys align rows with sorting criteria. Pruning micro-partitions during scans speeds up analytics.',
        'Snowpipe ingests streaming data files from cloud buckets. Automating loading loops keeps tables fresh.',
        'Snowflake organizes data tables into encrypted micro-partitions. Compressing column segments speeds up query scans.',
        'Time Travel queries retrieve historical database records. Querying past tables recovers deleted rows.'
      ]
    },
    {
      topic: 'dbt Transformation Models',
      slug: 'dbt-transformations',
      tools: ['dbt models', 'jinja templates', 'dbt test loops', 'materialized views'],
      snippets: [
        'dbt transformation models organize SQL queries into analytical pipelines. Compiling queries into dependent tables simplifies analysis.',
        'Jinja templates inject dynamic configurations into SQL code blocks. Parameterizing environments makes code reusable.',
        'dbt test loops assert column constraints on table outputs. Checking uniqueness and nulls identifies pipeline issues.',
        'Materializing models as tables improves query speeds. Caching results avoids redundant database calculations.'
      ]
    },
    {
      topic: 'Airflow DAG Orchestration',
      slug: 'airflow-orchestration',
      tools: ['DAG configs', 'operators', 'XCom parameters', 'task concurrency'],
      snippets: [
        'Airflow DAGs orchestrate data engineering workflows. Resolving dependencies across tasks executes processes.',
        'Airflow operators implement specific task types. Running shell tasks or trigger databases maps pipeline stages.',
        'XCom variables transfer minor metadata records across pipeline tasks. Syncing keys handles execution details.',
        'DAG concurrency limits concurrent worker actions. Gating active tasks prevents API throttling.'
      ]
    },
    {
      topic: 'ETL Pipeline Design',
      slug: 'etl-pipelines',
      tools: ['data extractors', 'transform loops', 'bulk loaders', 'staging schemas'],
      snippets: [
        'ETL data extractors pull records from APIs and databases. Compiling inputs logs transaction records.',
        'Transform loops clean, map, and standardize raw data arrays. Formatting fields structures record outputs.',
        'Bulk loaders write clean datasets to analytics databases. Loading tables in batches minimizes network load.',
        'Staging schemas store raw files during pipeline processing. Isolating staging tables protects target databases.'
      ]
    },
    {
      topic: 'Data Lakehouse Architecture',
      slug: 'data-lakehouse',
      tools: ['Delta Lake', 'Iceberg tables', 'metadata catalogs', 'ACID transactions'],
      snippets: [
        'Delta Lake adds ACID transaction layers to raw cloud storage. Managing version logs prevents data corruption.',
        'Apache Iceberg formats cloud file tables for query engines. Tracking columns via metadata speeds up scans.',
        'Metadata catalogs list available datasets and schemas. Syncing schemas across engines coordinates search.',
        'ACID transactions guarantee consistent table writes. Gating updates handles concurrent pipeline writes.'
      ]
    },
    {
      topic: 'Parquet File Optimization',
      slug: 'parquet-optimization',
      tools: ['columnar format', 'snappy compression', 'dictionary encoding', 'row group sizes'],
      snippets: [
        'Parquet columnar formatting groups record values by column. Reading column segments speeds up query scans.',
        'Snappy compression shrinks Parquet file sizes. Optimizing block transfers speeds up load times.',
        'Dictionary encoding replaces repetitive string values with integers. Compressing indices reduces file size.',
        'Row group sizes define data boundaries within Parquet files. Setting optimal boundaries speeds up query scans.'
      ]
    },
    {
      topic: 'Schema Registry Validation',
      slug: 'schema-registry',
      tools: ['Avro serialization', 'Protobuf specs', 'backward compatibility', 'version schemas'],
      snippets: [
        'Avro serialization formats message payloads into compact binary streams. Validating schemas maps event records.',
        'Protobuf specifications define strict data payloads for APIs. Compiling specifications guarantees interface formats.',
        'Backward compatibility checks ensure new schemas parse old data. Validating changes prevents pipeline crashes.',
        'Versioning schemas tracks changes to data models. Maintaining version logs handles payload formats.'
      ]
    },
    {
      topic: 'Change Data Capture (CDC)',
      slug: 'cdc-pipelines',
      tools: ['Debezium', 'Postgres WAL', 'Kafka connect', 'CDC triggers'],
      snippets: [
        'Debezium captures database change events in real time. Streaming insert and update alerts triggers sync loops.',
        'Postgres WAL logs capture database write events. Parsing WAL records triggers syncs without table scans.',
        'Kafka Connect connectors load CDC streams into message brokers. Managing connections automates pipelines.',
        'CDC triggers sync database tables with search indexes. Updating search records keeps search data fresh.'
      ]
    },
    {
      topic: 'Spark Join Optimization',
      slug: 'spark-joins',
      tools: ['SortMerge join', 'Shuffle Hash join', 'skew join tuning', 'Broadcast variables'],
      snippets: [
        'SortMerge joins sort and merge partition keys during queries. Sharding partitions avoids memory overflows.',
        'Shuffle Hash joins partition matching keys across compute nodes. Resolving joins in memory speeds up queries.',
        'Skew join tuning handles uneven partition distributions. Split operations balance work across nodes.',
        'Broadcast variables copy static datasets to worker nodes. Bypassing network sharding speeds up join tasks.'
      ]
    },
    {
      topic: 'Data Profiling Metrics',
      slug: 'data-profiling',
      tools: ['pandas-profiling', 'null rate validation', 'cardinality checks', 'distribution plots'],
      snippets: [
        'pandas-profiling generates summary metrics for raw datasets. Inspecting statistics locates data anomalies.',
        'Null rate validation checks missing value percentages. Flagging blank inputs maintains data quality.',
        'Cardinality checks evaluate unique value counts. Identifying high-cardinality keys guides index design.',
        'Distribution plots show column value distributions. Checking ranges flags out-of-bounds inputs.'
      ]
    },
    {
      topic: 'Table Partitioning Design',
      slug: 'table-partitioning',
      tools: ['declarative partitioning', 'range partitions', 'list partitions', 'partition pruning'],
      snippets: [
        'Declarative partitioning splits large tables into sub-tables. Routing rows automatically simplifies schemas.',
        'Range partitions group data rows by date boundaries. Dropping old partition tables handles data rotation.',
        'List partitions organize rows by categorical value sets. Sharding tables by region limits query sizes.',
        'Partition pruning excludes irrelevant sub-tables from query plans. Scanning target tables speeds up search.'
      ]
    },
    {
      topic: 'ClickHouse Analytics',
      slug: 'clickhouse-analytics',
      tools: ['MergeTree engine', 'Vectorized execution', 'materialized projections', 'column storage'],
      snippets: [
        'ClickHouse MergeTree engines index log tables on disk. Sorting row arrays enables quick query scans.',
        'Vectorized execution processes data arrays in parallel. Leveraging SIMD instructions speeds up queries.',
        'Materialized projections cache pre-aggregated query results. Bypassing full table scans speeds up reports.',
        'Column storage isolates table column segments on disk. Reading target columns limits I/O bottlenecks.'
      ]
    },
    {
      topic: 'Data Lineage Tracking',
      slug: 'data-lineage',
      tools: ['OpenLineage', 'Marquez dashboard', 'DAG mapping', 'metadata tracking'],
      snippets: [
        'OpenLineage standardizes metadata collection across processing jobs. Tracking data inputs maps pipeline lineage.',
        'Marquez dashboards visualize data lineage connections. Pinpointing issue steps speeds up error debugging.',
        'DAG mapping links transformation steps to target tables. Documenting dependencies tracks dataset versions.',
        'Metadata tracking logs column updates across pipelines. Monitoring changes prevents pipeline issues.'
      ]
    },
    {
      topic: 'BigQuery Partitioning',
      slug: 'bigquery-tuning',
      tools: ['partition expiration', 'Clustering fields', 'query dry runs', 'slot allocation'],
      snippets: [
        'BigQuery partitioning groups database query scans by day. Limiting scan ranges cuts database costs.',
        'Clustering fields sort data within partitions. Scanning sorted columns speeds up query execution.',
        'Query dry runs calculate scanned bytes before execution. Warning developers on heavy queries cuts costs.',
        'Slot allocation budgets query resources across projects. Reserving slots guarantees query performance.'
      ]
    },
    {
      topic: 'Presto Query Engine',
      slug: 'presto-engine',
      tools: ['Coordinator node', 'worker nodes', 'connector plugins', 'distributed execution'],
      snippets: [
        'Presto coordinates SQL queries across data lake files. Distributing query tasks speed up reports.',
        'Coordinator nodes parse SQL and compile execution plans. Optimizing query loops limits planning bottlenecks.',
        'Connector plugins link Presto to databases and storage bucket files. Fetching data in parallel speeds up scans.',
        'Distributed execution workers process data partitions in memory. Streaming intermediate results cuts I/O wait times.'
      ]
    },
    {
      topic: 'Flink Streaming Analytics',
      slug: 'flink-streaming',
      tools: ['DataStream API', 'event time windows', 'RocksDB state backend', 'Savepoints'],
      snippets: [
        'Flink processes live event streams with sub-second latency. Applying filters to streams handles real-time alerts.',
        'Event time windows group events based on generation timestamps. Handling late data arrivals secures metric counts.',
        'RocksDB state backends store active stream states on disk. Managing memory scales session tracking.',
        'Flink savepoints capture snapshot state profiles during execution runs. Restoring savepoints handles code updates.'
      ]
    },
    {
      topic: 'Redshift Column Encoding',
      slug: 'redshift-tuning',
      tools: ['AZ64 encoding', 'Sort Keys', 'Distribution Keys', 'Query Queue scaling'],
      snippets: [
        'Redshift column encoding compresses database storage footprints. Swapping raw formats for AZ64 cuts I/O loads.',
        'Sort keys order table rows on disk. Scanning sorted segments speeds up query execution.',
        'Distribution keys shard rows across cluster nodes. Avoiding partition sharding loops speeds up join queries.',
        'Query queue scaling manages concurrent queries. Directing reports to target queues avoids resource locks.'
      ]
    },
    {
      topic: 'Great Expectations Test',
      slug: 'great-expectations',
      tools: ['Expectations suite', 'Data Docs logs', 'Validation Operators', 'Checkpoints'],
      snippets: [
        'Great Expectations defines data test rules in declarative configs. Asserting table properties validates pipelines.',
        'Data Docs logs generate visual HTML test reports automatically. Reviewing test reports details quality issues.',
        'Validation operators check input files against expectation sets. Gating dirty data protects tables.',
        'Checkpoints execute test suites within CI/CD pipelines. Flagging failing runs stops processing.'
      ]
    },
    {
      topic: 'Delta Lake Transactions',
      slug: 'delta-lake-transactions',
      tools: ['transaction log', 'optimize command', 'vacuum utility', 'Z-Ordering'],
      snippets: [
        'Delta Lake transaction logs track commits chronologically. Reading log entries enables concurrent writes.',
        'The optimize command merges small data files on disk. Compaction steps speed up query scans.',
        'The vacuum utility purges old transaction files from storage. Managing histories frees up storage space.',
        'Z-Ordering groups related column values on disk. Pruning unneeded files speeds up queries.'
      ]
    },
    {
      topic: 'Hadoop HDFS Migration',
      slug: 'hdfs-migration',
      tools: ['DistCp transfer', 'Object Storage sync', 'metadata mapping', 'S3a connector'],
      snippets: [
        'DistCp transfers large data directories concurrently across network endpoints. Syncing folders moves data.',
        'Syncing HDFS data to cloud object storage cuts server costs. Swapping VMs for bucket targets simplifies architecture.',
        'Metadata mapping lists HDFS paths to object storage keys. Aligning names maintains database links.',
        'S3a connectors link Spark to cloud storage buckets. Fetching data from buckets replaces HDFS nodes.'
      ]
    },
    {
      topic: 'Vector Search Indexing',
      slug: 'vector-indexing-pipeline',
      tools: ['Embedding workers', 'batch vectors', 'chunking scripts', 'index reload'],
      snippets: [
        'Vector search indexing pipelines extract and encode text records. Streaming chunks to embedding models builds indexes.',
        'Batching vector generation steps limits API network calls. Managing concurrency scales index builds.',
        'Chunking scripts split files into overlapping segments. Retaining context boundaries improves search accuracy.',
        'Index reload scripts load fresh vector models into databases. Swap commands keep searches online.'
      ]
    },
    {
      topic: 'NoSQL Data Modeling',
      slug: 'nosql-data-modeling',
      tools: ['Denormalization', 'partition sharding', 'key-value lookups', 'secondary indexes'],
      snippets: [
        'NoSQL data modeling stores related data records within unified documents. Denormalizing data structures speeds up reads.',
        'Sharding database partitions by customer key divides workloads. Distributing queries scales clusters.',
        'Key-value lookups retrieve document payloads in microseconds. Bypassing join operations minimizes CPU load.',
        'Creating secondary indexes handles dynamic queries. Mapping query fields enables fast searches.'
      ]
    }
  ]
};

const TITLE_TEMPLATES = {
  'Tutorial': [
    (subj) => `How to Build and Deploy ${subj}`,
    (subj) => `Building a ${subj} Workflow`,
    (subj) => `Step-by-Step Tutorial: Setting Up ${subj}`,
    (subj) => `Getting Started with ${subj}`,
    (subj) => `Implementing ${subj}: A Practical Tutorial`
  ],
  'Guide': [
    (subj) => `${subj} Explained`,
    (subj) => `The Complete Guide to ${subj}`,
    (subj) => `Understanding ${subj} Fundamentals`,
    (subj) => `A Deep Dive into ${subj}`,
    (subj) => `${subj} Reference Guide`
  ],
  'Case Study': [
    (subj) => `Case Study: Scaling ${subj} at Enterprise Level`,
    (subj) => `How We Optimized ${subj}: A Case Study`,
    (subj) => `Implementing ${subj} at Scale`,
    (subj) => `Scaling ${subj}: Architectural Case Study`,
    (subj) => `Case Study: Migrating to ${subj}`
  ],
  'Best Practices': [
    (subj) => `${subj} Best Practices`,
    (subj) => `Production Best Practices for ${subj}`,
    (subj) => `How to Secure and Optimize ${subj}`,
    (subj) => `${subj} Design Patterns and Best Practices`,
    (subj) => `Top 10 Tips for ${subj}`
  ],
  'Documentation': [
    (subj) => `${subj} Reference Manual`,
    (subj) => `Documentation: Configuring ${subj}`,
    (subj) => `Technical Reference for ${subj}`,
    (subj) => `${subj} API & Configuration Guide`,
    (subj) => `Developer Documentation: ${subj}`
  ],
  'Research': [
    (subj) => `Evaluating the Performance of ${subj}`,
    (subj) => `A Comparative Study of ${subj} Methods`,
    (subj) => `Benchmarking ${subj} Efficiency and Latency`,
    (subj) => `Analysis of ${subj} under Load`,
    (subj) => `Research Paper: Optimizing ${subj}`
  ],
  'Blog': [
    (subj) => `Why We Switched to ${subj}`,
    (subj) => `Unlocking the Power of ${subj}`,
    (subj) => `My Experience with ${subj}`,
    (subj) => `Is ${subj} Really Worth It?`,
    (subj) => `How ${subj} Saved Our Production Environment`
  ]
};

const getContextPrefix = (topic) => {
  const prefixes = [
    'Google Cloud', 'GCP', 'Kubernetes', 'TypeScript', 'JavaScript', 'JS', 'React', 'Node.js', 'Node', 
    'GraphQL', 'Go', 'Python', 'CSS Grid', 'CSS', 'Vite', 'Docker', 'JWT', 'SQL', 'Git', 'Jest', 
    'WebSockets', 'Next.js', 'AWS', 'VPC', 'Terraform', 'Spark', 'PySpark', 'Kafka', 'Postgres', 
    'Snowflake', 'dbt', 'Airflow', 'Delta Lake', 'Hadoop', 'HDFS', 'BigQuery', 'ClickHouse', 'Neo4j',
    'XGBoost', 'PyTorch', 'TensorFlow', 'Scikit-Learn', 'ONNX'
  ];
  for (const p of prefixes) {
    if (topic.toLowerCase().startsWith(p.toLowerCase())) {
      return p;
    }
  }
  return null;
};

// Generate 100 documents per category (5 categories * 25 topics * 4 variations = 500 documents)
const generateDocuments = () => {
  const docs = [];
  let globalId = 1;

  // Set standard popularity range starting points
  let currentPopularity = 120;
  // Year start dates
  const startDate = new Date('2025-12-01');

  const categories = Object.keys(TOPICS);
  
  categories.forEach(cat => {
    const topicsList = TOPICS[cat];
    
    topicsList.forEach((topicObj, topicIdx) => {
      // 4 variations for each topic
      for (let i = 0; i < 4; i++) {
        const tool = topicObj.tools[i] || 'standard tools';
        const snippet = topicObj.snippets[i];
        
        // 1. Assign Content Type
        let contentType = 'Guide';
        if (i === 0) {
          contentType = 'Tutorial';
        } else if (i === 1) {
          contentType = 'Guide';
        } else if (i === 2) {
          contentType = 'Case Study';
        } else {
          const extras = ['Best Practices', 'Documentation', 'Research', 'Blog'];
          contentType = extras[topicIdx % extras.length];
        }

        // 2. Adjust subject with context if needed
        const context = getContextPrefix(topicObj.topic);
        let subject = tool;
        if (context) {
          const contextLower = context.toLowerCase();
          const toolLower = tool.toLowerCase();
          const contextWords = contextLower.split(/[\s.-]+/);
          const hasOverlap = contextWords.some(word => 
            word.length > 2 && toolLower.includes(word)
          );
          
          if (!hasOverlap && !toolLower.includes(contextLower)) {
            subject = `${context} ${tool}`;
          } else if (contextLower === 'google cloud' && !toolLower.includes('google') && toolLower.includes('cloud')) {
            subject = `Google ${tool}`;
          } else if (contextLower === 'node.js' && !toolLower.includes('node')) {
            subject = `Node.js ${tool}`;
          }
        }

        // Clean up subject formatting (ensure title case)
        const formatSubject = (str) => {
          return str.split(' ')
            .map((w, idx) => {
              if (idx > 0 && ['of', 'in', 'on', 'with', 'using', 'and', 'to', 'for', 'the', 'a', 'an'].includes(w.toLowerCase())) {
                return w.toLowerCase();
              }
              // Preserve camelCase words like useMemo, keyof, etc.
              if (w.match(/^[a-z]+[A-Z]/)) return w;
              // Otherwise capitalize first letter
              return w.charAt(0).toUpperCase() + w.slice(1);
            })
            .join(' ');
        };
        const cleanSubject = formatSubject(subject);

        // 3. Select template and generate Title
        const templates = TITLE_TEMPLATES[contentType];
        const templateFn = templates[(topicIdx + i) % templates.length];
        const title = templateFn(cleanSubject);

        // 4. Build a unique URL path containing content type (no part numbers!)
        // e.g. https://example.com/cloud/tutorial/deploy-kubernetes-on-gke
        const catSlug = cat.toLowerCase().replace(/\s+/g, '-');
        const typeSlug = contentType.toLowerCase().replace(/\s+/g, '-');
        const titleSlug = title.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const url = `https://example.com/${catSlug}/${typeSlug}/${titleSlug}`;

        // Format Date (within the past 180 days relative to June 2026, e.g. starting Dec 2025)
        const daysOffset = Math.floor((globalId / 500) * 180);
        const pubDate = new Date(startDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
        const dateStr = pubDate.toISOString().slice(0, 10);

        // Populate document object
        docs.push({
          id: globalId,
          title,
          content: snippet,
          category: cat,
          url,
          date: dateStr,
          popularity: currentPopularity
        });

        globalId++;
        currentPopularity += 7; // increment popularity to make search results rankable
      }
    });
  });

  return docs;
};

const main = () => {
  const docs = generateDocuments();
  console.log(`Generated ${docs.length} diverse documents.`);

  // Write to CSV format
  const escapeCsv = (str) => {
    if (str === undefined || str === null) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = 'id,title,content,category,url,date,popularity\n';
  const rows = docs.map(d => {
    return `${d.id},${escapeCsv(d.title)},${escapeCsv(d.content)},${escapeCsv(d.category)},${escapeCsv(d.url)},${d.date},${d.popularity}`;
  }).join('\n');

  // Check parent directory
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, header + rows + '\n', 'utf-8');
  console.log(`Successfully wrote database to ${OUTPUT_PATH}`);
};

main();
