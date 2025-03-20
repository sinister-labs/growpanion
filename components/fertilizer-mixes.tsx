import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Droplet, Edit, Plus, Save, Trash, X, Beaker, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useFertilizerMixes } from "@/hooks/useFertilizerMixes"
import { FertilizerMix, Fertilizer } from "@/components/plant-modal/types"
import { FertilizerMixDB } from "@/lib/db"

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

    const [tempFertilizer, setTempFertilizer] = useState<Fertilizer>({
        name: "",
        amount: ""
    });

    const fertilizerOptions = [
        "General Purpose",
        "Bloom Booster",
        "Root Stimulator",
        "CalMag",
        "PK Booster",
        "Enzyme",
        "Bakterien",
        "Mykorrhiza"
    ]

    const handleEditMix = (mix: FertilizerMixDB | null) => {
        setEditingMix(mix || {
            id: `mix-${Date.now()}`,
            name: "",
            description: "",
            waterAmount: "1000",
            fertilizers: [],
            growId: growId || ""
        })
        setIsDialogOpen(true)
    }

    const handleAddFertilizer = () => {
        if (!tempFertilizer.name || !tempFertilizer.amount || !editingMix) return;

        setEditingMix({
            ...editingMix,
            fertilizers: [...(editingMix.fertilizers || []), { ...tempFertilizer }]
        });

        setTempFertilizer({ name: "", amount: "" });
    };

    const handleRemoveFertilizer = (index: number) => {
        if (!editingMix) return;

        setEditingMix({
            ...editingMix,
            fertilizers: editingMix.fertilizers.filter((_, i) => i !== index)
        })
    }

    const handleSaveMix = () => {
        if (!editingMix || !editingMix.name || !editingMix.waterAmount || !editingMix.fertilizers.length || !growId) return;

        const mixToSave = {
            ...editingMix,
            growId
        };

        if (mixes.some(mix => mix.id === editingMix.id)) {
            updateMix(mixToSave);
        } else {
            addMix(mixToSave);
        }

        setIsDialogOpen(false)
        setEditingMix(null)
    }

    const handleDeleteMix = (id: string) => {
        removeMix(id)
    }

    const handleMixCardClick = (mix: FertilizerMixDB) => {
        handleEditMix({ ...mix });
    };

    if (!growId) {
        return (
            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-8 text-center">
                <p className="text-gray-400 mb-4">
                    Please select a grow to manage fertilizer mixes.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-white">Fertilizer Mixes</h2>
                {mixes.length > 0 && (
                    <Button
                        onClick={() => handleEditMix(null)}
                        className="bg-green-500 hover:bg-green-700"
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Mix
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                </div>
            ) : error ? (
                <div className="bg-red-800 p-8 rounded-lg border border-red-700 text-center">
                    <p className="text-red-400">{error.message}</p>
                </div>
            ) : mixes.length === 0 ? (
                <div className=" p-8 rounded-2xl border-2 border-gray-700 text-center">
                    <Beaker className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <h3 className="text-xl font-semibold mb-2 text-white">No Fertilizer Mixes</h3>
                    <p className="text-gray-400 mb-4">Create your first fertilizer mix to use it later when watering your plants.</p>
                    <Button
                        onClick={() => handleEditMix(null)}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Create Mix
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mixes.map((mix) => (
                        <Card
                            key={mix.id}
                            className="bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg border-gray-700 hover:border-green-400 transition-all duration-300 transform hover:scale-105 cursor-pointer text-left"
                            onClick={() => handleMixCardClick(mix)}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base sm:text-lg font-medium text-green-400">{mix.name}</CardTitle>
                                {mix.description && (
                                    <p className="text-sm text-gray-400">{mix.description}</p>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {mix.fertilizers.map((fert: Fertilizer, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-700/30 p-2 rounded-lg">
                                            <div className="border border-blue-600 text-blue-400 px-2 py-1 rounded-full text-sm">
                                                {fert.name}
                                            </div>
                                            <div className="bg-green-600/80 text-white px-2 py-1 rounded-full text-sm">
                                                {fert.amount} ml/L
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
                <DialogContent className="bg-gray-800/95 backdrop-blur-md border-gray-700 text-white max-w-3xl rounded-xl p-6">
                    <DialogHeader>
                        <div className="flex justify-between items-center">
                            <DialogTitle className="text-green-400 text-xl">{editingMix && editingMix.id.startsWith('mix-') ? 'New Fertilizer Mix' : 'Edit Fertilizer Mix'}</DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="relative mt-4 min-h-[320px]">
                        <Tabs defaultValue="details" className="mt-4">
                            <TabsList className="grid grid-cols-2 bg-gray-800 rounded-full">
                                <TabsTrigger value="details" className="rounded-full data-[state=active]:bg-green-500 data-[state=active]:text-gray-800">Details</TabsTrigger>
                                <TabsTrigger value="fertilizers" className="rounded-full data-[state=active]:bg-green-500 data-[state=active]:text-gray-800">Fertilizers</TabsTrigger>
                            </TabsList>

                            <div className="relative mt-4 min-h-[320px]">
                                <TabsContent value="details" className="p-4 bg-gray-800/80 bg-gray-900 absolute inset-0 rounded-xl transition-all duration-300 ease-in-out">
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="mix-name" className="text-white">Name</Label>
                                            <Input
                                                id="mix-name"
                                                value={editingMix?.name || ''}
                                                onChange={e => setEditingMix(prev => prev ? { ...prev, name: e.target.value } : null)}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="mix-desc" className="text-white">Description (optional)</Label>
                                            <Textarea
                                                id="mix-desc"
                                                value={editingMix?.description || ''}
                                                onChange={e => setEditingMix(prev => prev ? { ...prev, description: e.target.value } : null)}
                                                className="bg-gray-800/80 border-gray-700 text-white rounded-2xl px-4 py-2"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="water-amount" className="text-white">Water per batch (ml)</Label>
                                            <Input
                                                id="water-amount"
                                                type="number"
                                                value={editingMix?.waterAmount || ''}
                                                onChange={e => setEditingMix(prev => prev ? { ...prev, waterAmount: e.target.value } : null)}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="fertilizers" className="p-4 bg-gray-800/80 bg-gray-900 absolute inset-0 rounded-xl transition-all duration-300 ease-in-out">
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <div className="flex-1">
                                                <Label htmlFor="fert-name" className="text-white">Fertilizer</Label>
                                                <Input
                                                    id="fert-name"
                                                    value={tempFertilizer.name}
                                                    onChange={e => setTempFertilizer(prev => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Enter fertilizer name"
                                                    className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 text-white"
                                                />
                                            </div>
                                            <div className="sm:w-48">
                                                <Label htmlFor="fert-amount" className="text-white">Amount / {editingMix?.waterAmount} ml</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="fert-amount"
                                                        type="number"
                                                        value={tempFertilizer.amount}
                                                        onChange={e => setTempFertilizer(prev => ({ ...prev, amount: e.target.value }))}
                                                    />
                                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 pointer-events-none border-l-2 pl-2 border-gray-700 bg-gray-700 rounded-r-full">
                                                        ml
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="sm:self-end">
                                                <Button
                                                    onClick={handleAddFertilizer}
                                                    className="bg-green-600 hover:bg-green-700 rounded-full w-full sm:w-auto mt-4 sm:mt-0"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" /> Add
                                                </Button>
                                            </div>
                                        </div>

                                        <ScrollArea className="flex-1 min-h-48 h-full bg-gray-800/50 rounded-xl p-2 border border-gray-700/50">
                                            {editingMix && editingMix.fertilizers.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {editingMix.fertilizers.map((fertilizer, idx) => (
                                                        <li key={idx} className="flex justify-between items-center bg-gray-700/30 p-2 rounded-lg">
                                                            <div className="flex items-center gap-2">
                                                                <div className="border border-blue-600 text-blue-400 px-2 py-1 rounded-full text-sm">
                                                                    {fertilizer.name}
                                                                </div>
                                                                <div className="bg-green-600/80 text-white px-2 py-1 rounded-full text-sm">
                                                                    {fertilizer.amount} ml / {editingMix.waterAmount} ml
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full"
                                                                onClick={() => handleRemoveFertilizer(idx)}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
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
                        <Button
                            onClick={handleSaveMix}
                            className="bg-green-600 hover:bg-green-700 rounded-full w-full"
                            disabled={!editingMix || !editingMix.name || !editingMix.waterAmount || !editingMix.fertilizers.length}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Save Mix
                        </Button>
                        {editingMix && !editingMix.id.startsWith('mix-') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-full w-full"
                                onClick={() => {
                                    if (editingMix) {
                                        handleDeleteMix(editingMix.id);
                                        setIsDialogOpen(false);
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