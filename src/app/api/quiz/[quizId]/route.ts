import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { asyncHandler } from '@/utils/asyncHandler';
import QuizAttempt from '@/models/QuizAttempt';
import connectToDatabase from '@/lib/mongodb';

export const GET = asyncHandler(async (
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { quizId } = await params;

  if (!quizId || quizId === 'new') {
    return NextResponse.json({ message: 'Invalid Quiz ID' }, { status: 400 });
  }

  await connectToDatabase();

  const attempt = await QuizAttempt.findOne({
    _id: quizId,
    userId: session.user.id,
  }).populate('courseId', 'title').lean();

  if (!attempt) {
    return NextResponse.json({ message: 'Quiz attempt not found' }, { status: 404 });
  }

  return NextResponse.json({ attempt });
});
