'use client';

import React, { useEffect, useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { WeakTopics } from '@/components/dashboard/WeakTopics';
import { Brain, Target, Flame, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!analytics) return <div>Failed to load analytics data.</div>;

  const { overview, progressData, recentAttemptsList, weakTopics } = analytics;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Quizzes" value={overview.totalQuizzes} icon={<Brain size={20} />} />
        <StatCard
          title="Average Score"
          value={`${overview.averageScore}%`}
          icon={<Target size={20} />}
          trend={overview.averageScore >= 80 ? 'Excellent' : 'Keep practicing'}
          trendPositive={overview.averageScore >= 80}
        />
        <StatCard
          title="Max Streak"
          value={`${overview.streak} Days`}
          icon={<Flame size={20} className={overview.streak > 0 ? 'text-orange-500' : ''} />}
        />
      </div>

      {/* Chart + Side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProgressChart data={progressData} />

        <div className="space-y-6">
          <WeakTopics topics={weakTopics} />

          {recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommended Action</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                      <p className="font-semibold text-blue-900 dark:text-blue-100 text-sm">{rec.topic}</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Attempts Table — always visible, no topic needed */}
      {recentAttemptsList && recentAttemptsList.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Quiz Attempts</CardTitle>
              <Link href="/analytics" className="text-xs text-blue-500 hover:underline">
                View full analytics →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Course</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Topic</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Score</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Result</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttemptsList.map((attempt: any) => (
                    <tr key={attempt.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <td className="py-3 pr-4 font-medium">{attempt.courseName}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{attempt.topic || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          attempt.score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : attempt.score >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}>
                          {attempt.score}%
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={12} />{attempt.correctCount}
                          </span>
                          <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400">
                            <XCircle size={12} />{attempt.totalQuestions - attempt.correctCount}
                          </span>
                          <span>/ {attempt.totalQuestions}</span>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground text-xs">{attempt.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
