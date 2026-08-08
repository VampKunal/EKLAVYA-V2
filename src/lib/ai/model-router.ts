import { google } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';

// OpenRouter gives access to free models (look for ":free" suffix models)
// Sign up at https://openrouter.ai and get a free key
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
});

type TaskType = 'coding' | 'math' | 'general' | 'fast' | 'reasoning';

interface ModelRouter {
  getBestModel: (task: TaskType) => LanguageModel;
}

/**
 * All models here are FREE to use:
 * - Google Gemini: Free tier via GOOGLE_AI_API_KEY (Google AI Studio)
 * - OpenRouter :free models: Free via OPENROUTER_API_KEY
 *
 * Free OpenRouter models:
 *   - meta-llama/llama-3.1-8b-instruct:free
 *   - mistralai/mistral-7b-instruct:free
 *   - deepseek/deepseek-chat:free
 *   - microsoft/phi-3-mini-128k-instruct:free
 */
export const modelRouter: ModelRouter = {
  getBestModel: (task: TaskType): LanguageModel => {
    switch (task) {
      case 'coding':
        return google('gemini-2.5-flash');
      case 'math':
        return google('gemini-2.5-pro');
      case 'reasoning':
        // DeepSeek is great at reasoning and has a free tier on OpenRouter
        return openrouter('deepseek/deepseek-chat:free');
      case 'fast':
        return google('gemini-2.5-flash-lite');
      case 'general':
      default:
        return google('gemini-2.5-flash-lite');
    }
  },
};

export function callModel(taskType: TaskType = 'general') {
  return modelRouter.getBestModel(taskType);
}
