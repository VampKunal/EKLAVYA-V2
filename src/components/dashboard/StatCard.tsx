import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
}

export function StatCard({ title, value, icon, trend, trendPositive }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="text-slate-400 dark:text-slate-500">
            {icon}
          </div>
        </div>
        <div className="flex items-baseline space-x-3">
          <h2 className="text-3xl font-bold tracking-tight">{value}</h2>
          {trend && (
            <p className={`text-sm ${trendPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {trend}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
