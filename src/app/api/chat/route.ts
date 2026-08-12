import { streamText, convertToModelMessages } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { detectIntent } from '@/lib/ai/orchestrator';
import { callModel } from '@/lib/ai/model-router';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts';
import { retrieveContext } from '@/lib/ai/rag';
import { getUserDashboardContext, formatUserContextForPrompt, needsDashboardContext } from '@/lib/ai/user-context';
import { NextResponse } from 'next/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, courseId } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    // 0. Get the logged-in user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const latestMessage = messages[messages.length - 1];

    // Extract plain text from the UI message (v5 uses parts[], not content)
    const latestText: string = Array.isArray(latestMessage.parts)
      ? latestMessage.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
      : latestMessage.content ?? '';

    // 1. Detect Intent using orchestrator
    const intent = await detectIntent(latestText);
    
    // 2. Select appropriate model based on intent
    let taskType: 'coding' | 'math' | 'general' = 'general';
    if (intent === 'coding') taskType = 'coding';
    if (intent === 'math') taskType = 'math';

    const model = callModel(taskType);

    // 3. Build system prompt — start with the base tutor prompt
    let systemPrompt = SYSTEM_PROMPTS.GENERAL_TUTOR;

    // 3a. Inject the student's personal dashboard context ONLY when relevant
    //     (recommendation intent, or message asks about courses/progress/weak topics)
    //     → saves tokens on every coding / math / general question
    if (needsDashboardContext(intent, latestText)) {
      try {
        const dashCtx = await getUserDashboardContext(
          session.user.id,
          session.user.name ?? 'Student',
          (session.user as any).learningGoal,
        );
        systemPrompt += '\n\n' + formatUserContextForPrompt(dashCtx);
      } catch (err) {
        console.warn('[chat] Failed to load user dashboard context:', err);
      }
    }

    // 3b. If inside a specific course, inject course metadata + strict course-specific RAG context
    if (courseId) {
      try {
        const Course = (await import('@/models/Course')).default;
        const connectToDatabase = (await import('@/lib/mongodb')).default;
        await connectToDatabase();
        const course = await Course.findById(courseId).select('title description').lean();
        if (course) {
          systemPrompt += `\n\nYou are the specialized AI tutor for the course: "${course.title}". (${course.description || ''})\nFocus your answers strictly on this course's curriculum and materials.`;
        }
      } catch (err) {
        systemPrompt += `\nYou are currently helping the student with the course ID: ${courseId}. Contextualize your answers accordingly.`;
      }

      // Always retrieve course-specific RAG context
      const ragResult = await retrieveContext(latestText, courseId);
      if (ragResult.hasContext && ragResult.context) {
        systemPrompt += `\n\nUse the following course material context to answer the student's question:\n\nCourse Materials:\n${ragResult.context}`;
      }
      if (ragResult.error) {
        console.warn('[chat] RAG retrieval failed for courseId:', courseId, ragResult.error);
      }
    }


    // 4. Stream Response
    const result = streamText({
      model,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}
