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

  let context = '';
  if (courseId) {
    context = await retrieveContext(topic, courseId, 5);
  }

  const quiz = await generateQuiz(topic, context, count || 5);

  return NextResponse.json({ quiz });
});
