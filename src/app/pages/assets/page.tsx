'use client';

import { useState, useRef } from 'react';
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
import { PlusCircle, Pencil, Trash2, FileText, Upload, Download, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

interface Asset {
  id: string;
  name: string;
  type: string;
  value: number;
  description?: string;
  pdfFile?: string;
}

interface PendingAsset {
  id: string;
  name: string;
  type: string;
  value: number;
  description?: string;
  pdfFile?: string;
  status: string;
  createdAt: string;
}

interface FamilyMember {
  id: string;
  fullName: string;
  relationship: string;
}

interface FamilyAsset {
  familyMember: FamilyMember;
  assets: Array<Asset & { user: { fullName: string }, createdAt: string }>;
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

const fetchPendingAssets = async () => {
  const response = await fetch('/api/pending-asset');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const fetchFamilyAssets = async () => {
  const response = await fetch('/api/family-assets');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const createAsset = async (data: Omit<Asset, 'id'>) => {
  const response = await fetch('/api/pending-asset', {
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

// File upload function
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload file');
  }

  return response.json();
};

export default function AssetsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Queries
  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  const { 
    data: pendingAssets = [], 
    isLoading: isPendingAssetsLoading, 
    error: pendingAssetsError 
  } = useQuery({
    queryKey: ['pendingAssets'],
    queryFn: fetchPendingAssets,
  });

  const { 
    data: familyAssets = [], 
    isLoading: isFamilyAssetsLoading, 
    error: familyAssetsError 
  } = useQuery({
    queryKey: ['familyAssets'],
    queryFn: fetchFamilyAssets,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingAssets'] });
      toast.success('Asset submitted for approval');
      setIsOpen(false);
      setUploadedFilePath(null);
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
      setUploadedFilePath(null);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    try {
      setUploading(true);
      const result = await uploadFile(file);
      setUploadedFilePath(result.filePath);
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assetData = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      value: parseFloat(formData.get('value') as string),
      description: formData.get('description') as string,
      pdfFile: uploadedFilePath || editingAsset?.pdfFile,
    };

    if (editingAsset) {
      updateMutation.mutate({ ...assetData, id: editingAsset.id });
    } else {
      if (!assetData.pdfFile) {
        toast.error('Please upload a PDF file');
        return;
      }
      createMutation.mutate(assetData);
    }
  };

  const handleOpenDialog = (asset: Asset | null = null) => {
    setEditingAsset(asset);
    setUploadedFilePath(null);
    setIsOpen(true);
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
            <Button onClick={() => handleOpenDialog(null)}>
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
                  <Label htmlFor="pdfFile">PDF Document</Label>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="pdfFile"
                      className="flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Uploading...' : 'Upload PDF'}
                    </Label>
                    <Input
                      id="pdfFile"
                      name="pdfFile"
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      disabled={uploading}
                    />
                    {(uploadedFilePath || editingAsset?.pdfFile) && (
                      <span className="text-sm text-green-600 flex items-center">
                        <FileText className="mr-1 h-4 w-4" /> PDF uploaded
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a PDF document (max 5MB)
                  </p>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {editingAsset ? 'Update' : 'Submit for Approval'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="my-assets" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="my-assets">My Assets</TabsTrigger>
          <TabsTrigger value="pending-assets">
            Pending Approval
          </TabsTrigger>
          <TabsTrigger value="family-assets">
            <Users className="mr-2 h-4 w-4" />
            Family Assets
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-assets">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value (RM)</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No assets found. Add your first asset using the button above.
                    </TableCell>
                  </TableRow>
                ) : (
                  assets.map((asset: Asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.type}</TableCell>
                      <TableCell>{asset.value.toFixed(2)}</TableCell>
                      <TableCell>{asset.description}</TableCell>
                      <TableCell>
                        {asset.pdfFile ? (
                          <a
                            href={asset.pdfFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 hover:text-blue-800"
                          >
                            <Download className="mr-1 h-4 w-4" />
                            View PDF
                          </a>
                        ) : (
                          <span className="text-gray-400">No document</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenDialog(asset)}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="pending-assets">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value (RM)</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPendingAssetsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pendingAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      No pending assets found. Submit an asset for approval using the button above.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingAssets.map((asset: PendingAsset) => (
                    <TableRow key={asset.id}>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.type}</TableCell>
                      <TableCell>{asset.value.toFixed(2)}</TableCell>
                      <TableCell>{asset.description}</TableCell>
                      <TableCell>
                        {asset.pdfFile ? (
                          <a
                            href={asset.pdfFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 hover:text-blue-800"
                          >
                            <Download className="mr-1 h-4 w-4" />
                            View PDF
                          </a>
                        ) : (
                          <span className="text-gray-400">No document</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {asset.status === 'pending' && (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                        {asset.status === 'approved' && (
                          <Badge variant="success">Approved</Badge>
                        )}
                        {asset.status === 'rejected' && (
                          <Badge variant="destructive">Rejected</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(asset.createdAt), 'dd/MM/yyyy')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="family-assets">
          {isFamilyAssetsLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : familyAssetsError ? (
            <div className="text-center py-10 text-red-500">
              Error loading family assets: {(familyAssetsError as Error).message}
            </div>
          ) : familyAssets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No family members with assets found. Family members need to be registered users and have assets for them to appear here.
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {familyAssets.map((familyAssetGroup: FamilyAsset) => (
                <AccordionItem 
                  key={familyAssetGroup.familyMember.id} 
                  value={familyAssetGroup.familyMember.id}
                >
                  <AccordionTrigger className="hover:bg-accent hover:text-accent-foreground px-4 rounded-md">
                    <div className="flex items-center">
                      <span className="font-medium">{familyAssetGroup.familyMember.fullName}</span>
                      <Badge variant="outline" className="ml-2 capitalize">
                        {familyAssetGroup.familyMember.relationship}
                      </Badge>
                      <Badge variant="secondary" className="ml-2">
                        {familyAssetGroup.assets.length} assets
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="border rounded-lg mt-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Value (RM)</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Document</TableHead>
                            <TableHead>Added On</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {familyAssetGroup.assets.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                                No assets found for this family member.
                              </TableCell>
                            </TableRow>
                          ) : (
                            familyAssetGroup.assets.map((asset) => (
                              <TableRow key={asset.id}>
                                <TableCell>{asset.name}</TableCell>
                                <TableCell>{asset.type}</TableCell>
                                <TableCell>{asset.value.toFixed(2)}</TableCell>
                                <TableCell>{asset.description}</TableCell>
                                <TableCell>
                                  {asset.pdfFile ? (
                                    <a
                                      href={asset.pdfFile}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center text-blue-600 hover:text-blue-800"
                                    >
                                      <Download className="mr-1 h-4 w-4" />
                                      View PDF
                                    </a>
                                  ) : (
                                    <span className="text-gray-400">No document</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(asset.createdAt), 'dd/MM/yyyy')}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}