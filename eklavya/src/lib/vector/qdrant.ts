import { QdrantClient } from '@qdrant/js-client-rest';
import { EMBEDDING_DIMENSIONS } from '@/utils/embeddings';

const url = process.env.QDRANT_URL;
const apiKey = process.env.QDRANT_API_KEY;

export const qdrantClient = new QdrantClient({
  url: url || 'http://localhost:6333',
  apiKey: apiKey,
});

export const COLLECTION_NAME = 'eklavya_documents';

/**
 * Creates the collection (if missing) AND ensures required payload indexes exist.
 *
 * Qdrant v1.4+ requires a keyword index on any field used in a filter.
 * Without this, filtered queries return HTTP 400 "Index required but not found".
 *
 * Indexed fields:
 *   courseId  — keyword  (used in every RAG context retrieval)
 *   userId    — keyword  (future: per-user isolation)
 *   fileId    — keyword  (future: per-file deletion)
 */
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
      console.log(`[Qdrant] Created collection: ${COLLECTION_NAME}`);
    }

    // Ensure payload indexes — safe to call even if they already exist
    await ensurePayloadIndexes();
  } catch (error) {
    console.error('[Qdrant] Error ensuring collection:', error);
  }
}

async function ensurePayloadIndexes() {
  const KEYWORD_FIELDS = ['courseId', 'userId', 'fileId'];

  for (const field of KEYWORD_FIELDS) {
    try {
      await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
        field_name: field,
        field_schema: 'keyword',
      });
      console.log(`[Qdrant] Payload index ensured: ${field}`);
    } catch (err: any) {
      // 409 Conflict = index already exists, that's fine
      if (err?.status !== 409 && err?.statusCode !== 409) {
        const msg = String(err?.message ?? '');
        if (!msg.includes('already exists')) {
          console.warn(`[Qdrant] Could not create index for "${field}":`, msg);
        }
      }
    }
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

  // v1.19+ Query API: vector → `query` field, results are under .points
  const response = await qdrantClient.query(COLLECTION_NAME, {
    query: queryEmbedding,
    limit,
    filter,
    with_payload: true,
  });

  return response.points.map(result => ({
    score: result.score,
    text: result.payload?.text as string,
    metadata: result.payload,
  }));
}
