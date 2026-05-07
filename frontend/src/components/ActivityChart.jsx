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

const ActivityChart = ({ theme, data }) => {
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
    <div className="h-[300px] w-full">
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
            <linearGradient id="gradientInProgress" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
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



          {/* Series */}
          <Area
            type="monotone"
            name="In-Progress Tasks"
            dataKey="inProgress"
            stroke="#F59E0B"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#gradientInProgress)"
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
