'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Asset {
  id: string;
  name: string;
  type: string;
  value: number;
  description?: string;
  purchaseDate: string;
}

const assetTypes = [
  'Property',
  'Vehicle',
  'Investment',
  'Savings',
  'Insurance',
  'Others',
];

// API functions
const fetchAssets = async () => {
  const response = await fetch('/api/asset');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const createAsset = async (data: Omit<Asset, 'id'>) => {
  const response = await fetch('/api/asset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const updateAsset = async ({ id, ...data }: Asset) => {
  const response = await fetch('/api/asset', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const deleteAsset = async (id: string) => {
  const response = await fetch(`/api/asset/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export default function AssetsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const queryClient = useQueryClient();

  // Queries
  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset added successfully');
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to add asset: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset updated successfully');
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update asset: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete asset: ' + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assetData = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      value: parseFloat(formData.get('value') as string),
      description: formData.get('description') as string,
      purchaseDate: formData.get('purchaseDate') as string,
    };

    if (editingAsset) {
      updateMutation.mutate({ ...assetData, id: editingAsset.id });
    } else {
      createMutation.mutate(assetData);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {(error as Error).message}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Assets</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingAsset(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAsset ? 'Edit' : 'Add'} Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Asset Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingAsset?.name}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Asset Type</Label>
                  <Select name="type" defaultValue={editingAsset?.type || assetTypes[0]}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="value">Value (RM)</Label>
                  <Input
                    id="value"
                    name="value"
                    type="number"
                    step="0.01"
                    defaultValue={editingAsset?.value}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    defaultValue={editingAsset?.description}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    name="purchaseDate"
                    type="date"
                    defaultValue={editingAsset?.purchaseDate?.split('T')[0]}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingAsset ? 'Update' : 'Add'} Asset
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value (RM)</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>{asset.name}</TableCell>
                <TableCell>{asset.type}</TableCell>
                <TableCell>{asset.value.toFixed(2)}</TableCell>
                <TableCell>{asset.description}</TableCell>
                <TableCell>{format(new Date(asset.purchaseDate), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditingAsset(asset);
                      setIsOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteMutation.mutate(asset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}