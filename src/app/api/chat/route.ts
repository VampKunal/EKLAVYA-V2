import { streamText, ModelMessage } from 'ai';
import { detectIntent } from '@/lib/ai/orchestrator';
import { callModel } from '@/lib/ai/model-router';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts';
import { NextResponse } from 'next/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, courseId } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1];

    // 1. Detect Intent using orchestrator
    const intent = await detectIntent(latestMessage.content);
    
    // 2. Select appropriate model based on intent
    let taskType: 'coding' | 'math' | 'general' = 'general';
    if (intent === 'coding') taskType = 'coding';
    if (intent === 'math') taskType = 'math';
    // Add logic here later for 'doubt' -> RAG, 'quiz' -> quiz generation, etc.

    const model = callModel(taskType);

    // 3. Build system prompt
    let systemPrompt = SYSTEM_PROMPTS.GENERAL_TUTOR;
    
    // Example: if it's a specific course, we could inject course metadata here.
    if (courseId) {
      systemPrompt += `\nYou are currently helping the student with the course ID: ${courseId}. Contextualize your answers accordingly.`;
    }

    // 4. Stream Response
    const result = streamText({
      model,
      system: systemPrompt,
      messages: messages as ModelMessage[],
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}
