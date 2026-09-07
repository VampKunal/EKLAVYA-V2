import { google } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';

export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSIONS = 768;

// Free tier limit: 100 requests/min. We use 700ms delay between batches (~85 req/min max)
const RATE_LIMIT_DELAY_MS = 700;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.embedding(EMBEDDING_MODEL),
    value: text,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: 'RETRIEVAL_QUERY',
      },
    },
  });
  return embedding;
}

/**
 * Generates embeddings for multiple texts.
 * Automatically splits into small sub-batches with delays to respect
 * the Gemini free-tier rate limit (100 requests/minute).
 */
export async function generateEmbeddings(
  texts: string[],
  subBatchSize: number = 10
): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += subBatchSize) {
    const batch = texts.slice(i, i + subBatchSize);

    const { embeddings } = await embedMany({
      model: google.embedding(EMBEDDING_MODEL),
      values: batch,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: 'RETRIEVAL_DOCUMENT',
        },
      },
    });

    results.push(...embeddings);

    // Respect rate limit between sub-batches
    if (i + subBatchSize < texts.length) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  return results;
}
