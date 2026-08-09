import { generateEmbedding } from '@/utils/embeddings';
import { searchSimilarDocuments } from '../vector/qdrant';

export interface RagResult {
  context: string;
  /** true if RAG ran and got results; false if no docs or courseId not provided */
  hasContext: boolean;
  /** populated if RAG failed with an error */
  error?: string;
}

/**
 * Retrieves semantically similar document chunks for a query + courseId.
 *
 * Returns a structured RagResult so callers can decide what to do when
 * retrieval fails (e.g. warn the user, skip context, or surface an error).
 */
export async function retrieveContext(
  query: string,
  courseId: string,
  limit: number = 5,
): Promise<RagResult> {
  try {
    const queryEmbedding = await generateEmbedding(query);

    const results = await searchSimilarDocuments(queryEmbedding, limit, {
      must: [
        {
          key: 'courseId',
          match: { value: courseId },
        },
      ],
    });

    if (!results || results.length === 0) {
      return { context: '', hasContext: false };
    }

    const context = results.map(r => r.text).join('\n\n---\n\n');
    console.log(`[RAG] Retrieved ${results.length} chunks for courseId=${courseId}, topic="${query}"`);
    return { context, hasContext: true };
  } catch (error: any) {
    const msg = String(error?.message ?? error);
    console.error('[RAG] Context retrieval failed:', msg);
    return { context: '', hasContext: false, error: msg };
  }
}
