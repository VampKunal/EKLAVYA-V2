import { generateText } from 'ai';
import { callModel } from './model-router';
import { SYSTEM_PROMPTS } from './prompts';

export type Intent = 'chat' | 'doubt' | 'quiz' | 'recommendation' | 'coding' | 'math' | 'unknown';

export async function detectIntent(message: string): Promise<Intent> {
  try {
    const { text } = await generateText({
      model: callModel('fast'), // Use the fast model for routing
      system: SYSTEM_PROMPTS.INTENT_DETECTION,
      prompt: message,
    });
    
    const intent = text.trim().toLowerCase() as Intent;
    
    // Validate the intent
    const validIntents: Intent[] = ['chat', 'doubt', 'quiz', 'recommendation', 'coding', 'math'];
    if (validIntents.includes(intent)) {
      return intent;
    }
    
    return 'unknown';
  } catch (error) {
    console.error('Error detecting intent:', error);
    return 'unknown';
  }
}
