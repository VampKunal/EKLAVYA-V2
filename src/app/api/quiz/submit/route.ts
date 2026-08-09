import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { asyncHandler } from '@/utils/asyncHandler';
import QuizAttempt from '@/models/QuizAttempt';
import UserProgress from '@/models/UserProgress';
import connectToDatabase from '@/lib/mongodb';

export const POST = asyncHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { courseId, subjectId, topic, questions, timeTaken } = await req.json();

  if (!courseId || !questions || !Array.isArray(questions)) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  await connectToDatabase();

  let correctCount = 0;
  const gradedQuestions = questions.map((q: any) => {
    // Trim both sides — LLMs often add trailing whitespace/newlines to correctAnswer
    const isCorrect = q.userAnswer?.trim() === q.correctAnswer?.trim();
    if (isCorrect) correctCount++;
    return {
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      userAnswer: q.userAnswer,
      isCorrect,
    };
  });

  const score = Math.round((correctCount / questions.length) * 100);

  const attempt = new QuizAttempt({
    userId: session.user.id,
    courseId,
    subjectId,
    topic,
    questions: gradedQuestions,
    score,
    timeTaken,
  });

  await attempt.save();

  // Update UserProgress
  let progress = await UserProgress.findOne({
    userId: session.user.id,
    courseId,
  });

  if (!progress) {
    progress = new UserProgress({
      userId: session.user.id,
      courseId,
      subjectId,
      topicsMastered: score >= 80 && topic ? [topic] : [],
      accuracy: score,
      streakDays: 1,
      lastActivity: new Date(),
    });
  } else {
    // Update accuracy (moving average or simple average, here we do a simple weighted average)
    progress.accuracy = Math.round((progress.accuracy + score) / 2);
    progress.lastActivity = new Date();
    
    // Add topic to mastered if score >= 80
    if (score >= 80 && topic && !progress.topicsMastered.includes(topic)) {
      progress.topicsMastered.push(topic);
    }
  }

  await progress.save();

  return NextResponse.json({ attempt, progress });
});
