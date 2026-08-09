import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface WeakTopic {
  topic: string;
  accuracy: number;
  lastAttemptDate: string | Date;
}

interface WeakTopicsProps {
  topics: WeakTopic[];
}

export function WeakTopics({ topics }: WeakTopicsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={20} />
          Needs Improvement
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(!topics || topics.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Great job! You don't have any weak topics right now.
          </p>
        ) : (
          <div className="space-y-4">
            {topics.map((topic, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{topic.topic}</p>
                  <p className="text-xs text-muted-foreground">Accuracy: {topic.accuracy}%</p>
                </div>
                <Link href={`/quiz?topic=${encodeURIComponent(topic.topic)}`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    Practice
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
