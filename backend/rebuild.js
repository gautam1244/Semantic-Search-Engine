import { loadDocuments, getEmbeddings } from './search.js';

async function main() {
  console.log('Loading documents and rebuilding index...');
  try {
    const docs = await loadDocuments();
    console.log(`Loaded ${docs.length} documents. Generating embeddings...`);
    await getEmbeddings(docs, true);
    console.log('Embedding index successfully rebuilt!');
    process.exit(0);
  } catch (err) {
    console.error('Error rebuilding index:', err);
    process.exit(1);
  }
}

main();
