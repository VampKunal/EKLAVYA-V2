import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, ArrowRight } from 'lucide-react';
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
      <CardHeader className="border-b border-orange-100/60 pb-4">
        <CardTitle className="font-mono font-bold flex items-center gap-2 text-stone-900">
          <AlertTriangle className="text-orange-500" size={20} />
          NEEDS IMPROVEMENT
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {(!topics || topics.length === 0) ? (
          <p className="text-sm font-mono text-stone-400 text-center py-6">
            Awesome work! No weak topics detected at present.
          </p>
        ) : (
          <div className="space-y-3.5">
            {topics.map((topic, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-orange-100/80 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-mono font-bold text-stone-900 text-sm">{topic.topic}</p>
                  <p className="text-xs font-mono text-stone-500 mt-0.5">
                    Accuracy: <span className="font-bold text-orange-600">{topic.accuracy}%</span>
                  </p>
                </div>
                <Link href={`/quiz?topic=${encodeURIComponent(topic.topic)}`}>
                  <Button variant="outline" size="sm" className="text-xs font-mono font-bold flex items-center gap-1 hover:border-orange-400 hover:bg-orange-50 text-orange-600 border-orange-200">
                    Practice <ArrowRight className="w-3 h-3" />
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
