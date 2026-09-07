'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ProgressChartProps {
  data: { date: string; score: number; topic: string }[];
}

export function ProgressChart({ data }: ProgressChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-mono font-bold flex items-center gap-2 text-stone-900">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            SCORE PROGRESSION
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center font-mono text-sm text-stone-400">
          No quiz data recorded yet. Complete a quiz to analyze progress!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="border-b border-orange-100/60 pb-4">
        <CardTitle className="font-mono font-bold flex items-center gap-2 text-stone-900">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          SCORE PROGRESSION
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffedd5" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#78716c', fontFamily: 'monospace', fontWeight: 'bold' }} dy={10} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#78716c', fontFamily: 'monospace', fontWeight: 'bold' }} dx={-10} />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: '1px solid #fed7aa', 
                  backgroundColor: '#ffffff',
                  boxShadow: '0 10px 15px -3px rgba(249, 115, 22, 0.1)',
                  fontFamily: 'monospace'
                }}
                labelStyle={{ fontWeight: 'bold', color: '#1c1917' }}
                formatter={(value: any) => [`${value ?? 0}%`, 'Score']}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#f97316" 
                strokeWidth={3}
                dot={{ r: 5, fill: '#ea580c', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7, fill: '#c2410c' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
