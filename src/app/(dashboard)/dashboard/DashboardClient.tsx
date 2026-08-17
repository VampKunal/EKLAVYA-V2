'use client';

import React, { useEffect, useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { WeakTopics } from '@/components/dashboard/WeakTopics';
import { Brain, Target, Flame, Loader2, CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export function DashboardClient() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [analyticsRes, recsRes] = await Promise.all([
          fetch('/api/analytics'),
          fetch('/api/recommendations'),
        ]);
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
        if (recsRes.ok) setRecommendations((await recsRes.json()).recommendations ?? []);
      } catch (e) {
        console.error('Failed to fetch dashboard data', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-orange-500" size={36} />
      </div>
    );
  }

  if (!analytics) return <div className="p-6 font-mono text-stone-600 bg-orange-50 rounded-xl border border-orange-200">Failed to load analytics data.</div>;

  const { overview, progressData, recentAttemptsList, weakTopics } = analytics;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Quizzes" value={overview.totalQuizzes} icon={<Brain size={20} className="text-orange-500" />} />
        <StatCard
          title="Average Score"
          value={`${overview.averageScore}%`}
          icon={<Target size={20} className="text-orange-500" />}
          trend={overview.averageScore >= 80 ? 'Excellent' : 'Keep practicing'}
          trendPositive={overview.averageScore >= 80}
        />
        <StatCard
          title="Max Streak"
          value={`${overview.streak} Days`}
          icon={<Flame size={20} className="text-orange-500 fill-orange-500 animate-pulse" />}
        />
      </div>

      {/* Chart + Side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProgressChart data={progressData} />

        <div className="space-y-6">
          <WeakTopics topics={weakTopics} />

          {recommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b border-orange-100">
                <CardTitle className="flex items-center gap-2 text-stone-900 font-mono font-bold text-lg">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  Recommended Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3.5 bg-orange-50/60 rounded-xl border border-orange-200/80 flex justify-between items-center gap-3">
                      <div>
                        <p className="font-mono font-bold text-stone-900 text-sm">{rec.topic}</p>
                        <p className="text-xs text-stone-600 mt-0.5">{rec.reason}</p>
                      </div>
                      <Link href={`/quiz?topic=${encodeURIComponent(rec.topic)}`}>
                        <Button size="sm" variant="primary">
                          Practice
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Attempts Table */}
      {recentAttemptsList && recentAttemptsList.length > 0 ? (
        <Card>
          <CardHeader className="pb-3 border-b border-orange-100">
            <div className="flex items-center justify-between">
              <CardTitle className="font-mono font-bold text-lg text-stone-900">Recent Quiz Attempts</CardTitle>
              <Link href="/analytics" className="text-xs font-mono font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
                View full analytics <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-orange-100">
                    <th className="text-left py-2.5 pr-4 font-mono font-bold text-xs uppercase tracking-wider text-stone-500">Course</th>
                    <th className="text-left py-2.5 pr-4 font-mono font-bold text-xs uppercase tracking-wider text-stone-500">Topic</th>
                    <th className="text-left py-2.5 pr-4 font-mono font-bold text-xs uppercase tracking-wider text-stone-500">Score</th>
                    <th className="text-left py-2.5 pr-4 font-mono font-bold text-xs uppercase tracking-wider text-stone-500">Result</th>
                    <th className="text-left py-2.5 font-mono font-bold text-xs uppercase tracking-wider text-stone-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttemptsList.map((attempt: any) => (
                    <tr key={attempt.id} className="border-b border-orange-50 hover:bg-orange-50/30 transition-colors last:border-0">
                      <td className="py-3 pr-4 font-mono font-bold text-stone-900">{attempt.courseName}</td>
                      <td className="py-3 pr-4 text-stone-600 font-mono text-xs">{attempt.topic || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-bold border ${
                          attempt.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : attempt.score >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {attempt.score}%
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-600">
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 size={13} />{attempt.correctCount}
                          </span>
                          <span className="flex items-center gap-1 text-red-500">
                            <XCircle size={13} />{attempt.totalQuestions - attempt.correctCount}
                          </span>
                          <span className="text-stone-400">/ {attempt.totalQuestions}</span>
                        </div>
                      </td>
                      <td className="py-3 text-stone-500 font-mono text-xs">{attempt.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-orange-50/40 border-dashed border-orange-200">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Brain className="w-12 h-12 text-orange-400 mb-3" />
            <h3 className="text-lg font-mono font-bold text-stone-900 mb-1">No Quizzes Taken Yet</h3>
            <p className="text-sm text-stone-600 max-w-sm mb-5">Start taking quizzes to build your streak and see your analytics.</p>
            <Link href="/quiz">
              <Button variant="primary">
                Take Your First Quiz
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
