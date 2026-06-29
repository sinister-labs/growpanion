"use client";

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GitBranch, Leaf, PanelLeft, PanelRight, RotateCcw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CustomDropdown, type DropdownOption } from '@/components/ui/custom-dropdown';
import { useToast } from '@/hooks/use-toast';
import {
  deleteGeneticsOverride,
  generateId,
  getAllGenetics,
  getAllGeneticsOverrides,
  getAllLineageEdges,
  populateDBWithDemoDataIfEmpty,
  saveGenetics,
  saveGeneticsOverride,
  saveLineageEdge,
  type Genetics,
  type GeneticsOverride,
  type LineageEdge,
} from '@/lib/db';
import { applyGeneticsOverrides, createUserGenetics, DEFAULT_GENETICS, mergeDefaultGenetics } from '@/lib/genetics-registry';
import { ensureDefaultGeneticsSeed, type SeedProgress } from '@/lib/genetics-seed';
import GeneticsLineageGraph from '@/components/genetics/GeneticsLineageGraph';

const DIRECTORY_LIMIT = 60;

function describeSeedPhase(progress: SeedProgress | null): string {
  switch (progress?.phase) {
    case 'transforming':
      return 'Genetics are being prepared…';
    case 'saving':
      return 'Genetics are being saved…';
    default:
      return 'Genetics pool is being prepared…';
  }
}

