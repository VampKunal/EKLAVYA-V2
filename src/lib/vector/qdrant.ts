import { QdrantClient } from '@qdrant/js-client-rest';
import { EMBEDDING_DIMENSIONS } from '@/utils/embeddings';

const url = process.env.QDRANT_URL;
const apiKey = process.env.QDRANT_API_KEY;

export const qdrantClient = new QdrantClient({
  url: url || 'http://localhost:6333',
  apiKey: apiKey,
});

export const COLLECTION_NAME = 'eklavya_documents';

export async function ensureCollection() {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (!exists) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: EMBEDDING_DIMENSIONS,
          distance: 'Cosine',
        },
      });
      console.log(`Created Qdrant collection: ${COLLECTION_NAME}`);
    }
  } catch (error) {
    console.error('Error ensuring Qdrant collection:', error);
  }
}

export async function upsertDocumentChunks(
  chunks: { id: string; text: string; metadata: any; embedding: number[] }[]
) {
  await ensureCollection();

  const points = chunks.map(chunk => ({
    id: chunk.id,
    vector: chunk.embedding,
    payload: {
      text: chunk.text,
      ...chunk.metadata,
    },
  }));

  return qdrantClient.upsert(COLLECTION_NAME, {
    wait: true,
    points,
  });
}

export async function searchSimilarDocuments(
  queryEmbedding: number[],
  limit: number = 5,
  filter?: any
) {
  await ensureCollection();

  const results = await qdrantClient.search(COLLECTION_NAME, {
    vector: queryEmbedding,
    limit,
    filter,
    with_payload: true,
  });

  return results.map(result => ({
    score: result.score,
    text: result.payload?.text as string,
    metadata: result.payload,
  }));
}
