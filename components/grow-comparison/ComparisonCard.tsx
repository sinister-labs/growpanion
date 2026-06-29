"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { getComparisonDirection, getComparisonValueClass } from '@/lib/comparison-utils';

interface ComparisonMetric {
  label: string;
  value1: string | number;
  value2: string | number;
  unit?: string;
  higherIsBetter?: boolean;
}

interface ComparisonCardProps {
  title: string;
  icon?: React.ReactNode;
  metrics: ComparisonMetric[];
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({
  title,
  icon,
  metrics,
}) => {
  const renderValue = (value: string | number, unit?: string) => {
    if (value === '-') {
      return value;
    }

    return `${value}${unit || ''}`;
  };

  const getComparisonIcon = (
    value1: string | number,
    value2: string | number,
    higherIsBetter = true
  ) => {
    const direction = getComparisonDirection(value1, value2, higherIsBetter);

    if (direction === 'equal') {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }

    if (direction === 'first') {
      return <ArrowUp className="h-4 w-4 text-primary" />;
    }

    return <ArrowDown className="h-4 w-4 text-destructive" />;
  };

  const getValueColor = (
    value1: string | number,
    value2: string | number,
    isFirst: boolean,
    higherIsBetter = true
  ) => {
    return getComparisonValueClass(value1, value2, isFirst, higherIsBetter);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex-1">{metric.label}</span>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${getValueColor(metric.value1, metric.value2, true, metric.higherIsBetter)}`}>
                {renderValue(metric.value1, metric.unit)}
              </span>
              {getComparisonIcon(metric.value1, metric.value2, metric.higherIsBetter)}
              <span className={`text-sm font-medium ${getValueColor(metric.value1, metric.value2, false, metric.higherIsBetter)}`}>
                {renderValue(metric.value2, metric.unit)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

ComparisonCard.displayName = 'ComparisonCard';

export default ComparisonCard;