export default function GeneticsRegistryPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [genetics, setGenetics] = useState<Genetics[]>([]);
  const [overrides, setOverrides] = useState<GeneticsOverride[]>([]);
  const [lineageEdges, setLineageEdges] = useState<LineageEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(true);
  const [importProgress, setImportProgress] = useState<SeedProgress | null>(null);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newGeneticsName, setNewGeneticsName] = useState('');
  const [newGeneticsBreeder, setNewGeneticsBreeder] = useState('');
  const [newGeneticsType, setNewGeneticsType] = useState<Genetics['type']>('Hybrid');
  const [newGeneticsFloweringWeeks, setNewGeneticsFloweringWeeks] = useState('');
  const [newGeneticsStretch, setNewGeneticsStretch] = useState('');
  const [newGeneticsCannabinoids, setNewGeneticsCannabinoids] = useState('');
  const [newGeneticsTerpenes, setNewGeneticsTerpenes] = useState('');
  const [newGeneticsOrigin, setNewGeneticsOrigin] = useState('');
  const [newGeneticsNotes, setNewGeneticsNotes] = useState('');
  const [parentId, setParentId] = useState('');
  const [lineageRelationType, setLineageRelationType] = useState<LineageEdge['relationType']>('parent');
  const [editName, setEditName] = useState('');
  const [editBreeder, setEditBreeder] = useState('');
  const [editType, setEditType] = useState<Genetics['type']>('Unknown');
  const [editFloweringWeeks, setEditFloweringWeeks] = useState('');
  const [editStretch, setEditStretch] = useState('');
  const [editCannabinoids, setEditCannabinoids] = useState('');
  const [editTerpenes, setEditTerpenes] = useState('');
  const [editOrigin, setEditOrigin] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadGenetics() {
      try {
        const result = await ensureDefaultGeneticsSeed(progress => {
          if (!cancelled) setImportProgress(progress);
        });

        const [loadedGenetics, storedOverrides, storedLineageEdges] = await Promise.all([
          getAllGenetics(),
          getAllGeneticsOverrides(),
          getAllLineageEdges(),
        ]);

        // Fall back to the lightweight default dataset if the seed import failed
        // and no genetics are available yet.
        let storedGenetics = loadedGenetics;
        if (storedGenetics.length === 0) {
          await populateDBWithDemoDataIfEmpty();
          storedGenetics = mergeDefaultGenetics(await getAllGenetics());
        }

        const data = applyGeneticsOverrides(storedGenetics, storedOverrides);
        if (!cancelled) {
          setGenetics(data);
          setOverrides(storedOverrides);
          setLineageEdges(storedLineageEdges);
          setParentId(current => current || data[1]?.id || data[0]?.id || '');
          setSelectedId(current => current || data[0]?.id || '');
          setLoadError(result.status === 'failed' ? 'Default genetics could not be imported. Basic records are shown.' : null);
        }
      } catch {
        if (!cancelled) {
          setLoadError('Genetics pool could not be loaded.');
        }
      } finally {
        if (!cancelled) setIsImporting(false);
      }
    }

    loadGenetics();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredGenetics = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return genetics;
    return genetics.filter(entry => (
      entry.name.toLowerCase().includes(normalizedQuery) ||
      (entry.breeder ?? '').toLowerCase().includes(normalizedQuery) ||
      (entry.terpeneProfile ?? []).some(terpene => terpene.toLowerCase().includes(normalizedQuery))
    ));
  }, [genetics, query]);

  const selected = useMemo(() => genetics.find(entry => entry.id === selectedId), [genetics, selectedId]);
  const visibleGenetics = useMemo(() => filteredGenetics.slice(0, DIRECTORY_LIMIT), [filteredGenetics]);
  const upstreamCount = selected ? lineageEdges.filter(edge => edge.childGeneticsId === selected.id).length : 0;
  const downstreamCount = selected ? lineageEdges.filter(edge => edge.parentGeneticsId === selected.id).length : 0;
  const hasOverride = selected ? overrides.some(override => override.geneticsId === selected.id) : false;
  // Link target options are derived from the current search so the picker stays
  // usable even with thousands of genetics in the pool.
  const geneticsOptions: DropdownOption[] = filteredGenetics
    .filter(entry => entry.id !== selected?.id)
    .slice(0, 50)
    .map(entry => ({
      id: entry.id,
      label: entry.name,
      description: entry.breeder || 'Unknown breeder',
    }));
  const typeOptions: DropdownOption[] = [
    { id: 'Hybrid', label: 'Hybrid' },
    { id: 'Indica', label: 'Indica' },
    { id: 'Sativa', label: 'Sativa' },
    { id: 'Unknown', label: 'Unknown' },
  ];
  const relationOptions: DropdownOption[] = [
    { id: 'parent', label: 'Parent' },
    { id: 'cross', label: 'Cross' },
    { id: 'child', label: 'Child' },
  ];

  useEffect(() => {
    if (!selected) return;

    setEditName(selected.name);
    setEditBreeder(selected.breeder || '');
    setEditType(selected.type);
    setEditFloweringWeeks(selected.floweringWeeks?.toString() || '');
    setEditStretch(selected.stretch || '');
    setEditCannabinoids(selected.cannabinoids || '');
    setEditTerpenes((selected.terpeneProfile ?? []).join(', '));
    setEditOrigin(selected.origin || '');
    setEditNotes(selected.notes || '');
  }, [selected]);

  const handleSelect = (geneticsId: string) => {
    setSelectedId(geneticsId);
    setIsDetailOpen(true);
  };

  const refreshGenetics = async () => {
    const [storedGenetics, storedOverrides, storedLineageEdges] = await Promise.all([
      getAllGenetics(),
      getAllGeneticsOverrides(),
      getAllLineageEdges(),
    ]);
    const merged = storedGenetics.length === 0 ? mergeDefaultGenetics(storedGenetics) : storedGenetics;
    setGenetics(applyGeneticsOverrides(merged, storedOverrides));
    setOverrides(storedOverrides);
    setLineageEdges(storedLineageEdges);
  };

  const handleCreateGenetics = async () => {
    if (!newGeneticsName.trim()) return;

    try {
      const floweringWeeks = newGeneticsFloweringWeeks.trim() ? Number(newGeneticsFloweringWeeks) : undefined;
      const geneticsRecord = createUserGenetics({
        name: newGeneticsName,
        breeder: newGeneticsBreeder,
        type: newGeneticsType,
        floweringWeeks,
        stretch: newGeneticsStretch,
        cannabinoids: newGeneticsCannabinoids,
        terpeneProfile: newGeneticsTerpenes.split(','),
        origin: newGeneticsOrigin,
        notes: newGeneticsNotes,
      });
      await saveGenetics(geneticsRecord);
      await refreshGenetics();
      handleSelect(geneticsRecord.id);
      setNewGeneticsName('');
      setNewGeneticsBreeder('');
      setNewGeneticsFloweringWeeks('');
      setNewGeneticsStretch('');
      setNewGeneticsCannabinoids('');
      setNewGeneticsTerpenes('');
      setNewGeneticsOrigin('');
      setNewGeneticsNotes('');
      toast({ variant: 'success', title: 'Genetics saved', description: `${geneticsRecord.name} was added to the registry.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to save genetics.' });
    }
  };

  const getEditedPatch = () => {
    const floweringWeeks = editFloweringWeeks.trim() ? Number(editFloweringWeeks) : undefined;
    return {
      name: editName.trim(),
      breeder: editBreeder.trim() || undefined,
      type: editType,
      floweringWeeks: Number.isFinite(floweringWeeks) ? floweringWeeks : undefined,
      stretch: editStretch.trim() || undefined,
      cannabinoids: editCannabinoids.trim() || undefined,
      terpeneProfile: editTerpenes.split(',').map(terpene => terpene.trim()).filter(Boolean),
      origin: editOrigin.trim() || undefined,
      notes: editNotes.trim() || undefined,
    };
  };

  const handleSaveSelectedGenetics = async () => {
    if (!selected) return;

    try {
      const patch = getEditedPatch();
      const updatedAt = new Date().toISOString();

      if (selected.source === 'default') {
        await saveGeneticsOverride({
          id: `override-${selected.id}`,
          geneticsId: selected.id,
          patch,
          updatedAt,
        });
      } else {
        await saveGenetics({
          ...selected,
          ...patch,
          id: selected.id,
          source: 'user',
          createdAt: selected.createdAt,
          updatedAt,
        });
      }

      await refreshGenetics();
      toast({ variant: 'success', title: 'Genetics saved', description: `${patch.name} was updated.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to save genetics.' });
    }
  };

  const handleResetDefaultOverride = async () => {
    if (!selected || selected.source !== 'default') return;

    try {
      const defaultRecord = DEFAULT_GENETICS.find(entry => entry.id === selected.id);
      await deleteGeneticsOverride(`override-${selected.id}`);
      if (defaultRecord) await saveGenetics(defaultRecord);
      await refreshGenetics();
      toast({ variant: 'success', title: 'Override reset', description: `${selected.name} was reset to the default dataset.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to reset override.' });
    }
  };

  const handleAddLineageEdge = async () => {
    if (!selected || !parentId || parentId === selected.id) return;

    try {
      const edge = lineageRelationType === 'child'
        ? {
          parentGeneticsId: selected.id,
          childGeneticsId: parentId,
        }
        : {
          parentGeneticsId: parentId,
          childGeneticsId: selected.id,
        };

      await saveLineageEdge({
        id: generateId(),
        ...edge,
        relationType: lineageRelationType,
        createdAt: new Date().toISOString(),
      });
      await refreshGenetics();
      toast({ variant: 'success', title: 'Lineage linked', description: 'Parent genetics were linked.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to save lineage edge.' });
    }
  };

  return (
    <div className="relative h-[min(70vh,720px)] min-h-[620px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#090f14]/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_52px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      {/* Full-screen lineage graph: the entire family tree of all strains. */}
      <div className="absolute inset-0">
        {genetics.length > 0 ? (
          <GeneticsLineageGraph
            genetics={genetics}
            lineageEdges={lineageEdges}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            {isImporting ? 'Genetics loading…' : 'No genetics available.'}
          </div>
        )}
      </div>

      {/* Floating toolbar over the graph. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 pb-4 pt-4">
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-[1rem] border border-white/10 bg-[#0d151b]/88 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 gap-2 px-2 ${isDirectoryOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setIsDirectoryOpen(open => !open)}
            >
              <PanelLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Search genetics</span>
            </Button>
            <span className="hidden rounded-xl border border-white/10 bg-white/[0.045] px-2 py-1 text-xs font-medium text-slate-400 sm:inline">
              {filteredGenetics.length.toLocaleString('en-US')} records
            </span>
          </div>
          {loadError && (
            <div className="pointer-events-auto max-w-xs rounded-2xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
              {loadError}
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2 rounded-[1rem] border border-white/10 bg-[#0d151b]/88 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-2 px-2 ${isDetailOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setIsDetailOpen(open => !open)}
          >
            <PanelRight className="h-4 w-4" />
            <span className="hidden sm:inline">{selected ? selected.name : 'Detail card'}</span>
          </Button>
        </div>
      </div>

      {selected && !isDetailOpen && (
        <div className="pointer-events-auto absolute right-4 top-20 z-[8] hidden w-[min(320px,42%)] rounded-[1.2rem] border border-white/10 bg-[#0d151b]/92 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur-xl md:block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Leaf className="h-4 w-4" />
                Selected genetics
              </div>
              <h3 className="mt-2 truncate text-xl font-semibold text-foreground">{selected.name}</h3>
              <p className="truncate text-sm text-muted-foreground">{selected.breeder || 'Unknown breeder'}</p>
            </div>
            <span className="rounded-full border border-emerald-300/[0.20] bg-emerald-300/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
              {selected.type}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[0.95rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,27,34,0.94),rgba(7,12,17,0.96))] p-3">
              <div className="text-xs text-muted-foreground">Parents</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{upstreamCount}</div>
            </div>
            <div className="rounded-[0.95rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,27,34,0.94),rgba(7,12,17,0.96))] p-3">
              <div className="text-xs text-muted-foreground">Children</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{downstreamCount}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(selected.terpeneProfile ?? []).slice(0, 3).map(terpene => (
              <span key={terpene} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                {terpene}
              </span>
            ))}
            {(selected.terpeneProfile ?? []).length === 0 && (
              <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs text-slate-400">No terpene data</span>
            )}
          </div>
          <Button
            type="button"
            className="mt-4 h-10 w-full rounded-2xl"
            onClick={() => setIsDetailOpen(true)}
          >
            Open detail card
          </Button>
        </div>
      )}

      {/* Seed import progress overlay. */}
      {isImporting && importProgress && importProgress.phase !== 'done' && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 w-72 -translate-x-1/2 rounded-[1.1rem] border border-white/10 bg-[#0d151b]/92 p-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between text-sm text-foreground">
            <span>{describeSeedPhase(importProgress)}</span>
            <span className="text-muted-foreground">{Math.round(importProgress.percent)}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${Math.min(100, Math.max(5, importProgress.percent))}%` }}
            />
          </div>
        </div>
      )}

      {/* Left drawer: genetics directory + creation form. */}
      <AnimatePresence>
        {isDirectoryOpen && (
          <motion.aside
            key="directory-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="absolute inset-y-0 left-0 z-10 flex w-[340px] max-w-[88vw] flex-col border-r border-white/10 bg-[#0b1116]/96 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Search className="h-5 w-5 text-primary" />
                Directory
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsDirectoryOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Genetics, breeder, terpene…"
                className="mt-1"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{filteredGenetics.length.toLocaleString('en-US')} genetics</span>
                {filteredGenetics.length > DIRECTORY_LIMIT && <span>{DIRECTORY_LIMIT} shown</span>}
              </div>
              <div className="space-y-2">
                {visibleGenetics.length === 0 ? (
                  <div className="rounded-[0.95rem] border border-white/10 bg-white/[0.045] p-3 text-sm text-slate-400">
                    {isImporting ? 'Genetics loading…' : 'No matches. Adjust the search.'}
                  </div>
                ) : (
                  visibleGenetics.map(entry => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleSelect(entry.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                        selected?.id === entry.id ? 'border-emerald-300/[0.35] bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/[0.045] text-slate-200 hover:border-emerald-300/[0.30] hover:bg-emerald-300/10'
                      }`}
                    >
                      <div className="font-medium text-foreground">{entry.name}</div>
                      <div className="text-xs text-muted-foreground">{entry.breeder || 'Unknown breeder'} • {entry.type}</div>
                    </button>
                  ))
                )}
              </div>
              {filteredGenetics.length > DIRECTORY_LIMIT && (
                <p className="text-xs text-muted-foreground">Refine the search to reveal more genetics.</p>
              )}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <div className="text-sm font-medium text-foreground">New genetics</div>
                <Input
                  value={newGeneticsName}
                  onChange={(event) => setNewGeneticsName(event.target.value)}
                  placeholder="Name…"
                  className="mt-1"
                />
                <Input
                  value={newGeneticsBreeder}
                  onChange={(event) => setNewGeneticsBreeder(event.target.value)}
                  placeholder="Breeder…"
                  className="mt-1"
                />
                <CustomDropdown
                  options={typeOptions}
                  value={newGeneticsType}
                  onChange={(value) => setNewGeneticsType(value as Genetics['type'])}
                  placeholder="Type…"
                  width="w-full"
                  buttonClassName="mt-1"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={newGeneticsFloweringWeeks}
                    onChange={(event) => setNewGeneticsFloweringWeeks(event.target.value)}
                    placeholder="Flowering weeks…"
                    className="mt-1"
                  />
                  <Input
                    value={newGeneticsStretch}
                    onChange={(event) => setNewGeneticsStretch(event.target.value)}
                    placeholder="Stretch / growth"
                    className="mt-1"
                  />
                </div>
                <Input
                  value={newGeneticsCannabinoids}
                  onChange={(event) => setNewGeneticsCannabinoids(event.target.value)}
                  placeholder="Cannabinoids"
                  className="mt-1"
                />
                <Input
                  value={newGeneticsTerpenes}
                  onChange={(event) => setNewGeneticsTerpenes(event.target.value)}
                  placeholder="Terpenes, comma-separated…"
                  className="mt-1"
                />
                <Input
                  value={newGeneticsOrigin}
                  onChange={(event) => setNewGeneticsOrigin(event.target.value)}
                  placeholder="Origin / Lineage"
                  className="mt-1"
                />
                <Textarea
                  value={newGeneticsNotes}
                  onChange={(event) => setNewGeneticsNotes(event.target.value)}
                  placeholder="Notes…"
                  className="mt-1"
                />
                <Button
                  onClick={handleCreateGenetics}
                  disabled={!newGeneticsName.trim()}
                  className="w-full"
                >
                  Save genetics
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Right drawer: detail card + editing + lineage linking. */}
      <AnimatePresence>
        {isDetailOpen && (
          <motion.aside
            key="detail-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="absolute inset-y-0 right-0 z-10 flex w-[400px] max-w-[92vw] flex-col border-l border-white/10 bg-[#0b1116]/96 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Leaf className="h-5 w-5 text-primary" />
                Detail card
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsDetailOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              {selected ? (
                <>
                  <div>
                    <div className="text-2xl font-semibold text-foreground">{selected.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {selected.breeder || 'Unknown breeder'} • {selected.source === 'default' ? 'Default dataset' : 'User-created'}
                      {hasOverride ? ' • local override' : ''}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Type', selected.type ?? 'Unknown'],
                      ['Flowering', selected.floweringWeeks ? `${selected.floweringWeeks} weeks` : 'Unknown'],
                      ['Stretch', selected.stretch ?? 'Unknown'],
                      ['Cannabinoids', selected.cannabinoids ?? 'Unknown'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[0.95rem] border border-white/10 bg-white/[0.045] p-3">
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div className="mt-1 text-sm text-foreground">{value}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Terpene</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(selected.terpeneProfile ?? ['Open']).map(terpene => (
                        <span key={terpene} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{terpene}</span>
                      ))}
                    </div>
                  </div>
                  {selected.notes && <p className="text-sm text-muted-foreground">{selected.notes}</p>}

                  <div className="space-y-3 rounded-[1.1rem] border border-white/10 bg-white/[0.045] p-4">
                    <div className="text-sm font-medium text-foreground">Edit genetics</div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Input value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="Name…" />
                      <Input value={editBreeder} onChange={(event) => setEditBreeder(event.target.value)} placeholder="Breeder…" />
                      <CustomDropdown
                        options={typeOptions}
                        value={editType}
                        onChange={(value) => setEditType(value as Genetics['type'])}
                        width="w-full"
                        buttonClassName="mt-1"
                      />
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={editFloweringWeeks}
                        onChange={(event) => setEditFloweringWeeks(event.target.value)}
                        placeholder="Flowering weeks…"
                        className="mt-1"
                      />
                      <Input value={editStretch} onChange={(event) => setEditStretch(event.target.value)} placeholder="Stretch…" />
                      <Input value={editCannabinoids} onChange={(event) => setEditCannabinoids(event.target.value)} placeholder="Cannabinoids…" />
                      <Input value={editTerpenes} onChange={(event) => setEditTerpenes(event.target.value)} placeholder="Terpenes, comma-separated…" />
                      <Input value={editOrigin} onChange={(event) => setEditOrigin(event.target.value)} placeholder="Origin / lineage…" />
                    </div>
                    <Textarea value={editNotes} onChange={(event) => setEditNotes(event.target.value)} placeholder="Notes…" />
                    <div className="flex flex-col gap-2">
                      <Button onClick={handleSaveSelectedGenetics} disabled={!editName.trim()}>
                        Save changes
                      </Button>
                      {selected.source === 'default' && hasOverride && (
                        <Button
                          variant="outline"
                          className="border-white/10 bg-white/[0.045] text-slate-100 hover:border-emerald-300/[0.22] hover:bg-emerald-300/10"
                          onClick={handleResetDefaultOverride}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reset default
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.045] p-4">
                    <Label className="flex items-center gap-2 text-foreground">
                      <GitBranch className="h-4 w-4 text-primary" />
                      Link lineage
                    </Label>
                    <div className="mt-2 space-y-3">
                      <CustomDropdown
                        options={geneticsOptions}
                        value={parentId}
                        onChange={setParentId}
                        placeholder="Genetics"
                        width="w-full"
                        buttonClassName="mt-1"
                        disabled={geneticsOptions.length === 0}
                      />
                      <CustomDropdown
                        options={relationOptions}
                        value={lineageRelationType}
                        onChange={(value) => setLineageRelationType(value as LineageEdge['relationType'])}
                        placeholder="Relation"
                        width="w-full"
                        buttonClassName="mt-1"
                      />
                      <Button
                        onClick={handleAddLineageEdge}
                        disabled={!selected || !parentId || parentId === selected.id}
                        className="w-full"
                      >
                        Save lineage link
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.045] p-4 text-sm text-slate-400">
                    {upstreamCount} upstream and {downstreamCount} downstream links stored for this genetics entry.
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <Leaf className="h-8 w-8 text-muted-foreground" />
                  <p>Select genetics in the graph or directory to view details.</p>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
