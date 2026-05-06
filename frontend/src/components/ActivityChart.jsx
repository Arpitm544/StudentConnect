import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const ActivityChart = ({ theme }) => {
  // Realistic sample data for academic productivity
  const data = useMemo(() => [
    { day: 'Mon', postings: 4, completions: 2, activity: 15 },
    { day: 'Tue', postings: 7, completions: 3, activity: 25 },
    { day: 'Wed', postings: 5, completions: 5, activity: 32 },
    { day: 'Thu', postings: 8, completions: 4, activity: 28 },
    { day: 'Fri', postings: 12, completions: 8, activity: 45 },
    { day: 'Sat', postings: 6, completions: 9, activity: 50 },
    { day: 'Sun', postings: 3, completions: 7, activity: 38 },
  ], []);

  const isDark = theme === 'dark';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border-subtle p-4 rounded-2xl shadow-xl backdrop-blur-md bg-opacity-90">
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">{label}</p>
          <div className="space-y-2">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[12px] font-semibold text-text-primary">{entry.name}:</span>
                <span className="text-[12px] font-bold text-text-primary ml-auto">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradientPostings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F8CFF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4F8CFF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientCompletions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientActivity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid 
            strokeDasharray="4 4" 
            vertical={false} 
            stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 
          />

          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }} 
            dy={10} 
          />

          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Analytics Lines */}
          <ReferenceLine 
            y={30} 
            stroke="#8B5CF6" 
            strokeDasharray="3 3" 
            label={{ position: 'right', value: 'Avg. Activity', fill: '#8B5CF6', fontSize: 10, fontWeight: 'bold' }} 
          />
          <ReferenceLine 
            y={10} 
            stroke="#F59E0B" 
            strokeDasharray="3 3" 
            label={{ position: 'right', value: 'Target', fill: '#F59E0B', fontSize: 10, fontWeight: 'bold' }} 
          />

          {/* Series */}
          <Area
            type="monotone"
            name="Market Activity"
            dataKey="activity"
            stroke="#8B5CF6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#gradientActivity)"
          />
          <Area
            type="monotone"
            name="Postings"
            dataKey="postings"
            stroke="#4F8CFF"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#gradientPostings)"
          />
          <Area
            type="monotone"
            name="Completions"
            dataKey="completions"
            stroke="#10B981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#gradientCompletions)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ActivityChart;
