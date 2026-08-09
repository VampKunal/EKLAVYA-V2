import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { CheckCircle, XCircle, Clock, Trophy } from 'lucide-react';

interface QuestionResult {
  questionText: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  explanation?: string;
}

interface ResultViewProps {
  score: number;
  timeTaken: number;
  questions: QuestionResult[];
  onRetry?: () => void;
  onBack?: () => void;
}

export function ResultView({ score, timeTaken, questions, onRetry, onBack }: ResultViewProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <Card className="text-center py-6">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <Trophy className={score >= 80 ? "text-yellow-500" : "text-slate-400"} size={32} />
            Quiz Complete!
          </CardTitle>
          <CardDescription>Here is how you did.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-slate-400">Score</p>
              <p className={`text-2xl font-bold ${score >= 80 ? 'text-green-500' : 'text-red-500'}`}>
                {score}%
              </p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-slate-400">Time Taken</p>
              <p className="text-2xl font-bold flex items-center justify-center gap-2">
                <Clock size={20} />
                {formatTime(timeTaken)}
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-center gap-4">
            {onRetry && (
              <button 
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Try Another
              </button>
            )}
            {onBack && (
              <button 
                onClick={onBack}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Question Breakdown</h3>
        {questions.map((q, idx) => (
          <Card key={idx} className={`border-l-4 ${q.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="mt-1">
                  {q.isCorrect ? (
                    <CheckCircle className="text-green-500" size={24} />
                  ) : (
                    <XCircle className="text-red-500" size={24} />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-lg">{q.questionText}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                    {q.options.map((opt, i) => {
                      let optionClass = "p-3 rounded-md border text-sm ";
                      
                      if (opt === q.correctAnswer) {
                        optionClass += "bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-800";
                      } else if (opt === q.userAnswer && !q.isCorrect) {
                        optionClass += "bg-red-100 border-red-500 dark:bg-red-900/30 dark:border-red-800";
                      } else {
                        optionClass += "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700";
                      }

                      return (
                        <div key={i} className={optionClass}>
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                  
                  {q.explanation && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-md text-sm">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
