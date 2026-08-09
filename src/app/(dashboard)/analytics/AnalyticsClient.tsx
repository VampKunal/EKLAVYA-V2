'use client';

import React, { useEffect, useState } from 'react';
import { RetentionView } from '@/components/dashboard/RetentionView';
import { WeakTopics } from '@/components/dashboard/WeakTopics';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Loader2, BookOpen, Tag, ChevronDown, ChevronRight, CheckCircle2, RotateCw, AlertTriangle } from 'lucide-react';

type Tab = 'overview' | 'course' | 'topic';

function AccuracyBadge({ accuracy }: { accuracy: number }) {
  const color =
    accuracy >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : accuracy >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {accuracy}%
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'Mastered') return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (status === 'Needs Refresh') return <RotateCw size={14} className="text-amber-500" />;
  return <AlertTriangle size={14} className="text-rose-500" />;
}

function CourseCard({ course }: { course: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-blue-500" />
            <CardTitle className="text-base">{course.courseName}</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <AccuracyBadge accuracy={course.averageScore} />
            <span className="text-xs text-muted-foreground">{course.totalQuizzes} quiz{course.totalQuizzes !== 1 ? 'zes' : ''}</span>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Individual attempt history */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-medium">Attempt History</p>
            <div className="space-y-1.5">
              {course.recentAttempts.map((a: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <span>{a.date}</span>
                    {a.topic && <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{a.topic}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={11} />{a.correct}/{a.total}
                    </span>
                    <AccuracyBadge accuracy={a.score} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topic breakdown (only if topics exist) */}
          {course.topicsBreakdown.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-medium">By Topic</p>
              <div className="space-y-1.5">
                {course.topicsBreakdown.map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={t.status} />
                      <span>{t.topic}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AccuracyBadge accuracy={t.accuracy} />
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {t.daysSince === 0 ? 'Today' : `${t.daysSince}d ago`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}


function TopicTable({ topics }: { topics: any[] }) {
  if (topics.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          Take some quizzes with a topic to see your topic-level analytics.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag size={18} className="text-purple-500" />
          All Topics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Topic</th>
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Course</th>
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Accuracy</th>
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Last Practiced</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="py-3 pr-4 font-medium">{t.topic}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{t.courseName}</td>
                  <td className="py-3 pr-4"><AccuracyBadge accuracy={t.accuracy} /></td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={t.status} />
                      <span className="text-xs">{t.status}</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground text-xs">
                    {t.daysSince === 0 ? 'Today' : `${t.daysSince}d ago`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsClient() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics');
        if (res.ok) setAnalytics(await res.json());
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!analytics) return <div>Failed to load analytics data.</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'course', label: 'By Course' },
    { key: 'topic', label: 'By Topic' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white dark:bg-slate-700 shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-8">
          <ProgressChart data={analytics.progressData} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RetentionView data={analytics.retentionData} />
            <WeakTopics topics={analytics.weakTopics} />
          </div>
        </div>
      )}

      {/* By Course Tab */}
      {tab === 'course' && (
        <div className="space-y-4">
          {analytics.byCourse.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No quiz data found. Take a quiz to see your course breakdown.
              </CardContent>
            </Card>
          ) : (
            analytics.byCourse.map((course: any) => (
              <CourseCard key={course.courseId} course={course} />
            ))
          )}
        </div>
      )}

      {/* By Topic Tab */}
      {tab === 'topic' && (
        <TopicTable topics={analytics.byTopic} />
      )}
    </div>
  );
}
