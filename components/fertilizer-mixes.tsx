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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

    // Temporary state for a new fertilizer
    const [tempFertilizer, setTempFertilizer] = useState<Fertilizer>({
        name: "",
        amount: ""
    });

    // Fertilizer options
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

    // Start creating or editing a mix
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

    // Add fertilizer to the mix
    const handleAddFertilizer = () => {
        if (!tempFertilizer.name || !tempFertilizer.amount || !editingMix) return;

        setEditingMix({
            ...editingMix,
            fertilizers: [...(editingMix.fertilizers || []), { ...tempFertilizer }]
        });

        setTempFertilizer({ name: "", amount: "" });
    };

    // Remove fertilizer from the mix
    const handleRemoveFertilizer = (index: number) => {
        if (!editingMix) return;

        setEditingMix({
            ...editingMix,
            fertilizers: editingMix.fertilizers.filter((_, i) => i !== index)
        })
    }

    // Save mix
    const handleSaveMix = () => {
        if (!editingMix || !editingMix.name || !editingMix.waterAmount || !editingMix.fertilizers.length || !growId) return;

        const mixToSave = {
            ...editingMix,
            growId
        };

        // Update existing mix or add new
        if (mixes.some(mix => mix.id === editingMix.id)) {
            updateMix(mixToSave);
        } else {
            addMix(mixToSave);
        }

        setIsDialogOpen(false)
        setEditingMix(null)
    }

    // Delete mix
    const handleDeleteMix = (id: string) => {
        removeMix(id)
    }

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
                <Button
                    onClick={() => handleEditMix(null)}
                    className="bg-green-600 hover:bg-green-700"
                >
                    <Plus className="mr-2 h-4 w-4" /> New Mix
                </Button>
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
                <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
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
                    {mixes.map(mix => (
                        <Card key={mix.id} className="bg-gray-800 border-gray-700">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-green-400">{mix.name}</CardTitle>
                                {mix.description && (
                                    <p className="text-sm text-gray-400">{mix.description}</p>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {mix.fertilizers.map((fert, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                                            <div className="border border-blue-600 text-blue-400 px-2 py-1 rounded text-sm">
                                                {fert.name}
                                            </div>
                                            <div className="bg-green-600 text-white px-2 py-1 rounded text-sm">
                                                {fert.amount} ml/L
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <div className="px-6 pb-4 pt-2 flex justify-between">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-white"
                                    onClick={() => handleEditMix(mix)}
                                >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={() => handleDeleteMix(mix.id)}
                                >
                                    <Trash className="h-4 w-4 mr-1" />
                                    Delete
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Dialog for creating/editing a mix */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-green-400">{editingMix && editingMix.id.startsWith('mix-') ? 'New Fertilizer Mix' : 'Edit Fertilizer Mix'}</DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="details" className="mt-4">
                        <TabsList className="grid grid-cols-2 bg-gray-900">
                            <TabsTrigger value="details" className="data-[state=active]:bg-gray-700">Details</TabsTrigger>
                            <TabsTrigger value="fertilizers" className="data-[state=active]:bg-gray-700">Fertilizers</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="p-4 bg-gray-900 rounded-md mt-2">
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="mix-name" className="text-white">Name</Label>
                                    <Input
                                        id="mix-name"
                                        value={editingMix?.name || ''}
                                        onChange={e => setEditingMix(prev => prev ? { ...prev, name: e.target.value } : null)}
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="mix-desc" className="text-white">Description (optional)</Label>
                                    <Textarea
                                        id="mix-desc"
                                        value={editingMix?.description || ''}
                                        onChange={e => setEditingMix(prev => prev ? { ...prev, description: e.target.value } : null)}
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="water-amount" className="text-white">Water per batch (ml)</Label>
                                    <Input
                                        id="water-amount"
                                        type="number"
                                        value={editingMix?.waterAmount || ''}
                                        onChange={e => setEditingMix(prev => prev ? { ...prev, waterAmount: e.target.value } : null)}
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="fertilizers" className="p-4 bg-gray-900 rounded-md mt-2">
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="flex-1">
                                        <Label htmlFor="fert-name" className="text-white">Fertilizer</Label>
                                        <Select
                                            value={tempFertilizer.name}
                                            onValueChange={val => setTempFertilizer(prev => ({ ...prev, name: val }))}
                                        >
                                            <SelectTrigger id="fert-name" className="bg-gray-800 border-gray-700 text-white">
                                                <SelectValue placeholder="Select fertilizer" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700">
                                                {fertilizerOptions.map(opt => (
                                                    <SelectItem key={opt} value={opt} className="text-white cursor-pointer">{opt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="sm:w-32">
                                        <Label htmlFor="fert-amount" className="text-white">ml pro Liter</Label>
                                        <Input
                                            id="fert-amount"
                                            type="number"
                                            value={tempFertilizer.amount}
                                            onChange={e => setTempFertilizer(prev => ({ ...prev, amount: e.target.value }))}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    <div className="sm:self-end">
                                        <Button
                                            onClick={handleAddFertilizer}
                                            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto mt-4 sm:mt-0"
                                        >
                                            <Plus className="mr-2 h-4 w-4" /> Hinzufügen
                                        </Button>
                                    </div>
                                </div>

                                <ScrollArea className="h-40 bg-gray-800 rounded-md p-2">
                                    {editingMix && editingMix.fertilizers.length > 0 ? (
                                        <ul className="space-y-2">
                                            {editingMix.fertilizers.map((fertilizer, idx) => (
                                                <li key={idx} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                                                    <div className="flex items-center gap-2">
                                                        <div className="border border-blue-600 text-blue-400 px-2 py-1 rounded text-sm">
                                                            {fertilizer.name}
                                                        </div>
                                                        <div className="bg-green-600 text-white px-2 py-1 rounded text-sm">
                                                            {fertilizer.amount} ml/L
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
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
                    </Tabs>

                    <div className="flex justify-between mt-6">
                        <Button
                            variant="outline"
                            className="border-gray-700 text-gray-400 hover:bg-gray-800"
                            onClick={() => setIsDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveMix}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={!editingMix || !editingMix.name || !editingMix.waterAmount || !editingMix.fertilizers.length}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Save Mix
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
} 