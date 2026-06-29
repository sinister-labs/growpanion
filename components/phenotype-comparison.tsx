"use client";

import { useEffect, useMemo, useState } from 'react';
import { GitCompare, Loader2, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import {
  getAllGenetics,
  getAllGeneticsOverrides,
  getPhenotypesForGrow,
  type Genetics,
  type Phenotype,
  type PlantDB,
} from '@/lib/db';
import { applyGeneticsOverrides, mergeDefaultGenetics } from '@/lib/genetics-registry';
import ComparisonCard from '@/components/grow-comparison/ComparisonCard';
import { buildPhenotypeComparisonMetrics } from '@/lib/comparison-utils';

interface PhenotypeComparisonProps {
  growId: string;
  plants: PlantDB[];
}

interface PhenotypeOption {
  phenotype: Phenotype;
  plant?: PlantDB;
  genetics?: Genetics;
}

export default function PhenotypeComparison({ growId, plants }: PhenotypeComparisonProps) {
  const [phenotypes, setPhenotypes] = useState<Phenotype[]>([]);
  const [genetics, setGenetics] = useState<Genetics[]>([]);
  const [firstId, setFirstId] = useState('');
  const [secondId, setSecondId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadComparisonData() {
      setIsLoading(true);
      try {
        const [storedPhenotypes, storedGenetics, storedOverrides] = await Promise.all([
          getPhenotypesForGrow(growId),
          getAllGenetics(),
          getAllGeneticsOverrides(),
        ]);

        if (!cancelled) {
          const mergedGenetics = applyGeneticsOverrides(mergeDefaultGenetics(storedGenetics), storedOverrides);
          setPhenotypes(storedPhenotypes);
          setGenetics(mergedGenetics);
          setFirstId(current => current || storedPhenotypes[0]?.id || '');
          setSecondId(current => current || storedPhenotypes.find(phenotype => phenotype.id !== storedPhenotypes[0]?.id)?.id || '');
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setPhenotypes([]);
          setGenetics([]);
          setLoadError('Phänotypen konnten nicht geladen werden.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadComparisonData();
    return () => {
      cancelled = true;
    };
  }, [growId]);

  const options: PhenotypeOption[] = useMemo(() => phenotypes.map(phenotype => ({
    phenotype,
    plant: plants.find(plant => plant.id === phenotype.plantId),
    genetics: genetics.find(entry => entry.id === phenotype.geneticsId),
  })), [genetics, phenotypes, plants]);

  const dropdownOptions = options.map(option => ({
    id: option.phenotype.id,
    label: option.phenotype.label,
    description: `${option.plant?.name ?? 'Unknown plant'} • ${option.genetics?.name ?? option.phenotype.geneticsId}`,
  }));

  const first = options.find(option => option.phenotype.id === firstId);
  const second = options.find(option => option.phenotype.id === secondId);
  const metrics = first && second
    ? buildPhenotypeComparisonMetrics(first.phenotype, second.phenotype)
    : [];

  const handleSwap = () => {
    setFirstId(secondId);
    setSecondId(firstId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <GitCompare className="h-5 w-5 text-primary" />
          Phenotype Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loadError && <p className="text-sm text-amber-300">{loadError}</p>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">Phenotype 1</label>
            <CustomDropdown
              options={dropdownOptions.filter(option => option.id !== secondId)}
              value={firstId}
              onChange={setFirstId}
              placeholder="Select first phenotype"
              width="w-full"
              buttonClassName="mt-1"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="border-white/10 bg-white/[0.045] text-muted-foreground hover:border-emerald-300/[0.22] hover:bg-emerald-300/10"
            onClick={handleSwap}
            disabled={!firstId || !secondId}
          >
            <GitCompare className="h-4 w-4" />
          </Button>
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">Phenotype 2</label>
            <CustomDropdown
              options={dropdownOptions.filter(option => option.id !== firstId)}
              value={secondId}
              onChange={setSecondId}
              placeholder="Select second phenotype"
              width="w-full"
              buttonClassName="mt-1"
            />
          </div>
        </div>

        {first && second ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[first, second].map(option => (
                <div key={option.phenotype.id} className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4">
                  <div className="text-lg font-semibold text-foreground">{option.phenotype.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{option.plant?.name ?? 'Unknown plant'} • {option.genetics?.name ?? 'Unknown genetics'}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(option.phenotype.traits ?? []).map(trait => (
                      <span key={trait} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{trait}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <ComparisonCard
              title="Phenotype Traits"
              icon={<Scale className="h-4 w-4" />}
              metrics={metrics}
            />
          </>
        ) : (
          <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-8 text-center">
            <GitCompare className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <div className="text-foreground">Mindestens zwei Phänotypen nötig</div>
            <p className="mt-2 text-sm text-muted-foreground">Nutze den Phänotyp-Wizard, um Pflanzen derselben oder verschiedener Genetik vergleichbar zu machen.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
