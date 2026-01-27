"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Strain } from '@/lib/db';
import { Edit, Trash2, Cannabis, Clock, Gauge } from 'lucide-react';

interface StrainCardProps {
  strain: Strain;
  onEdit?: (strain: Strain) => void;
  onDelete?: (strainId: string) => void;
  onSelect?: (strain: Strain) => void;
  showActions?: boolean;
}

const GENETICS_COLORS: Record<string, string> = {
  Indica: 'bg-purple-600/20 text-purple-400 border-purple-500',
  Sativa: 'bg-yellow-600/20 text-yellow-400 border-yellow-500',
  Hybrid: 'bg-green-600/20 text-green-400 border-green-500',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-600/20 text-green-400',
  medium: 'bg-yellow-600/20 text-yellow-400',
  hard: 'bg-red-600/20 text-red-400',
};

const StrainCard: React.FC<StrainCardProps> = ({
  strain,
  onEdit,
  onDelete,
  onSelect,
  showActions = true,
}) => {
  return (
    <Card 
      className={`bg-gray-800/50 border-gray-700 hover:border-green-500/50 transition-all ${
        onSelect ? 'cursor-pointer' : ''
      }`}
      onClick={() => onSelect?.(strain)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-green-400 flex items-center gap-2">
              <Cannabis className="h-4 w-4" />
              {strain.name}
            </CardTitle>
            <p className="text-sm text-gray-400">{strain.breeder}</p>
          </div>
          <Badge 
            variant="outline" 
            className={GENETICS_COLORS[strain.genetics] || GENETICS_COLORS.Hybrid}
          >
            {strain.genetics}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Genetics percentages */}
        {(strain.indicaPercent || strain.sativaPercent) && (
          <div className="flex gap-4 text-sm">
            {strain.indicaPercent && (
              <span className="text-purple-400">
                {strain.indicaPercent}% Indica
              </span>
            )}
            {strain.sativaPercent && (
              <span className="text-yellow-400">
                {strain.sativaPercent}% Sativa
              </span>
            )}
          </div>
        )}

        {/* THC/CBD */}
        <div className="flex gap-4 text-sm">
          {strain.thcPercent !== undefined && (
            <span className="text-gray-300">
              THC: {strain.thcPercent}%
            </span>
          )}
          {strain.cbdPercent !== undefined && (
            <span className="text-gray-300">
              CBD: {strain.cbdPercent}%
            </span>
          )}
        </div>

        {/* Additional info */}
        <div className="flex flex-wrap gap-2">
          {strain.floweringWeeks && (
            <span className="flex items-center gap-1 text-xs bg-gray-700/50 px-2 py-1 rounded">
              <Clock className="h-3 w-3" />
              {strain.floweringWeeks} weeks
            </span>
          )}
          {strain.difficulty && (
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${DIFFICULTY_COLORS[strain.difficulty]}`}>
              <Gauge className="h-3 w-3" />
              {strain.difficulty}
            </span>
          )}
        </div>

        {/* Description */}
        {strain.description && (
          <p className="text-xs text-gray-400 line-clamp-2">
            {strain.description}
          </p>
        )}

        {/* Actions */}
        {showActions && (onEdit || onDelete) && (
          <div className="flex gap-2 pt-2 border-t border-gray-700">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(strain);
                }}
                className="text-gray-400 hover:text-white"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(strain.id);
                }}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

StrainCard.displayName = 'StrainCard';

export default StrainCard;
