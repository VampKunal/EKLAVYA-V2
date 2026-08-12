import connectToDatabase from '@/lib/mongodb';
import Course from '@/models/Course';
import UserProgress from '@/models/UserProgress';
import QuizAttempt from '@/models/QuizAttempt';
import Analytics from '@/models/Analytics';
import { getRedis, TTL } from '@/lib/redis';
import mongoose from 'mongoose';
import type { Intent } from './orchestrator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeakTopicDetail {
  topic: string;
  subTopic?: string;
  accuracy: number;
  recommendedAction: string;
}

export interface UserDashboardContext {
  studentName: string;
  learningGoal?: string;
  courses: {
    id: string;
    title: string;
    accuracy: number;
    topicsMastered: string[];
    streakDays: number;
  }[];
  weakTopics: string[];
  weakTopicDetails: WeakTopicDetail[];
  masteredTopics: string[];
  overallAccuracy: number;
}


// ---------------------------------------------------------------------------
// In-process fallback cache (used when Redis is not configured)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = TTL.USER_DASHBOARD * 1000;

interface FallbackEntry {
  data: UserDashboardContext;
  expiresAt: number;
}
const memCache = new Map<string, FallbackEntry>();

// ---------------------------------------------------------------------------
// Intent / keyword guard
// ---------------------------------------------------------------------------

const DASHBOARD_INTENTS = new Set<Intent>(['recommendation']);

/**
 * Returns true only when the message is actually asking about the student's
 * own data — zero DB / Redis cost for math, coding, or general questions.
 */
export function needsDashboardContext(intent: Intent, messageText: string): boolean {
  if (DASHBOARD_INTENTS.has(intent)) return true;

  const lower = messageText.toLowerCase();
  return (
    lower.includes('my course') ||
    lower.includes('my progress') ||
    lower.includes('my subject') ||
    lower.includes('weak topic') ||
    lower.includes('weak area') ||
    lower.includes('what should i study') ||
    lower.includes('what to study') ||
    lower.includes('how many course') ||
    lower.includes('my accuracy') ||
    lower.includes('my streak') ||
    lower.includes('my dashboard') ||
    lower.includes('my performance') ||
    lower.includes('recommend') ||
    lower.includes('enrolled') ||
    // Additional natural speech patterns
    lower.includes('my analytics') ||
    lower.includes('my stats') ||
    lower.includes('my data') ||
    lower.includes('my learning') ||
    lower.includes('my score') ||
    lower.includes('how am i doing') ||
    lower.includes('how have i been doing') ||
    lower.includes("how i'm doing") ||
    lower.includes('where am i') ||
    lower.includes('tell me about me') ||
    lower.includes('tell me my') ||
    lower.includes('show me my') ||
    lower.includes('what are my') ||
    lower.includes("what's my") ||
    lower.includes('what is my') ||
    lower.includes('struggling') ||
    lower.includes('my weak') ||
    lower.includes('focus on') ||
    lower.includes('my grades') ||
    lower.includes('my topics') ||
    lower.includes('which topic') ||
    lower.includes('what topic') ||
    lower.includes('mastered') ||
    lower.includes('my mastery')
  );
}

// ---------------------------------------------------------------------------
// Cache helpers — Redis-first, in-memory fallback
// ---------------------------------------------------------------------------

const cacheKey = (userId: string) => `eklavya:dash:${userId}`;

async function getCached(userId: string): Promise<UserDashboardContext | null> {
  const redis = getRedis();

  if (redis) {
    try {
      const value = await redis.get<UserDashboardContext>(cacheKey(userId));
      return value ?? null;
    } catch (err) {
      console.warn('[user-context] Redis get failed, using memory fallback:', err);
    }
  }

  // In-memory fallback
  const entry = memCache.get(userId);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  return null;
}

