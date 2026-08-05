import { generateEmbedding } from '@/utils/embeddings';
import { searchSimilarDocuments } from '../vector/qdrant';

export async function retrieveContext(query: string, courseId: string, limit: number = 3): Promise<string> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    const results = await searchSimilarDocuments(queryEmbedding, limit, {
      must: [
        {
          key: 'courseId',
          match: {
            value: courseId
          }
        }
      ]
    });

    if (!results || results.length === 0) {
      return '';
    }

    const combinedText = results.map(r => r.text).join('\n\n---\n\n');
    return combinedText;
  } catch (error) {
    console.error('Error retrieving context for RAG:', error);
    return '';
  }
}
