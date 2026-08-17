import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-mono font-bold text-stone-900 dark:text-white tracking-tight">Quizzes</h1>
          <p className="text-stone-600 dark:text-stone-400 font-mono text-sm">
            Test your knowledge and track your learning progress.
          </p>
        </div>
        <QuizDashboardClient courses={JSON.parse(JSON.stringify(courses))} />
      </div>

      <div className="grid gap-4">
        <h2 className="text-xl font-mono font-bold text-stone-900 dark:text-white tracking-tight mt-4">Past Attempts</h2>
        {attempts.length === 0 ? (
          <Card className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-orange-100 dark:border-stone-800">
            <CardContent className="py-12 text-center text-stone-500 font-mono text-sm">
              You haven't taken any quizzes yet. Generate one to get started!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {attempts.map((attempt: any) => (
              <Link key={attempt._id.toString()} href={`/quiz/${attempt._id.toString()}`}>
                <Card className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-orange-100 dark:border-stone-800 hover:border-orange-300 dark:hover:border-orange-700/50 hover:shadow-lg transition-all duration-300 cursor-pointer h-full group">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-mono font-bold flex justify-between items-start text-stone-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      <span className="line-clamp-1">{attempt.courseId?.title || 'Unknown Course'}</span>
                      <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                        attempt.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' : 
                        attempt.score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' : 
                        'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
                      }`}>
                        {attempt.score}%
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs font-mono text-stone-500 dark:text-stone-400 space-y-2">
                      <div className="flex items-center gap-2">
                        <Target size={14} className="text-orange-500" />
                        {attempt.questions?.length || 0} Questions
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-orange-500" />
                        {formatTime(attempt.timeTaken || 0)}
                      </div>
                      <div className="text-[11px] pt-2 text-stone-400 dark:text-stone-500">
                        {new Date(attempt.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
