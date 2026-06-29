"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Strain } from '@/lib/db';
import { hasStrainNumber } from '@/lib/strain-utils';
import { Edit, Trash2, Cannabis, Clock, Gauge } from 'lucide-react';

interface StrainCardProps {
  strain: Strain;
  onEdit?: (strain: Strain) => void;
  onDelete?: (strainId: string) => void;
  onSelect?: (strain: Strain) => void;
  showActions?: boolean;
}

const GENETICS_COLORS: Record<string, string> = {
  Indica: 'bg-primary/10 text-primary border-primary/35',
  Sativa: 'bg-accent/10 text-accent border-accent/35',
  Hybrid: 'bg-primary/10 text-primary border-primary/35',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-primary/10 text-primary',
  medium: 'bg-accent/10 text-accent',
  hard: 'bg-destructive/10 text-destructive',
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
      className={`transition-all hover:border-primary/50 ${
        onSelect ? 'cursor-pointer' : ''
      }`}
      onClick={() => onSelect?.(strain)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Cannabis className="h-4 w-4" />
              {strain.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{strain.breeder}</p>
          </div>
          <Badge 
            className={`border ${GENETICS_COLORS[strain.genetics] || GENETICS_COLORS.Hybrid}`}
          >
            {strain.genetics}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Genetics percentages */}
        {(hasStrainNumber(strain.indicaPercent) || hasStrainNumber(strain.sativaPercent)) && (
          <div className="flex gap-4 text-sm">
            {hasStrainNumber(strain.indicaPercent) && (
              <span className="text-primary">
                {strain.indicaPercent}% Indica
              </span>
            )}
            {hasStrainNumber(strain.sativaPercent) && (
              <span className="text-accent">
                {strain.sativaPercent}% Sativa
              </span>
            )}
          </div>
        )}

        {/* THC/CBD */}
        <div className="flex gap-4 text-sm">
          {hasStrainNumber(strain.thcPercent) && (
            <span className="text-muted-foreground">
              THC: {strain.thcPercent}%
            </span>
          )}
          {hasStrainNumber(strain.cbdPercent) && (
            <span className="text-muted-foreground">
              CBD: {strain.cbdPercent}%
            </span>
          )}
        </div>

        {/* Additional info */}
        <div className="flex flex-wrap gap-2">
          {hasStrainNumber(strain.floweringWeeks) && (
            <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
              <Clock className="h-3 w-3" />
              {strain.floweringWeeks} weeks
            </span>
          )}
          {strain.difficulty && (
            <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${DIFFICULTY_COLORS[strain.difficulty]}`}>
              <Gauge className="h-3 w-3" />
              {strain.difficulty}
            </span>
          )}
        </div>

        {/* Description */}
        {strain.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {strain.description}
          </p>
        )}

        {/* Actions */}
        {showActions && (onEdit || onDelete) && (
          <div className="flex gap-2 border-t border-border/[0.70] pt-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(strain);
                }}
                className="text-muted-foreground hover:text-foreground"
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
                className="text-destructive hover:text-destructive/80"
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
