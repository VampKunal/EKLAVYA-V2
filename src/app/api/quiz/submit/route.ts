import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { asyncHandler } from '@/utils/asyncHandler';
import QuizAttempt from '@/models/QuizAttempt';
import UserProgress from '@/models/UserProgress';
import connectToDatabase from '@/lib/mongodb';

export const POST = asyncHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { courseId, subjectId, topic, questions, timeTaken } = await req.json();

  if (!courseId || !questions || !Array.isArray(questions)) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  await connectToDatabase();

  let correctCount = 0;
  const gradedQuestions = questions.map((q: any) => {
    // Trim both sides — LLMs often add trailing whitespace/newlines to correctAnswer
    const isCorrect = q.userAnswer?.trim() === q.correctAnswer?.trim();
    if (isCorrect) correctCount++;
    return {
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      userAnswer: q.userAnswer,
      isCorrect,
    };
  });

  const score = Math.round((correctCount / questions.length) * 100);

  const attempt = new QuizAttempt({
    userId: session.user.id,
    courseId,
    subjectId,
    topic,
    questions: gradedQuestions,
    score,
    timeTaken,
  });

  await attempt.save();

  // Update UserProgress
  let progress = await UserProgress.findOne({
    userId: session.user.id,
    courseId,
  });

  if (!progress) {
    progress = new UserProgress({
      userId: session.user.id,
      courseId,
      subjectId,
      topicsMastered: score >= 80 && topic ? [topic] : [],
      weakTopics: [],
      topicsPracticed: [],
      accuracy: score,
      streakDays: 1,
      lastActivity: new Date(),
    });
  } else {
    progress.accuracy = Math.round((progress.accuracy + score) / 2);
    progress.lastActivity = new Date();
  }

  if (topic) {
    // 1. Update topicsPracticed
    const existingPracticeIndex = (progress.topicsPracticed || []).findIndex((tp: any) => tp.topic.toLowerCase() === topic.toLowerCase());
    if (existingPracticeIndex >= 0) {
      const prev = progress.topicsPracticed[existingPracticeIndex];
      const newAttempts = prev.attempts + 1;
      const newAvg = Math.round((prev.averageScore * prev.attempts + score) / newAttempts);
      progress.topicsPracticed[existingPracticeIndex] = {
        topic,
        attempts: newAttempts,
        averageScore: newAvg,
        lastPracticed: new Date(),
      };
    } else {
      progress.topicsPracticed = progress.topicsPracticed || [];
      progress.topicsPracticed.push({
        topic,
        attempts: 1,
        averageScore: score,
        lastPracticed: new Date(),
      });
    }

    // 2. Classify Weak vs Mastered Topic
    if (score < 75) {
      // Weak topic -> Add/Update weakTopics with recommended action
      const action = `Accuracy is ${score}%. Practice weak sub-topics of "${topic}" and review reference notes.`;
      const weakIndex = (progress.weakTopics || []).findIndex((wt: any) => wt.topic.toLowerCase() === topic.toLowerCase());
      if (weakIndex >= 0) {
        progress.weakTopics[weakIndex] = {
          topic,
          accuracy: score,
          recommendedAction: action,
          updatedAt: new Date(),
        };
      } else {
        progress.weakTopics = progress.weakTopics || [];
        progress.weakTopics.push({
          topic,
          accuracy: score,
          recommendedAction: action,
          updatedAt: new Date(),
        });
      }
      // Remove from mastered if accuracy dropped below 75%
      progress.topicsMastered = (progress.topicsMastered || []).filter((t: string) => t.toLowerCase() !== topic.toLowerCase());
    } else {
      // Mastered / Good score -> Remove from weakTopics
      progress.weakTopics = (progress.weakTopics || []).filter((wt: any) => wt.topic.toLowerCase() !== topic.toLowerCase());
      if (score >= 80 && !progress.topicsMastered.some((t: string) => t.toLowerCase() === topic.toLowerCase())) {
        progress.topicsMastered.push(topic);
      }
    }

  }

  await progress.save();


  return NextResponse.json({ attempt, progress });
});
