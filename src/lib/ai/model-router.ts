import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { LanguageModelV1 } from '@ai-sdk/provider';

type TaskType = 'coding' | 'math' | 'general' | 'fast' | 'reasoning';

interface ModelRouter {
  getBestModel: (task: TaskType) => LanguageModelV1;
}

export const modelRouter: ModelRouter = {
  getBestModel: (task: TaskType): LanguageModelV1 => {
    switch (task) {
      case 'coding':
        // Claude 3.5 Sonnet is excellent for coding
        return anthropic('claude-3-5-sonnet-20240620');
      case 'math':
        // Gemini 1.5 Pro is strong at reasoning and math
        return google('models/gemini-1.5-pro-latest');
      case 'reasoning':
        return openai('gpt-4o');
      case 'fast':
        // Fast and cheap model for simple tasks
        return google('models/gemini-1.5-flash-latest');
      case 'general':
      default:
        // Good all-rounder
        return openai('gpt-4o-mini');
    }
  },
};

export function callModel(taskType: TaskType = 'general') {
  return modelRouter.getBestModel(taskType);
}
