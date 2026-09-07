import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { asyncHandler } from '@/utils/asyncHandler';
import QuizAttempt from '@/models/QuizAttempt';
import UserProgress from '@/models/UserProgress';
import '@/models/Course'; // register schema so populate('courseId') works
import connectToDatabase from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export const GET = asyncHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const userId = session.user.id;

  const attempts = await QuizAttempt.find({ userId })
    .populate('courseId', 'title')
    .sort({ createdAt: 1 })
    .lean();

  const progressDocs = await UserProgress.find({ userId }).lean();

  // ─── Helper: recompute score from stored isCorrect flags ──────────────────
  // The `score` field may have been saved by older buggy code.
  // We recompute it from the graded questions, which are always reliable.
  function recomputeScore(attempt: any): number {
    const qs: any[] = attempt.questions ?? [];
    if (qs.length === 0) return attempt.score ?? 0;
    const correct = qs.filter((q: any) => q.isCorrect === true).length;
    return Math.round((correct / qs.length) * 100);
  }

  // ─── Overview stats ───────────────────────────────────────────────────────
  const totalQuizzes = attempts.length;
  const scores = attempts.map(recomputeScore);
  const averageScore = totalQuizzes > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / totalQuizzes)
    : 0;

  const streak = progressDocs.length > 0
    ? Math.max(...progressDocs.map(p => p.streakDays || 0))
    : 0;

  // ─── Progress chart (last 15) ─────────────────────────────────────────────
  const recentAttempts = attempts.slice(-15);
  const progressData = recentAttempts.map((attempt, idx) => ({
    date: new Date(attempt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: scores[attempts.length - recentAttempts.length + idx],
    topic: attempt.topic || 'General',
    courseName: (attempt.courseId as any)?.title || 'Unknown Course',
  }));

  // ─── Recent attempts list (for table display) ─────────────────────────────
  const recentAttemptsList = [...attempts].reverse().slice(0, 10).map((attempt, idx) => {
    const score = recomputeScore(attempt);
    const qs: any[] = attempt.questions ?? [];
    const correct = qs.filter((q: any) => q.isCorrect === true).length;
    return {
      id: (attempt as any)._id?.toString(),
      courseName: (attempt.courseId as any)?.title || 'Unknown Course',
      topic: attempt.topic || null,
      score,
      correctCount: correct,
      totalQuestions: qs.length,
      timeTaken: attempt.timeTaken,
      date: new Date(attempt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  });

  // ─── By COURSE grouping ───────────────────────────────────────────────────
  const courseStats: Record<string, any> = {};

  attempts.forEach((attempt, idx) => {
    const score = scores[idx];
    const courseIdKey = (attempt.courseId as any)?._id?.toString() || attempt.courseId?.toString() || 'unknown';
    const courseName = (attempt.courseId as any)?.title || 'Unknown Course';
    const topic = attempt.topic;
    const qs: any[] = attempt.questions ?? [];
    const correct = qs.filter((q: any) => q.isCorrect === true).length;

    if (!courseStats[courseIdKey]) {
      courseStats[courseIdKey] = {
        courseId: courseIdKey,
        courseName,
        totalScore: 0,
        count: 0,
        topics: {},
        recentAttempts: [],
        lastAttemptDate: attempt.createdAt,
      };
    }

    courseStats[courseIdKey].totalScore += score;
    courseStats[courseIdKey].count += 1;
    courseStats[courseIdKey].recentAttempts.push({
      score,
      correct,
      total: qs.length,
      topic: topic || null,
      date: new Date(attempt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    });

    if (new Date(attempt.createdAt) > new Date(courseStats[courseIdKey].lastAttemptDate)) {
      courseStats[courseIdKey].lastAttemptDate = attempt.createdAt;
    }

    if (topic) {
      if (!courseStats[courseIdKey].topics[topic]) {
        courseStats[courseIdKey].topics[topic] = { totalScore: 0, count: 0, lastAttemptDate: attempt.createdAt };
      }
      courseStats[courseIdKey].topics[topic].totalScore += score;
      courseStats[courseIdKey].topics[topic].count += 1;
    }
  });

  const now = new Date();

  const byCourse = Object.values(courseStats).map((cs: any) => {
    const avgScore = Math.round(cs.totalScore / cs.count);
    const daysSince = Math.floor((now.getTime() - new Date(cs.lastAttemptDate).getTime()) / (1000 * 3600 * 24));

    const topicsBreakdown = Object.keys(cs.topics).map((topic: string) => {
      const ts = cs.topics[topic];
      const accuracy = Math.round(ts.totalScore / ts.count);
      const topicDaysSince = Math.floor((now.getTime() - new Date(ts.lastAttemptDate).getTime()) / (1000 * 3600 * 24));
      let status = 'Mastered';
      if (accuracy < 75) status = 'Needs Work';
      else if (topicDaysSince > 7) status = 'Needs Refresh';
      return { topic, accuracy, daysSince: topicDaysSince, status };
    });

    return {
      courseId: cs.courseId,
      courseName: cs.courseName,
      totalQuizzes: cs.count,
      averageScore: avgScore,
      daysSince,
      recentAttempts: cs.recentAttempts,
      weakTopics: topicsBreakdown.filter((t: any) => t.accuracy < 75),
      topicsBreakdown,
    };
  });

  // ─── By TOPIC grouping ────────────────────────────────────────────────────
  const topicStats: Record<string, any> = {};

  attempts.forEach((attempt, idx) => {
    const score = scores[idx];
    const key = attempt.topic;
    if (!key) return;
    const courseIdKey = (attempt.courseId as any)?._id?.toString() || attempt.courseId?.toString() || 'unknown';
    const courseName = (attempt.courseId as any)?.title || 'Unknown Course';

    if (!topicStats[key]) {
      topicStats[key] = { totalScore: 0, count: 0, lastAttemptDate: attempt.createdAt, courseName, courseId: courseIdKey };
    }
    topicStats[key].totalScore += score;
    topicStats[key].count += 1;
    if (new Date(attempt.createdAt) > new Date(topicStats[key].lastAttemptDate)) {
      topicStats[key].lastAttemptDate = attempt.createdAt;
    }
  });

  const byTopic = Object.keys(topicStats).map(topic => {
    const ts = topicStats[topic];
    const accuracy = Math.round(ts.totalScore / ts.count);
    const daysSince = Math.floor((now.getTime() - new Date(ts.lastAttemptDate).getTime()) / (1000 * 3600 * 24));
    let status = 'Mastered';
    if (accuracy < 75) status = 'Needs Work';
    else if (daysSince > 7) status = 'Needs Refresh';
    return { topic, accuracy, daysSince, status, courseName: ts.courseName, courseId: ts.courseId };
  });

  const weakTopics = byTopic.filter(t => t.accuracy < 75).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
  const retentionData = byTopic.slice(0, 10);

  return NextResponse.json({
    overview: { totalQuizzes, averageScore, streak },
    progressData,
    recentAttemptsList,
    weakTopics,
    retentionData,
    byCourse,
    byTopic,
  });
});
