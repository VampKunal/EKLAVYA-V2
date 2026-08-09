import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { asyncHandler } from '@/utils/asyncHandler';
import QuizAttempt from '@/models/QuizAttempt';
import connectToDatabase from '@/lib/mongodb';

export const GET = asyncHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const userId = session.user.id;

  const attempts = await QuizAttempt.find({ userId }).lean();

  const topicStats: Record<string, { totalScore: number, count: number, lastAttemptDate: Date, courseId: string }> = {};

  attempts.forEach(attempt => {
    if (attempt.topic && attempt.courseId) {
      if (!topicStats[attempt.topic]) {
        topicStats[attempt.topic] = { 
          totalScore: 0, 
          count: 0, 
          lastAttemptDate: attempt.createdAt,
          courseId: attempt.courseId.toString(),
        };
      }
      topicStats[attempt.topic].totalScore += attempt.score;
      topicStats[attempt.topic].count += 1;
      if (new Date(attempt.createdAt) > new Date(topicStats[attempt.topic].lastAttemptDate)) {
        topicStats[attempt.topic].lastAttemptDate = attempt.createdAt;
      }
    }
  });

  const now = new Date();
  
  const recommendations: any[] = [];

  Object.keys(topicStats).forEach(topic => {
    const stats = topicStats[topic];
    const accuracy = Math.round(stats.totalScore / stats.count);
    const daysSince = Math.floor((now.getTime() - new Date(stats.lastAttemptDate).getTime()) / (1000 * 3600 * 24));

    if (accuracy < 70) {
      recommendations.push({
        topic,
        courseId: stats.courseId,
        reason: 'Low accuracy in recent quizzes. Needs review.',
        type: 'weak',
        priority: 1, // highest priority
      });
    } else if (daysSince > 10 && accuracy >= 80) {
      recommendations.push({
        topic,
        courseId: stats.courseId,
        reason: 'It has been a while since you practiced this topic. Refresh your memory.',
        type: 'refresh',
        priority: 2,
      });
    }
  });

  // Sort by priority and return top 3
  recommendations.sort((a, b) => a.priority - b.priority);

  return NextResponse.json({ recommendations: recommendations.slice(0, 3) });
});
