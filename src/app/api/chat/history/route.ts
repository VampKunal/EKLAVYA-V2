import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    await connectDB();

    const history = await ChatHistory.findOne({ 
      userId: session.user.id, 
      courseId 
    });

    return NextResponse.json(history || { messages: [] });
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

    const { courseId, messages } = await req.json();

    if (!courseId || !messages) {
      return NextResponse.json({ error: 'Course ID and messages are required' }, { status: 400 });
    }

    await connectDB();

    const history = await ChatHistory.findOneAndUpdate(
      { userId: session.user.id, courseId },
      { $set: { messages } },
      { upsert: true, new: true }
    );

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error saving chat history:', error);
    return NextResponse.json({ error: 'Failed to save chat history' }, { status: 500 });
  }
}
