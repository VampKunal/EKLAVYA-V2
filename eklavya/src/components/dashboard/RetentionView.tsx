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
      <CardHeader className="border-b border-orange-100/60 pb-4">
        <CardTitle className="font-mono font-bold flex items-center gap-2 text-stone-900">
          <BrainCircuit className="text-orange-500" size={20} />
          KNOWLEDGE RETENTION
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {(!data || data.length === 0) ? (
          <p className="text-sm font-mono text-stone-400 text-center py-6">
            Take quizzes to generate your retention metrics.
          </p>
        ) : (
          <div className="space-y-4">
            {data.slice(0, 5).map((item, idx) => {
              let Icon = CheckCircle2;
              let iconColor = 'text-emerald-500';
              let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

              if (item.status === 'Needs Work') {
                iconColor = 'text-rose-500';
                badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
              } else if (item.status === 'Needs Refresh') {
                Icon = RotateCw;
                iconColor = 'text-orange-500';
                badgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
              }

              return (
                <div key={idx} className="flex items-start gap-3 border-b border-orange-100/80 pb-3 last:border-0 last:pb-0">
                  <div className={`mt-0.5 ${iconColor}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-bold text-stone-900 text-sm">{item.topic}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${badgeColor}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-stone-500 mt-1">
                      {item.daysSince === 0 ? 'Practiced today' : `Practiced ${item.daysSince} days ago`} • <span className="font-bold text-stone-700">{item.accuracy}% accuracy</span>
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
