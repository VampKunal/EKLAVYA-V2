import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { asyncHandler } from '@/utils/asyncHandler';
import { generateQuiz } from '@/lib/ai/quiz-generator';
import { retrieveContext } from '@/lib/ai/rag';
import connectToDatabase from '@/lib/mongodb';

export const POST = asyncHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { topic, courseId, count } = await req.json();

  if (!topic) {
    return NextResponse.json({ message: 'Topic is required' }, { status: 400 });
  }

  await connectToDatabase();

  // --- RAG context retrieval ---
  let context = '';
  let ragWarning: string | undefined;

  if (courseId) {
    // Query expansion: a descriptive sentence retrieves better chunks than a bare topic word.
    // The embedding of "Key concepts about X for MCQs" sits closer in vector space to
    // factual paragraphs than the embedding of just "X".
    const retrievalQuery = `Key concepts, definitions, important facts, and examples about ${topic} that would be useful for multiple choice questions`;
    const ragResult = await retrieveContext(retrievalQuery, courseId, 5);
    context = ragResult.context;

    if (ragResult.error) {
      // RAG failed (e.g. Qdrant index missing, network error).
      // We continue with general knowledge but surface the warning to the client.
      ragWarning = `RAG retrieval failed: ${ragResult.error}. Quiz generated from general knowledge.`;
      console.warn('[quiz/generate]', ragWarning);
    } else if (!ragResult.hasContext) {
      console.log('[quiz/generate] No uploaded materials found for this course — using general knowledge.');
    } else {
      console.log('[quiz/generate] RAG context retrieved successfully.');
    }
  }

  // --- Quiz generation ---
  const quiz = await generateQuiz(topic, context, count || 5);

  return NextResponse.json({
    quiz,
    // Inform client if quiz was generated without course context
    ...(ragWarning ? { warning: ragWarning } : {}),
    usedContext: !!context,
  });
});
