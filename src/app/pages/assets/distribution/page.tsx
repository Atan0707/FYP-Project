'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { 
  Gift, 
  Scale, 
  Building, 
  Scroll, 
  PlusCircle, 
  Pencil, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface Beneficiary {
  familyId: string;
  percentage: number;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  value: number;
  description?: string;
  pdfFile?: string;
  distribution?: AssetDistribution | null;
}

interface AssetDistribution {
  id: string;
  type: string;
  notes?: string;
  status: string;
  beneficiaries?: Beneficiary[];
  organization?: string;
  assetId: string;
  createdAt: string;
  updatedAt: string;
}

interface FamilyMember {
  id: string;
  fullName: string;
  relationship: string;
}

// API functions
const fetchAssetsWithDistributions = async () => {
  const response = await fetch('/api/asset-distribution');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const fetchFamilyMembers = async () => {
  const response = await fetch('/api/family');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const createAssetDistribution = async (data: Omit<AssetDistribution, 'id' | 'createdAt' | 'updatedAt'>) => {
  const response = await fetch('/api/asset-distribution', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const updateAssetDistribution = async (data: Partial<AssetDistribution> & { id: string }) => {
  const response = await fetch('/api/asset-distribution', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export default function AssetDistributionPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [distributionType, setDistributionType] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Queries
  const { data: assets = [], isLoading: isAssetsLoading, error: assetsError } = useQuery({
    queryKey: ['assetsWithDistributions'],
    queryFn: fetchAssetsWithDistributions,
  });

  const { data: familyMembers = [], isLoading: isFamilyLoading, error: familyError } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: fetchFamilyMembers,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createAssetDistribution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetsWithDistributions'] });
      toast.success('Asset distribution created successfully');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to create asset distribution: ' + (error as Error).message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAssetDistribution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetsWithDistributions'] });
      toast.success('Asset distribution updated successfully');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update asset distribution: ' + (error as Error).message);
    },
  });

  const resetForm = () => {
    setSelectedAsset(null);
    setDistributionType('');
    setNotes('');
    setOrganization('');
    setBeneficiaries([]);
    setIsEditing(false);
  };

  const handleOpenDialog = (asset: Asset) => {
    setSelectedAsset(asset);
    
    if (asset.distribution) {
      setIsEditing(true);
      setDistributionType(asset.distribution.type);
      setNotes(asset.distribution.notes || '');
      setOrganization(asset.distribution.organization || '');
      setBeneficiaries(asset.distribution.beneficiaries || []);
    } else {
      setIsEditing(false);
      setDistributionType('');
      setNotes('');
      setOrganization('');
      setBeneficiaries([]);
    }
    
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAsset) return;
    
    const distributionData = {
      type: distributionType,
      notes,
      assetId: selectedAsset.id,
    };

    // Add type-specific data
    if (distributionType === 'waqf') {
      if (!organization) {
        toast.error('Please specify an organization for waqf');
        return;
      }
      Object.assign(distributionData, { organization });
    } else if (distributionType === 'hibah' || distributionType === 'will') {
      if (beneficiaries.length === 0) {
        toast.error('Please add at least one beneficiary');
        return;
      }
      
      // Validate that percentages add up to 100%
      const totalPercentage = beneficiaries.reduce((sum, b) => sum + b.percentage, 0);
      if (totalPercentage !== 100) {
        toast.error('Beneficiary percentages must add up to 100%');
        return;
      }
      
      Object.assign(distributionData, { beneficiaries });
    }

    if (isEditing && selectedAsset.distribution) {
      updateMutation.mutate({
        id: selectedAsset.distribution.id,
        ...distributionData,
      });
    } else {
      createMutation.mutate(distributionData as Omit<AssetDistribution, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  const addBeneficiary = () => {
    if (familyMembers.length === 0) {
      toast.error('You need to add family members first');
      return;
    }
    
    setBeneficiaries([...beneficiaries, { familyId: '', percentage: 0 }]);
  };

  const updateBeneficiary = (index: number, field: 'familyId' | 'percentage', value: string | number) => {
    const updatedBeneficiaries = [...beneficiaries];
    updatedBeneficiaries[index] = {
      ...updatedBeneficiaries[index],
      [field]: field === 'percentage' ? Number(value) : value,
    };
    setBeneficiaries(updatedBeneficiaries);
  };

  const removeBeneficiary = (index: number) => {
    const updatedBeneficiaries = [...beneficiaries];
    updatedBeneficiaries.splice(index, 1);
    setBeneficiaries(updatedBeneficiaries);
  };

  const getDistributionTypeIcon = (type: string) => {
    switch (type) {
      case 'waqf':
        return <Building className="h-4 w-4" />;
      case 'faraid':
        return <Scale className="h-4 w-4" />;
      case 'hibah':
        return <Gift className="h-4 w-4" />;
      case 'will':
        return <Scroll className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case 'completed':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDistributionTypeName = (type: string) => {
    switch (type) {
      case 'waqf':
        return 'Waqf (Endowment)';
      case 'faraid':
        return 'Faraid (Islamic Inheritance)';
      case 'hibah':
        return 'Hibah (Gift)';
      case 'will':
        return 'Will (Wasiat)';
      default:
        return type;
    }
  };

  // Filter assets by distribution status
  const undistributedAssets = assets.filter((asset: Asset) => !asset.distribution);
  const distributedAssets = assets.filter((asset: Asset) => asset.distribution);

  if (isAssetsLoading || isFamilyLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (assetsError || familyError) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64 text-red-500">
          <AlertCircle className="mr-2 h-5 w-5" />
          <span>Error: {((assetsError || familyError) as Error).message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Asset Distribution</h1>
      </div>

      <Tabs defaultValue="undistributed" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="undistributed">Undistributed Assets</TabsTrigger>
          <TabsTrigger value="distributed">Distributed Assets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="undistributed">
          {undistributedAssets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No undistributed assets found. All your assets have been assigned a distribution method.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {undistributedAssets.map((asset: Asset) => (
                <Card key={asset.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle>{asset.name}</CardTitle>
                    <CardDescription>
                      {asset.type} • RM {asset.value.toFixed(2)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground">
                      {asset.description || 'No description provided'}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => handleOpenDialog(asset)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Distribute Asset
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="distributed">
          {distributedAssets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No distributed assets found. Start by distributing your assets from the Undistributed Assets tab.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {distributedAssets.map((asset: Asset) => (
                <Card key={asset.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{asset.name}</CardTitle>
                        <CardDescription>
                          {asset.type} • RM {asset.value.toFixed(2)}
                        </CardDescription>
                      </div>
                      {asset.distribution && getStatusBadge(asset.distribution.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 space-y-3">
                    <div className="flex items-center gap-2">
                      {asset.distribution && getDistributionTypeIcon(asset.distribution.type)}
                      <span className="font-medium">
                        {asset.distribution && getDistributionTypeName(asset.distribution.type)}
                      </span>
                    </div>
                    
                    {asset.distribution?.type === 'waqf' && asset.distribution.organization && (
                      <div className="text-sm">
                        <span className="font-medium">Organization:</span> {asset.distribution.organization}
                      </div>
                    )}
                    
                    {(asset.distribution?.type === 'hibah' || asset.distribution?.type === 'will') && 
                     asset.distribution.beneficiaries && (
                      <div className="text-sm">
                        <span className="font-medium">Beneficiaries:</span>
                        <ul className="mt-1 space-y-1">
                          {asset.distribution.beneficiaries.map((beneficiary: Beneficiary, index: number) => {
                            const familyMember = familyMembers.find((f: FamilyMember) => f.id === beneficiary.familyId);
                            return (
                              <li key={index} className="flex justify-between">
                                <span>{familyMember?.fullName || 'Unknown'}</span>
                                <span>{beneficiary.percentage}%</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    
                    {asset.distribution?.notes && (
                      <div className="text-sm">
                        <span className="font-medium">Notes:</span> {asset.distribution.notes}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => handleOpenDialog(asset)}
                      disabled={asset.distribution?.status === 'completed'}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Distribution
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit' : 'Create'} Asset Distribution
            </DialogTitle>
            <DialogDescription>
              {selectedAsset?.name} ({selectedAsset?.type}) - RM {selectedAsset?.value.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="distributionType">Distribution Type</Label>
                <RadioGroup 
                  id="distributionType" 
                  value={distributionType} 
                  onValueChange={setDistributionType}
                  className="grid grid-cols-2 gap-4 pt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="waqf" id="waqf" />
                    <Label htmlFor="waqf" className="flex items-center gap-2 cursor-pointer">
                      <Building className="h-4 w-4" />
                      Waqf
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="faraid" id="faraid" />
                    <Label htmlFor="faraid" className="flex items-center gap-2 cursor-pointer">
                      <Scale className="h-4 w-4" />
                      Faraid
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hibah" id="hibah" />
                    <Label htmlFor="hibah" className="flex items-center gap-2 cursor-pointer">
                      <Gift className="h-4 w-4" />
                      Hibah
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="will" id="will" />
                    <Label htmlFor="will" className="flex items-center gap-2 cursor-pointer">
                      <Scroll className="h-4 w-4" />
                      Will
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {distributionType === 'waqf' && (
                <div>
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Enter organization name"
                    className="mt-1"
                  />
                </div>
              )}

              {(distributionType === 'hibah' || distributionType === 'will') && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Beneficiaries</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addBeneficiary}
                    >
                      <PlusCircle className="mr-2 h-3 w-3" />
                      Add
                    </Button>
                  </div>
                  
                  {beneficiaries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No beneficiaries added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {beneficiaries.map((beneficiary, index) => (
                        <div key={index} className="grid grid-cols-[1fr,80px,auto] gap-2 items-center">
                          <Select
                            value={beneficiary.familyId}
                            onValueChange={(value) => updateBeneficiary(index, 'familyId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select family member" />
                            </SelectTrigger>
                            <SelectContent>
                              {familyMembers && Array.isArray(familyMembers) ? familyMembers.map((member: FamilyMember) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.fullName} ({member.relationship})
                                </SelectItem>
                              )) : (
                                <SelectItem disabled value="">No family members found</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          
                          <div className="flex items-center">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={beneficiary.percentage}
                              onChange={(e) => updateBeneficiary(index, 'percentage', e.target.value)}
                              className="w-full"
                            />
                            <span className="ml-1">%</span>
                          </div>
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBeneficiary(index)}
                            className="text-destructive"
                          >
                            &times;
                          </Button>
                        </div>
                      ))}
                      
                      <div className="flex justify-between text-sm">
                        <span>Total:</span>
                        <span className={beneficiaries.reduce((sum, b) => sum + b.percentage, 0) === 100 ? 'text-green-600' : 'text-red-600'}>
                          {beneficiaries.reduce((sum, b) => sum + b.percentage, 0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes"
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!distributionType}>
                {isEditing ? 'Update' : 'Create'} Distribution
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 