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
    accuracy >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : accuracy >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-bold border ${color}`}>
      {accuracy}%
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'Mastered') return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (status === 'Needs Refresh') return <RotateCw size={14} className="text-amber-500" />;
  return <AlertTriangle size={14} className="text-red-500" />;
}

function CourseCard({ course }: { course: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-500 border border-orange-100">
              <BookOpen size={18} />
            </div>
            <CardTitle className="text-base font-mono font-bold text-stone-900">{course.courseName}</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <AccuracyBadge accuracy={course.averageScore} />
            <span className="text-xs font-mono text-stone-500">{course.totalQuizzes} quiz{course.totalQuizzes !== 1 ? 'zes' : ''}</span>
            {expanded ? <ChevronDown size={18} className="text-stone-400" /> : <ChevronRight size={18} className="text-stone-400" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-2 border-t border-orange-100">
          {/* Individual attempt history */}
          <div>
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500 mb-2">Attempt History</p>
            <div className="space-y-1.5">
              {course.recentAttempts.map((a: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-orange-50 last:border-0">
                  <div className="flex items-center gap-2 text-stone-600 font-mono text-xs">
                    <span>{a.date}</span>
                    {a.topic && <span className="bg-orange-100/60 text-orange-800 px-2 py-0.5 rounded-md font-bold">{a.topic}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-600">
                      <CheckCircle2 size={13} />{a.correct}/{a.total}
                    </span>
                    <AccuracyBadge accuracy={a.score} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topic breakdown */}
          {course.topicsBreakdown.length > 0 && (
            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500 mb-2">By Topic</p>
              <div className="space-y-1.5">
                {course.topicsBreakdown.map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-orange-50 last:border-0">
                    <div className="flex items-center gap-2 font-mono font-bold text-stone-800">
                      <StatusIcon status={t.status} />
                      <span>{t.topic}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <AccuracyBadge accuracy={t.accuracy} />
                      <span className="text-xs font-mono text-stone-500 w-16 text-right">
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
        <CardContent className="py-10 text-center text-stone-500 font-mono text-sm">
          Take some quizzes with a topic to see your topic-level analytics.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-orange-100 pb-3">
        <CardTitle className="flex items-center gap-2 font-mono font-bold text-stone-900">
          <Tag size={18} className="text-orange-500" />
          All Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-100">
                <th className="text-left py-2.5 pr-4 font-mono font-bold text-xs uppercase tracking-wider text-stone-500">Topic</th>
                <th className="text-left py-2.5 pr-4 font-mono font-bold text-xs uppercase tracking-wider text-stone-500">Course</th>
                <th className="text-left py-2.5 pr-4 font-mono font-bold text-xs uppercase tracking-wider text-stone-500">Accuracy</th>
                <th className="text-left py-2.5 pr-4 font-mono font-bold text-xs uppercase tracking-wider text-stone-500">Status</th>
                <th className="text-left py-2.5 font-mono font-bold text-xs uppercase tracking-wider text-stone-500">Last Practiced</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t, i) => (
                <tr key={i} className="border-b border-orange-50 hover:bg-orange-50/30 transition-colors last:border-0">
                  <td className="py-3 pr-4 font-mono font-bold text-stone-900">{t.topic}</td>
                  <td className="py-3 pr-4 text-stone-600 font-mono text-xs">{t.courseName}</td>
                  <td className="py-3 pr-4"><AccuracyBadge accuracy={t.accuracy} /></td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-stone-700">
                      <StatusIcon status={t.status} />
                      <span>{t.status}</span>
                    </div>
                  </td>
                  <td className="py-3 text-stone-500 font-mono text-xs">
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
        <Loader2 className="animate-spin text-orange-500" size={36} />
      </div>
    );
  }

  if (!analytics) return <div className="p-6 font-mono text-stone-600 bg-orange-50 rounded-xl border border-orange-200">Failed to load analytics data.</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'course', label: 'By Course' },
    { key: 'topic', label: 'By Topic' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-1.5 bg-orange-100/60 p-1.5 rounded-xl border border-orange-200/60 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              tab === t.key
                ? 'bg-white text-orange-600 shadow-md shadow-orange-500/10 border border-orange-200/80'
                : 'text-stone-600 hover:text-orange-600 hover:bg-orange-50/50'
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
              <CardContent className="py-10 text-center text-stone-500 font-mono text-sm">
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
