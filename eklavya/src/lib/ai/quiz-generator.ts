import { generateObject } from 'ai';
import { z } from 'zod';
import { callModel } from './model-router';

export const quizSchema = z.object({
  questions: z.array(
    z.object({
      questionText: z.string().describe('The question text'),
      options: z.array(z.string()).describe('An array of 4 possible options'),
      correctAnswer: z.string().describe('The correct option exactly as it appears in the options array'),
      explanation: z.string().describe('A short explanation of why the answer is correct'),
    })
  ).describe('An array of generated multiple choice questions'),
});

export type GeneratedQuiz = z.infer<typeof quizSchema>;

export async function generateQuiz(topic: string, context?: string, count: number = 5): Promise<GeneratedQuiz> {
  const promptContext = context 
    ? `Use the following context to inform your questions:\n\n${context}\n\n` 
    : `Use your general knowledge about the subject to generate the questions.\n\n`;

  const prompt = `You are an expert tutor creating a multiple choice quiz for a student.
Generate ${count} high-quality, challenging multiple choice questions about the topic: "${topic}".
${promptContext}
Make sure each question has exactly 4 options. The options should be plausible.
Ensure the 'correctAnswer' exactly matches one of the strings in the 'options' array.
Include an explanation for the correct answer.`;

  try {
    const { object } = await generateObject({
      model: callModel('general'),
      schema: quizSchema,
      prompt: prompt,
    });
    
    return object;
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw new Error('Failed to generate quiz');
  }
}
