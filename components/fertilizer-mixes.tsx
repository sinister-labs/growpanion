import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Droplet, Plus, Save, Trash, X, Beaker, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CustomDropdown, type DropdownOption } from "@/components/ui/custom-dropdown"
import { useFertilizerMixes } from "@/hooks/useFertilizerMixes"
import { Fertilizer } from "@/components/plant-modal/types"
import { FertilizerMixDB, getMixRecipesForGrow, saveFertilizerProduct, saveMixRecipe, type FertilizerProduct, type MixRecipe } from "@/lib/db"
import {
    calculateDosePerLiter,
    createFertilizerProductId,
    createMixRecipeIdFromLegacyMix,
    findMixRecipeForLegacyMix,
    formatDosePerLiter,
    hasExistingFertilizerMix
} from "@/lib/feeding-utils"

interface FertilizerMixesManagerProps {
    growId: string | null;
}

export const FertilizerMixesManager = ({ growId }: FertilizerMixesManagerProps) => {
    const {
        mixes,
        isLoading,
        error,
        addMix,
        updateMix,
        removeMix
    } = useFertilizerMixes(growId);

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingMix, setEditingMix] = useState<FertilizerMixDB | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [fertilizerType, setFertilizerType] = useState<MixRecipe['fertilizerType']>('mineral')
    const [substrateType, setSubstrateType] = useState<MixRecipe['substrateType']>('soil')
    const [targetEc, setTargetEc] = useState('')
    const [targetPh, setTargetPh] = useState('')
    const [phase, setPhase] = useState('')
    const [mixRecipes, setMixRecipes] = useState<MixRecipe[]>([])

    const [tempFertilizer, setTempFertilizer] = useState<Fertilizer>({
        name: "",
        amount: ""
    });

    const editingMixExists = hasExistingFertilizerMix(mixes, editingMix);
    const fertilizerTypeOptions: DropdownOption[] = [
        { id: 'mineral', label: 'Mineralisch' },
        { id: 'organic', label: 'Biologisch' },
        { id: 'hybrid', label: 'Hybrid' },
    ];
    const substrateTypeOptions: DropdownOption[] = [
        { id: 'soil', label: 'Erde' },
        { id: 'coco', label: 'Coco' },
        { id: 'hydro', label: 'Hydro' },
        { id: 'living_soil', label: 'Living Soil' },
        { id: 'other', label: 'Anderes' },
    ];

    useEffect(() => {
        let cancelled = false;

        async function loadMixRecipes() {
            if (!growId) {
                setMixRecipes([]);
                return;
            }

            const recipes = await getMixRecipesForGrow(growId);
            if (!cancelled) {
                setMixRecipes(recipes);
            }
        }

        loadMixRecipes().catch(() => {
            if (!cancelled) setMixRecipes([]);
        });

        return () => {
            cancelled = true;
        };
    }, [growId]);

    const handleEditMix = (mix: FertilizerMixDB | null) => {
        setFormError(null)
        setEditingMix(mix || {
            id: `mix-${Date.now()}`,
            name: "",
            description: "",
            waterAmount: "1000",
            fertilizers: [],
            growId: growId || ""
        })
        const recipe = mix ? findMixRecipeForLegacyMix(mixRecipes, mix.id) : undefined;
        if (recipe) {
            setFertilizerType(recipe.fertilizerType)
            setSubstrateType(recipe.substrateType)
            setTargetEc(recipe.targetEc?.toString() || '')
            setTargetPh(recipe.targetPh?.toString() || '')
            setPhase(recipe.phase || '')
        } else {
            setFertilizerType('mineral')
            setSubstrateType('soil')
            setTargetEc('')
            setTargetPh('')
            setPhase('')
        }
        setIsDialogOpen(true)
    }

    const handleAddFertilizer = () => {
        const amount = Number(tempFertilizer.amount);
        if (!tempFertilizer.name.trim() || !Number.isFinite(amount) || amount <= 0 || !editingMix) {
            setFormError("Please enter a fertilizer name and a positive amount.");
            return;
        }

        setEditingMix({
            ...editingMix,
            fertilizers: [
                ...(editingMix.fertilizers || []),
                { name: tempFertilizer.name.trim(), amount: tempFertilizer.amount.trim() }
            ]
        });

        setTempFertilizer({ name: "", amount: "" });
        setFormError(null);
    };

    const handleRemoveFertilizer = (index: number) => {
        if (!editingMix) return;

        setEditingMix({
            ...editingMix,
            fertilizers: editingMix.fertilizers.filter((_, i) => i !== index)
        })
    }

    const handleSaveMix = async () => {
        if (!editingMix || !growId || isSaving) return;

        const waterAmount = Number(editingMix.waterAmount);
        if (!editingMix.name.trim() || !Number.isFinite(waterAmount) || waterAmount <= 0 || !editingMix.fertilizers.length) {
            setFormError("Please enter a mix name, a positive water amount, and at least one fertilizer.");
            return;
        }

        const parsedTargetEc = targetEc.trim() ? Number(targetEc) : undefined;
        const parsedTargetPh = targetPh.trim() ? Number(targetPh) : undefined;
        if (
            (parsedTargetEc !== undefined && (!Number.isFinite(parsedTargetEc) || parsedTargetEc < 0)) ||
            (parsedTargetPh !== undefined && (!Number.isFinite(parsedTargetPh) || parsedTargetPh < 0 || parsedTargetPh > 14))
        ) {
            setFormError("Target EC must be non-negative and target pH must be between 0 and 14.");
            return;
        }

        const mixToSave = {
            ...editingMix,
            name: editingMix.name.trim(),
            description: editingMix.description?.trim() || undefined,
            waterAmount: editingMix.waterAmount.trim(),
            growId
        };

        setIsSaving(true);
        setFormError(null);
        try {
            if (mixes.some(mix => mix.id === editingMix.id)) {
                await updateMix(mixToSave);
            } else {
                await addMix(mixToSave);
            }

            const timestamp = new Date().toISOString();
            const recipeProducts: MixRecipe['products'] = [];
            for (const fertilizer of mixToSave.fertilizers) {
                const dosePerLiter = calculateDosePerLiter(fertilizer.amount, mixToSave.waterAmount);
                if (dosePerLiter === null) continue;

                const productId = createFertilizerProductId(fertilizer.name);
                const product: FertilizerProduct = {
                    id: productId,
                    name: fertilizer.name,
                    fertilizerType,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                };
                await saveFertilizerProduct(product);
                recipeProducts.push({ productId, dosePerLiter });
            }

            await saveMixRecipe({
                id: createMixRecipeIdFromLegacyMix(mixToSave.id),
                growId,
                name: mixToSave.name,
                fertilizerType,
                substrateType,
                products: recipeProducts,
                targetEc: parsedTargetEc,
                targetPh: parsedTargetPh,
                phase: phase.trim() || undefined,
                notes: mixToSave.description,
                createdAt: timestamp,
                updatedAt: timestamp,
            });
            setMixRecipes(current => [
                ...current.filter(recipe => recipe.id !== createMixRecipeIdFromLegacyMix(mixToSave.id)),
                {
                    id: createMixRecipeIdFromLegacyMix(mixToSave.id),
                    growId,
                    name: mixToSave.name,
                    fertilizerType,
                    substrateType,
                    products: recipeProducts,
                    targetEc: parsedTargetEc,
                    targetPh: parsedTargetPh,
                    phase: phase.trim() || undefined,
                    notes: mixToSave.description,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                },
            ]);

            setIsDialogOpen(false)
            setEditingMix(null)
        } catch (err) {
            console.error('Error saving fertilizer mix:', err);
            setFormError(err instanceof Error ? err.message : "Failed to save fertilizer mix.");
        } finally {
            setIsSaving(false);
        }
    }

    const handleDeleteMix = async (id: string) => {
        if (isSaving) return;

        setIsSaving(true);
        setFormError(null);
        try {
            await removeMix(id);
            setIsDialogOpen(false);
            setEditingMix(null);
        } catch (err) {
            console.error('Error deleting fertilizer mix:', err);
            setFormError(err instanceof Error ? err.message : "Failed to delete fertilizer mix.");
        } finally {
            setIsSaving(false);
        }
    }

    const handleMixCardClick = (mix: FertilizerMixDB) => {
        handleEditMix({ ...mix });
    };

    if (!growId) {
        return (
            <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-8 text-center">
                <p className="mb-4 text-muted-foreground">
                    Please select a grow to manage fertilizer mixes.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-foreground">Fertilizer Mixes</h2>
                    <p className="text-sm text-muted-foreground">{mixes.length} saved recipe{mixes.length === 1 ? '' : 's'}</p>
                </div>
                {mixes.length > 0 && (
                    <Button
                        onClick={() => handleEditMix(null)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Mix
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="rounded-3xl border border-destructive/35 bg-destructive/10 p-8 text-center">
                    <p className="text-destructive">{error.message}</p>
                </div>
            ) : mixes.length === 0 ? (
                <div className="infotainment-surface p-8 text-center">
                    <Beaker className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-xl font-semibold text-foreground">No Fertilizer Mixes</h3>
                    <p className="mb-4 text-muted-foreground">Create your first fertilizer mix to use it later when watering your plants.</p>
                    <Button
                        onClick={() => handleEditMix(null)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Create Mix
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {mixes.map((mix) => (
                        <Card
                            key={mix.id}
                            className="cursor-pointer text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60"
                            onClick={() => handleMixCardClick(mix)}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-foreground sm:text-lg">{mix.name}</CardTitle>
                                {mix.description && (
                                    <p className="text-sm text-muted-foreground">{mix.description}</p>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {mix.fertilizers.map((fert: Fertilizer, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between rounded-[0.95rem] border border-white/10 bg-white/[0.045] p-2">
                                            <div className="rounded-full border border-[#2FA98C]/50 px-2 py-1 text-sm text-[#00DF81]">
                                                {fert.name}
                                            </div>
                                            <div className="rounded-full bg-primary/[0.12] px-2 py-1 text-sm font-semibold text-primary">
                                                {formatDosePerLiter(fert.amount, mix.waterAmount)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-xl text-primary">{editingMixExists ? 'Edit Fertilizer Mix' : 'New Fertilizer Mix'}</DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="mt-4">
                        <Tabs defaultValue="details" className="mt-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="fertilizers">Fertilizers</TabsTrigger>
                            </TabsList>

                            <div className="mt-4">
                                <TabsContent value="details" className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4">
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="mix-name">Name</Label>
                                            <Input
                                                id="mix-name"
                                                value={editingMix?.name || ''}
                                                onChange={e => setEditingMix(prev => prev ? { ...prev, name: e.target.value } : null)}
                                                disabled={isSaving}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="mix-desc">Description (optional)</Label>
                                            <Textarea
                                                id="mix-desc"
                                                value={editingMix?.description || ''}
                                                onChange={e => setEditingMix(prev => prev ? { ...prev, description: e.target.value } : null)}
                                                className="rounded-2xl px-4 py-2"
                                                disabled={isSaving}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="water-amount">Water per batch (ml)</Label>
                                            <Input
                                                id="water-amount"
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={editingMix?.waterAmount || ''}
                                                onChange={e => setEditingMix(prev => prev ? { ...prev, waterAmount: e.target.value } : null)}
                                                disabled={isSaving}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <Label>Düngertyp</Label>
                                                <CustomDropdown
                                                    options={fertilizerTypeOptions}
                                                    value={fertilizerType}
                                                    onChange={(value) => setFertilizerType(value as MixRecipe['fertilizerType'])}
                                                    width="w-full"
                                                    disabled={isSaving}
                                                />
                                            </div>
                                            <div>
                                                <Label>Substrat</Label>
                                                <CustomDropdown
                                                    options={substrateTypeOptions}
                                                    value={substrateType}
                                                    onChange={(value) => setSubstrateType(value as MixRecipe['substrateType'])}
                                                    width="w-full"
                                                    disabled={isSaving}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <div>
                                                <Label htmlFor="target-ec">Ziel-EC</Label>
                                                <Input
                                                    id="target-ec"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={targetEc}
                                                    onChange={e => setTargetEc(e.target.value)}
                                                    disabled={isSaving}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="target-ph">Ziel-pH</Label>
                                                <Input
                                                    id="target-ph"
                                                    type="number"
                                                    min="0"
                                                    max="14"
                                                    step="0.01"
                                                    value={targetPh}
                                                    onChange={e => setTargetPh(e.target.value)}
                                                    disabled={isSaving}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="recipe-phase">Phase</Label>
                                                <Input
                                                    id="recipe-phase"
                                                    value={phase}
                                                    onChange={e => setPhase(e.target.value)}
                                                    disabled={isSaving}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="fertilizers" className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4">
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <div className="flex-1">
                                                <Label htmlFor="fert-name">Fertilizer</Label>
                                                <Input
                                                    id="fert-name"
                                                    value={tempFertilizer.name}
                                                    onChange={e => setTempFertilizer(prev => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Enter fertilizer name"
                                                    disabled={isSaving}
                                                />
                                            </div>
                                            <div className="sm:w-48">
                                                <Label htmlFor="fert-amount">Amount / {editingMix?.waterAmount} ml</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="fert-amount"
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        value={tempFertilizer.amount}
                                                        onChange={e => setTempFertilizer(prev => ({ ...prev, amount: e.target.value }))}
                                                        disabled={isSaving}
                                                    />
                                                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center rounded-r-full border-l border-white/10 bg-white/[0.045] pl-2 pr-4 text-muted-foreground">
                                                        ml
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="sm:self-end">
                                                <Button
                                                    onClick={handleAddFertilizer}
                                                    className="mt-4 w-full sm:mt-0 sm:w-auto"
                                                    disabled={isSaving}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" /> Add
                                                </Button>
                                            </div>
                                        </div>

                                        <ScrollArea className="h-full min-h-48 flex-1 rounded-[1rem] border border-white/10 bg-white/[0.045] p-2">
                                            {editingMix && editingMix.fertilizers.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {editingMix.fertilizers.map((fertilizer, idx) => (
                                                        <li key={idx} className="flex items-center justify-between rounded-[0.95rem] border border-white/10 bg-white/[0.045] p-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="rounded-full border border-[#2FA98C]/50 px-2 py-1 text-sm text-[#00DF81]">
                                                                    {fertilizer.name}
                                                                </div>
                                                                <div className="rounded-full bg-primary/[0.12] px-2 py-1 text-sm font-semibold text-primary">
                                                                    {fertilizer.amount} ml / {editingMix.waterAmount} ml
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={() => handleRemoveFertilizer(idx)}
                                                                disabled={isSaving}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                                                    <Droplet className="h-8 w-8 mb-2" />
                                                    <p>No fertilizers added yet</p>
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>

                    <div className="mt-6 flex flex-col gap-4">
                        {formError && (
                            <p className="text-sm text-destructive">{formError}</p>
                        )}
                        <Button
                            onClick={handleSaveMix}
                            className="w-full"
                            disabled={!editingMix || !editingMix.name.trim() || !editingMix.waterAmount || !editingMix.fertilizers.length || isSaving}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? "Saving..." : "Save Mix"}
                        </Button>
                        {editingMixExists && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={isSaving}
                                onClick={() => {
                                    if (editingMix) {
                                        handleDeleteMix(editingMix.id);
                                    }
                                }}
                            >
                                <Trash className="h-4 w-4 mr-1" />
                                Delete
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
