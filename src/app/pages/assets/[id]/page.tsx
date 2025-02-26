'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Asset {
  id: string;
  name: string;
  type: string;
  value: number;
  description?: string;
  pdfFile?: string;
  createdAt: string;
  distribution?: {
    id: string;
    type: string;
    status: string;
  } | null;
}

const distributionTypes = [
  { value: 'waqf', label: 'Waqf' },
  { value: 'faraid', label: 'Faraid' },
  { value: 'hibah', label: 'Hibah' },
  { value: 'will', label: 'Will' },
];

export default function AssetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('');

  // Fetch asset details
  const { data: asset, isLoading } = useQuery<Asset>({
    queryKey: ['asset', params.id],
    queryFn: async () => {
      const response = await fetch(`/api/asset/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch asset');
      return response.json();
    },
  });

  // Create distribution mutation
  const createDistribution = useMutation({
    mutationFn: async (type: string) => {
      const response = await fetch('/api/asset-distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: params.id,
          type: type,
        }),
      });
      if (!response.ok) throw new Error('Failed to create distribution');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', params.id] });
      toast.success('Distribution type set successfully');
    },
    onError: (error) => {
      toast.error('Failed to set distribution type: ' + error.message);
    },
  });

  const handleDistributionSelect = (type: string) => {
    setSelectedType(type);
    createDistribution.mutate(type);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Asset not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assets
        </Button>
        <h1 className="text-2xl font-bold">Asset Details</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{asset.name}</CardTitle>
            <CardDescription>Asset Information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Type</div>
                <div className="font-medium">{asset.type}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Value</div>
                <div className="font-medium">
                  {new Intl.NumberFormat('en-MY', {
                    style: 'currency',
                    currency: 'MYR',
                  }).format(asset.value)}
                </div>
              </div>
              {asset.description && (
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="font-medium">{asset.description}</div>
                </div>
              )}
              {asset.pdfFile && (
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Document</div>
                  <a
                    href={asset.pdfFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    View Document
                  </a>
                </div>
              )}
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground">Created On</div>
                <div className="font-medium">{format(new Date(asset.createdAt), 'PPP')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution Method</CardTitle>
            <CardDescription>
              Select how you want to distribute this asset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-grow">
                  <Select
                    value={asset.distribution?.type || selectedType}
                    onValueChange={handleDistributionSelect}
                    disabled={!!asset.distribution}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select distribution type" />
                    </SelectTrigger>
                    <SelectContent>
                      {distributionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {asset.distribution && (
                  <Badge variant="outline">
                    Status: {asset.distribution.status}
                  </Badge>
                )}
              </div>
              {asset.distribution && (
                <div className="text-sm text-muted-foreground">
                  Distribution type cannot be changed once set. Please contact admin for any changes.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 