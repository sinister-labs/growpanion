"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

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
  const getComparisonIcon = (
    value1: string | number,
    value2: string | number,
    higherIsBetter = true
  ) => {
    const num1 = typeof value1 === 'number' ? value1 : parseFloat(value1.toString());
    const num2 = typeof value2 === 'number' ? value2 : parseFloat(value2.toString());

    if (isNaN(num1) || isNaN(num2) || num1 === num2) {
      return <Minus className="h-4 w-4 text-gray-400" />;
    }

    if ((num1 > num2 && higherIsBetter) || (num1 < num2 && !higherIsBetter)) {
      return <ArrowUp className="h-4 w-4 text-green-400" />;
    }

    return <ArrowDown className="h-4 w-4 text-red-400" />;
  };

  const getValueColor = (
    value1: string | number,
    value2: string | number,
    isFirst: boolean,
    higherIsBetter = true
  ) => {
    const num1 = typeof value1 === 'number' ? value1 : parseFloat(value1.toString());
    const num2 = typeof value2 === 'number' ? value2 : parseFloat(value2.toString());

    if (isNaN(num1) || isNaN(num2) || num1 === num2) {
      return 'text-white';
    }

    const isBetter = isFirst
      ? (num1 > num2 && higherIsBetter) || (num1 < num2 && !higherIsBetter)
      : (num2 > num1 && higherIsBetter) || (num2 < num1 && !higherIsBetter);

    return isBetter ? 'text-green-400' : 'text-gray-400';
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-xs text-gray-400 flex-1">{metric.label}</span>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${getValueColor(metric.value1, metric.value2, true, metric.higherIsBetter)}`}>
                {metric.value1}{metric.unit || ''}
              </span>
              {getComparisonIcon(metric.value1, metric.value2, metric.higherIsBetter)}
              <span className={`text-sm font-medium ${getValueColor(metric.value1, metric.value2, false, metric.higherIsBetter)}`}>
                {metric.value2}{metric.unit || ''}
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
