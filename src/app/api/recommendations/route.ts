import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { asyncHandler } from '@/utils/asyncHandler';
import QuizAttempt from '@/models/QuizAttempt';
import connectToDatabase from '@/lib/mongodb';
import { generateObject } from 'ai';
import { z } from 'zod';
import { callModel } from '@/lib/ai/model-router';

const recommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      topic: z.string().describe('The topic name'),
      subTopic: z.string().optional().describe('Optional specific subtopic to practice'),
      courseId: z.string().optional().describe('Associated course ID if available'),
      reason: z.string().describe('Personalized, encouraging, actionable explanation of why the student should focus on this topic'),
      type: z.enum(['weak', 'refresh', 'challenge']).describe('Category of recommendation'),
      priority: z.number().describe('Priority integer from 1 (highest) to 3'),
    })
  ).describe('Top 3 to 5 tailored study recommendations based on student performance data'),
});

export const GET = asyncHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const userId = session.user.id;

  const UserProgress = (await import('@/models/UserProgress')).default;
  const progressRecords = await UserProgress.find({ userId }).lean();

  const ruleBasedRecommendations: any[] = [];
  const masteredTopics = new Set<string>();

  progressRecords.forEach((p: any) => {
    (p.topicsMastered || []).forEach((t: string) => masteredTopics.add(t.toLowerCase()));
    
    (p.weakTopics || []).forEach((wt: any) => {
      if (!masteredTopics.has(wt.topic.toLowerCase())) {
        ruleBasedRecommendations.push({
          topic: wt.topic,
          subTopic: wt.subTopic,
          courseId: p.courseId?.toString(),
          reason: wt.recommendedAction || `Low accuracy (${wt.accuracy}%). Needs targeted review.`,
          type: 'weak',
          priority: 1,
        });
      }
    });
  });

  const attempts = await QuizAttempt.find({ userId }).lean();
  const topicStats: Record<string, { totalScore: number; count: number; lastAttemptDate: Date; courseId: string }> = {};

  attempts.forEach((attempt) => {
    if (attempt.topic && attempt.courseId && !masteredTopics.has(attempt.topic.toLowerCase())) {
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

  Object.keys(topicStats).forEach((topic) => {
    const stats = topicStats[topic];
    const accuracy = Math.round(stats.totalScore / stats.count);
    const daysSince = Math.floor((now.getTime() - new Date(stats.lastAttemptDate).getTime()) / (1000 * 3600 * 24));

    const alreadyAdded = ruleBasedRecommendations.some((r) => r.topic.toLowerCase() === topic.toLowerCase());

    if (!alreadyAdded) {
      if (accuracy < 70) {
        ruleBasedRecommendations.push({
          topic,
          courseId: stats.courseId,
          reason: `Accuracy is ${accuracy}%. Needs practice on weak sub-topics.`,
          type: 'weak',
          priority: 1,
        });
      } else if (daysSince > 10 && accuracy >= 75) {
        ruleBasedRecommendations.push({
          topic,
          courseId: stats.courseId,
          reason: 'It has been a while since you practiced this topic. Refresh your memory.',
          type: 'refresh',
          priority: 2,
        });
      }
    }
  });

  ruleBasedRecommendations.sort((a, b) => a.priority - b.priority);

  // Attempt AI-Driven Recommendation Generation
  if (ruleBasedRecommendations.length > 0 || Object.keys(topicStats).length > 0) {
    try {
      const summaryContext = {
        masteredTopics: Array.from(masteredTopics),
        identifiedWeakTopics: ruleBasedRecommendations.map(r => ({ topic: r.topic, reason: r.reason })),
        recentPerformanceStats: Object.entries(topicStats).map(([topic, s]) => ({
          topic,
          averageAccuracy: Math.round(s.totalScore / s.count),
          attempts: s.count
        }))
      };

      const prompt = `Analyze this student's recent performance summary and generate 3 to 5 highly personalized, encouraging study recommendations.
Prioritize areas needing improvement (accuracy < 70%), suggest refresher sessions for old topics, or suggest advanced challenges for mastered areas.

Student Context:
${JSON.stringify(summaryContext, null, 2)}`;

      const { object } = await generateObject({
        model: callModel('general'),
        schema: recommendationSchema,
        prompt,
      });

      if (object && object.recommendations && object.recommendations.length > 0) {
        return NextResponse.json({ recommendations: object.recommendations.slice(0, 5) });
      }
    } catch (aiErr) {
      console.warn('[recommendations] AI generation fallback triggered:', aiErr);
    }
  }

  // Fallback to rule-based recommendations
  return NextResponse.json({ recommendations: ruleBasedRecommendations.slice(0, 5) });
});


