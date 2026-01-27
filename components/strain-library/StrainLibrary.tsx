"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Strain, getAllStrains, saveStrain, deleteStrain } from '@/lib/db';
import StrainCard from './StrainCard';
import StrainForm from './StrainForm';
import { Cannabis, Plus, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StrainLibraryProps {
  onSelectStrain?: (strain: Strain) => void;
  selectionMode?: boolean;
}

const StrainLibrary: React.FC<StrainLibraryProps> = ({
  onSelectStrain,
  selectionMode = false,
}) => {
  const [strains, setStrains] = useState<Strain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStrain, setEditingStrain] = useState<Strain | undefined>();
  const [deletingStrainId, setDeletingStrainId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load strains
  useEffect(() => {
    loadStrains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStrains = async () => {
    try {
      setIsLoading(true);
      const allStrains = await getAllStrains();
      setStrains(allStrains);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load strains',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter strains
  const filteredStrains = useMemo(() => {
    if (!searchQuery) return strains;
    
    const query = searchQuery.toLowerCase();
    return strains.filter(strain =>
      strain.name.toLowerCase().includes(query) ||
      strain.breeder.toLowerCase().includes(query) ||
      strain.genetics.toLowerCase().includes(query)
    );
  }, [strains, searchQuery]);

  // Handle save
  const handleSave = async (strain: Strain) => {
    try {
      await saveStrain(strain);
      await loadStrains();
      setIsFormOpen(false);
      setEditingStrain(undefined);
      toast({
        variant: 'success',
        title: editingStrain ? 'Strain Updated' : 'Strain Added',
        description: `"${strain.name}" has been saved to your library.`,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save strain',
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingStrainId) return;
    
    try {
      await deleteStrain(deletingStrainId);
      await loadStrains();
      setDeletingStrainId(null);
      toast({
        variant: 'success',
        title: 'Strain Deleted',
        description: 'The strain has been removed from your library.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete strain',
      });
    }
  };

  // Handle edit
  const handleEdit = (strain: Strain) => {
    setEditingStrain(strain);
    setIsFormOpen(true);
  };

  // Handle select
  const handleSelect = (strain: Strain) => {
    if (selectionMode && onSelectStrain) {
      onSelectStrain(strain);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Cannabis className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">Strain Library</CardTitle>
              <p className="text-sm text-gray-400">
                {strains.length} strain{strains.length !== 1 ? 's' : ''} in your collection
              </p>
            </div>
          </div>

          {!selectionMode && (
            <Button
              onClick={() => {
                setEditingStrain(undefined);
                setIsFormOpen(true);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Strain
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search strains by name, breeder, or genetics..."
            className="pl-10"
          />
        </div>

        {/* Strains Grid */}
        {filteredStrains.length === 0 ? (
          <div className="text-center py-12">
            <Cannabis className="h-12 w-12 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              {searchQuery ? 'No strains found' : 'No strains in your library'}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery 
                ? 'Try a different search term'
                : 'Add your first strain to get started'}
            </p>
            {!searchQuery && !selectionMode && (
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Strain
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStrains.map(strain => (
              <StrainCard
                key={strain.id}
                strain={strain}
                onEdit={selectionMode ? undefined : handleEdit}
                onDelete={selectionMode ? undefined : (id) => setDeletingStrainId(id)}
                onSelect={selectionMode ? handleSelect : undefined}
                showActions={!selectionMode}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Strain Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-green-400">
              {editingStrain ? 'Edit Strain' : 'Add New Strain'}
            </DialogTitle>
          </DialogHeader>
          <StrainForm
            strain={editingStrain}
            onSave={handleSave}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingStrain(undefined);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog 
        open={!!deletingStrainId} 
        onOpenChange={(open) => !open && setDeletingStrainId(null)}
      >
        <AlertDialogContent className="bg-gray-800 text-white border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Strain</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete this strain from your library?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600 border-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

StrainLibrary.displayName = 'StrainLibrary';

export default StrainLibrary;
