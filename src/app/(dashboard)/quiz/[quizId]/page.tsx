'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { ResultView } from '@/components/quiz/ResultView';
import { Loader2 } from 'lucide-react';

export default function QuizTakingPage() {
  const params = useParams();
  const router = useRouter();
  const [quizData, setQuizData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [resultData, setResultData] = useState<any>(null);

  useEffect(() => {
    if (params.quizId === 'new') {
      const stored = sessionStorage.getItem('pendingQuiz');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setQuizData(parsed);
          setStartTime(Date.now());
        } catch (e) {
          router.push('/quiz');
        }
      } else {
        router.push('/quiz');
      }
    } else {
      // MVP: Viewing past quizzes not fully implemented in this view, redirect to dashboard
      router.push('/quiz');
    }
  }, [params.quizId, router]);

  if (!quizData && !resultData) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  }

  if (resultData) {
    return (
      <ResultView 
        score={resultData.attempt.score}
        timeTaken={resultData.attempt.timeTaken}
        questions={resultData.attempt.questions}
        onBack={() => router.push('/quiz')}
      />
    );
  }

  const { quiz, courseId, topic } = quizData;
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  const handleSelectOption = (option: string) => {
    setAnswers({
      ...answers,
      [currentQuestionIndex]: option
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    const questionsToSubmit = quiz.questions.map((q: any, index: number) => ({
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      userAnswer: answers[index] || '',
    }));

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          topic,
          questions: questionsToSubmit,
          timeTaken,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit quiz');
      }

      const data = await res.json();
      sessionStorage.removeItem('pendingQuiz');
      setResultData(data);
    } catch (error) {
      console.error(error);
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allAnswered = Object.keys(answers).length === quiz.questions.length;

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Quiz: {topic || 'Generated Topic'}
        </h1>
        <span className="text-sm font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl leading-relaxed">
            {currentQuestion.questionText}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.options.map((option: string, idx: number) => {
            const isSelected = answers[currentQuestionIndex] === option;
            return (
              <div 
                key={idx}
                onClick={() => handleSelectOption(option)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-blue-600' : 'border-slate-300'
                  }`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                  </div>
                  <span>{option}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <Button 
            variant="outline" 
            onClick={handlePrevious} 
            disabled={currentQuestionIndex === 0 || isSubmitting}
          >
            Previous
          </Button>
          
          {!isLastQuestion ? (
            <Button 
              onClick={handleNext} 
              disabled={!answers[currentQuestionIndex]}
            >
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={!allAnswered || isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? <><Loader2 className="animate-spin mr-2" size={16} /> Submitting...</> : 'Submit Quiz'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
