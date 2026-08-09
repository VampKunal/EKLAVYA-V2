import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { BrainCircuit, CheckCircle2, RotateCw } from 'lucide-react';

interface RetentionItem {
  topic: string;
  accuracy: number;
  daysSince: number;
  status: 'Mastered' | 'Needs Work' | 'Needs Refresh';
}

interface RetentionViewProps {
  data: RetentionItem[];
}

export function RetentionView({ data }: RetentionViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="text-purple-500" size={20} />
          Knowledge Retention
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(!data || data.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Take some quizzes to see your retention analysis.
          </p>
        ) : (
          <div className="space-y-4">
            {data.slice(0, 5).map((item, idx) => {
              let Icon = CheckCircle2;
              let iconColor = 'text-emerald-500';
              let badgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';

              if (item.status === 'Needs Work') {
                iconColor = 'text-rose-500';
                badgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
              } else if (item.status === 'Needs Refresh') {
                Icon = RotateCw;
                iconColor = 'text-amber-500';
                badgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
              }

              return (
                <div key={idx} className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                  <div className={`mt-1 ${iconColor}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{item.topic}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.daysSince === 0 ? 'Practiced today' : `Practiced ${item.daysSince} days ago`} • {item.accuracy}% accuracy
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
