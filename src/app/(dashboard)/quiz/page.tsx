import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import QuizAttempt from '@/models/QuizAttempt';
import Course from '@/models/Course';
import { redirect } from 'next/navigation';
import { QuizDashboardClient } from './QuizDashboardClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Trophy, Clock, Target } from 'lucide-react';
import Link from 'next/link';

export default async function QuizDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect('/api/auth/signin');
  }

  await connectToDatabase();

  const attempts = await QuizAttempt.find({ userId: session.user.id })
    .populate('courseId', 'title')
    .sort({ createdAt: -1 })
    .lean();
    
  const courses = await Course.find({ 
    $or: [
      { isPublic: true },
      { createdBy: session.user.id }
    ]
  }).lean();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-muted-foreground">
            Test your knowledge and track your progress.
          </p>
        </div>
        <QuizDashboardClient courses={JSON.parse(JSON.stringify(courses))} />
      </div>

      <div className="grid gap-4">
        <h2 className="text-2xl font-bold tracking-tight mt-4">Past Attempts</h2>
        {attempts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              You haven't taken any quizzes yet. Generate one to get started!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {attempts.map((attempt: any) => (
              <Card key={attempt._id.toString()}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-start">
                    <span>{attempt.courseId?.title || 'Unknown Course'}</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      attempt.score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                      attempt.score >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {attempt.score}%
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div className="flex items-center gap-2">
                      <Target size={16} />
                      {attempt.questions.length} Questions
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      {formatTime(attempt.timeTaken)}
                    </div>
                    <div className="text-xs pt-2">
                      {new Date(attempt.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