async function setCached(userId: string, data: UserDashboardContext): Promise<void> {
  const redis = getRedis();

  if (redis) {
    try {
      await redis.set(cacheKey(userId), data, { ex: TTL.USER_DASHBOARD });
      return;
    } catch (err) {
      console.warn('[user-context] Redis set failed, using memory fallback:', err);
    }
  }

  // In-memory fallback
  memCache.set(userId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// DB fetch
// ---------------------------------------------------------------------------

/**
 * Returns the student's dashboard context.
 * Cache: Redis (if configured) → in-memory → DB.
 * TTL: 5 minutes.
 */
export async function getUserDashboardContext(
  userId: string,
  studentName: string,
  learningGoal?: string,
): Promise<UserDashboardContext> {
  // 1. Try cache first
  const cached = await getCached(userId);
  if (cached) return cached;

  // 2. Cache miss — fetch from DB
  await connectToDatabase();
  const uid = new mongoose.Types.ObjectId(userId);

  const progressRecords = await UserProgress.find({ userId: uid }).lean();
  const courseIds = progressRecords.map((p) => p.courseId);
  const courses = await Course.find({ _id: { $in: courseIds } }).select('_id title').lean();
  const courseMap = new Map(courses.map((c) => [c._id.toString(), c.title]));

  const courseContexts = progressRecords.map((p) => ({
    id: p.courseId.toString(),
    title: courseMap.get(p.courseId.toString()) ?? 'Unknown Course',
    accuracy: p.accuracy ?? 0,
    topicsMastered: p.topicsMastered ?? [],
    streakDays: p.streakDays ?? 0,
  }));

  const allWeakDetails: WeakTopicDetail[] = [];
  const allMastered: string[] = [];

  progressRecords.forEach((p) => {
    if (Array.isArray(p.weakTopics)) {
      p.weakTopics.forEach((wt: any) => {
        allWeakDetails.push({
          topic: wt.topic,
          subTopic: wt.subTopic,
          accuracy: wt.accuracy,
          recommendedAction: wt.recommendedAction,
        });
      });
    }
    if (Array.isArray(p.topicsMastered)) {
      allMastered.push(...p.topicsMastered);
    }
  });

  const analytics = await Analytics.findOne({ userId: uid }).lean();
  const weakFromRetention: string[] = (analytics?.retentionScores ?? [])
    .filter((r: { topic: string; score: number }) => r.score < 60)
    .map((r: { topic: string; score: number }) => r.topic);

  const recentAttempts = await QuizAttempt.find({ userId: uid })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const weakFromQuiz = recentAttempts
    .filter((a) => a.topic && a.score < 50)
    .map((a) => a.topic as string);

  const weakTopics = [...new Set([...allWeakDetails.map(w => w.topic), ...weakFromRetention, ...weakFromQuiz])];
  const masteredTopics = [...new Set(allMastered)];

  const overallAccuracy =
    courseContexts.length > 0
      ? Math.round(courseContexts.reduce((sum, c) => sum + c.accuracy, 0) / courseContexts.length)
      : 0;

  const data: UserDashboardContext = {
    studentName,
    learningGoal,
    courses: courseContexts,
    weakTopics,
    weakTopicDetails: allWeakDetails,
    masteredTopics,
    overallAccuracy,
  };

  // 3. Store in cache
  await setCached(userId, data);
  return data;
}

// ---------------------------------------------------------------------------
// Prompt serialiser — compact to save tokens (~80-150 tokens)
// ---------------------------------------------------------------------------

export function formatUserContextForPrompt(ctx: UserDashboardContext): string {
  const courseList =
    ctx.courses.length > 0
      ? ctx.courses
          .map(
            (c, i) =>
              `  ${i + 1}. "${c.title}" (accuracy: ${c.accuracy}%, streak: ${c.streakDays}d` +
              (c.topicsMastered.length
                ? `, mastered: ${c.topicsMastered.slice(0, 4).join(', ')})`
                : ')'),
          )
          .join('\n')
      : '  (none yet)';

  const weakActionsList =
    ctx.weakTopicDetails && ctx.weakTopicDetails.length > 0
      ? ctx.weakTopicDetails
          .map((w) => `  - ${w.topic}${w.subTopic ? ` (${w.subTopic})` : ''}: ${w.recommendedAction}`)
          .join('\n')
      : ctx.weakTopics.length > 0
      ? ctx.weakTopics.slice(0, 8).map(t => `  - ${t}: Low accuracy, needs practice`).join('\n')
      : '  None identified yet';

  const masteredList =
    ctx.masteredTopics && ctx.masteredTopics.length > 0
      ? ctx.masteredTopics.join(', ')
      : 'None yet';

  return [
    `[Student: ${ctx.studentName} | Goal: ${ctx.learningGoal ?? 'not set'} | Overall accuracy: ${ctx.overallAccuracy}%]`,
    `Enrolled courses (${ctx.courses.length}):`,
    courseList,
    `Mastered Topics (DO NOT focus on these unless student requests): ${masteredList}`,
    `Weak Topics & Recommended Actions (PRIORITIZE THESE for guidance and practice):`,
    weakActionsList,
    `Use this data to tailor study recommendations specifically to weak sub-topics. Do NOT repeat raw numbers unless asked.`,
  ].join('\n');
}
