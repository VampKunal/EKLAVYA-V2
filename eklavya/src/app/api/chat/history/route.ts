import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';
import { getRedis } from '@/lib/redis';

const CHAT_HISTORY_TTL = 24 * 60 * 60; // 24 hours in Redis

function cacheKey(userId: string, courseId: string) {
  return `eklavya:chathistory:${userId}:${courseId}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || 'global';
    const userId = session.user.id;
    const key = cacheKey(userId, courseId);

    // 1. Try Redis cache first
    const redis = getRedis();
    if (redis) {
      try {
        const cached = await redis.get<any>(key);
        if (cached) {
          return NextResponse.json(cached);
        }
      } catch (err) {
        console.warn('[chat-history] Redis get failed:', err);
      }
    }

    // 2. Fallback to MongoDB
    await connectDB();
    const history = await ChatHistory.findOne({ 
      userId, 
      courseId 
    });

    const result = history || { messages: [] };

    // 3. Populate Redis cache asynchronously
    if (redis && history) {
      redis.set(key, JSON.parse(JSON.stringify(result)), { ex: CHAT_HISTORY_TTL }).catch((err) => {
        console.warn('[chat-history] Redis set failed:', err);
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId = 'global', messages } = await req.json();

    if (!messages) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const userId = session.user.id;
    const targetCourseId = courseId || 'global';
    const key = cacheKey(userId, targetCourseId);

    await connectDB();

    const history = await ChatHistory.findOneAndUpdate(
      { userId, courseId: targetCourseId },
      { $set: { messages } },
      { upsert: true, returnDocument: 'after' }
    );

    const historyObj = JSON.parse(JSON.stringify(history));

    // Update Redis cache immediately
    const redis = getRedis();
    if (redis) {
      try {
        await redis.set(key, historyObj, { ex: CHAT_HISTORY_TTL });
      } catch (err) {
        console.warn('[chat-history] Redis update failed:', err);
      }
    }

    return NextResponse.json(historyObj);
  } catch (error) {
    console.error('Error saving chat history:', error);
    return NextResponse.json({ error: 'Failed to save chat history' }, { status: 500 });
  }
}

