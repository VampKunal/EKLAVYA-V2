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
    <Card className="hover:border-orange-300 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">
            {title}
          </p>
          <div className="p-2.5 rounded-xl bg-orange-50 text-orange-500 border border-orange-100">
            {icon}
          </div>
        </div>
        <div className="flex items-baseline space-x-3 mt-1">
          <h2 className="text-3xl font-mono font-black text-stone-900 tracking-tight">{value}</h2>
          {trend && (
            <p className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
              trendPositive 
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                : 'bg-rose-50 text-rose-600 border border-rose-200'
            }`}>
              {trend}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
