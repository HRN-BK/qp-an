"use client";

import React from 'react';

interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface SimpleBarChartProps {
  data: ChartDataPoint[];
  height?: number;
  className?: string;
  color?: string;
  maxValue?: number;
}

export function SimpleBarChart({
  data,
  height = 100,
  className = "",
  color = "hsl(var(--primary))",
  maxValue
}: SimpleBarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className={`flex items-end gap-1 ${className}`} style={{ height }}>
      {data.map((point, index) => {
        const barHeight = (point.value / max) * (height - 20); // Leave space for labels
        return (
          <div key={index} className="flex flex-col items-center flex-1 min-w-0">
            <div
              className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
              style={{
                height: Math.max(barHeight, 2), // Minimum height of 2px
                backgroundColor: color,
                marginBottom: '4px'
              }}
              title={`${point.label || point.date}: ${point.value}`}
            />
            <div className="text-xs text-muted-foreground truncate w-full text-center">
              {new Date(point.date).getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface MasteryBreakdownProps {
  mastery: {
    new: number;
    learning: number;
    young: number;
    mature: number;
    proficient: number;
    mastered: number;
    total: number;
  };
  className?: string;
}

export function MasteryBreakdown({ mastery, className = "" }: MasteryBreakdownProps) {
  const colors = {
    new: '#ef4444',      // red
    learning: '#f97316',  // orange
    young: '#eab308',     // yellow
    mature: '#22c55e',    // green
    proficient: '#3b82f6', // blue
    mastered: '#8b5cf6'   // purple
  };

  const levels = [
    { key: 'new', label: 'New', value: mastery.new, color: colors.new },
    { key: 'learning', label: 'Learning', value: mastery.learning, color: colors.learning },
    { key: 'young', label: 'Young', value: mastery.young, color: colors.young },
    { key: 'mature', label: 'Mature', value: mastery.mature, color: colors.mature },
    { key: 'proficient', label: 'Proficient', value: mastery.proficient, color: colors.proficient },
    { key: 'mastered', label: 'Mastered', value: mastery.mastered, color: colors.mastered }
  ];

  return (
    <div className={className}>
      {/* Stacked bar */}
      <div className="flex h-6 w-full rounded-lg overflow-hidden mb-4">
        {levels.map((level) => {
          const width = mastery.total > 0 ? (level.value / mastery.total) * 100 : 0;
          return (
            <div
              key={level.key}
              className="flex-none transition-all duration-300"
              style={{
                width: `${width}%`,
                backgroundColor: level.color
              }}
              title={`${level.label}: ${level.value} words`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {levels.map((level) => (
          <div key={level.key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: level.color }}
            />
            <span className="text-muted-foreground truncate">
              {level.label}: {level.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
