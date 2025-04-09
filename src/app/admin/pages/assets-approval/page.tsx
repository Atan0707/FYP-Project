'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { format } from 'date-fns';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, 
  // CardContent, 
  // CardDescription, 
  CardHeader, 
  // CardTitle, 
  CardFooter } from '@/components/ui/card';

// Types
import { PendingAsset, AssetStatus } from './types';

// Services
import { fetchPendingAssets, approveOrRejectAsset } from './services';

// Components
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
// import { StatusBadge } from './components/StatusBadge';
import { AssetsOverview } from './components/AssetsOverview';
import { RecentActivityCard } from './components/RecentActivityCard';
import { AssetTypesCard } from './components/AssetTypesCard';
import { AssetsTable } from './components/AssetsTable';
import { ConfirmationDialog } from './components/ConfirmationDialog';

export default function AssetsApprovalPage() {
  const router = useRouter();
  const [selectedAsset, setSelectedAsset] = useState<PendingAsset | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const queryClient = useQueryClient();

  // Queries
  const { 
    data: allPendingAssets = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['adminPendingAssets'],
    queryFn: fetchPendingAssets,
  });

  // Mutations
  const approveRejectMutation = useMutation({
    mutationFn: approveOrRejectAsset,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminPendingAssets'] });
      toast.success(data.message);
      setIsConfirmDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to process asset: ' + (error as Error).message);
    },
  });

  // Filter assets based on status
  const filteredAssets = statusFilter === 'all' 
    ? allPendingAssets 
    : allPendingAssets.filter((asset: PendingAsset) => asset.status === statusFilter);

  // Get recent assets (last 5)
  const recentAssets = [...allPendingAssets]
    .filter((asset: PendingAsset) => asset.status === 'approved' || asset.status === 'rejected')
    .sort((a: PendingAsset, b: PendingAsset) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Get asset types distribution
  const assetTypeDistribution = allPendingAssets.reduce((acc: Record<string, number>, asset: PendingAsset) => {
    const type = asset.type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const handleAction = (asset: PendingAsset, action: 'approve' | 'reject') => {
    setSelectedAsset(asset);
    setActionType(action);
    setIsConfirmDialogOpen(true);
  };

  const confirmAction = () => {
    if (selectedAsset) {
      approveRejectMutation.mutate({
        id: selectedAsset.id,
        action: actionType,
      });
    }
  };

  // Calculate counts for the overview cards
  const pendingCount = allPendingAssets.filter((asset: PendingAsset) => asset.status === 'pending').length;
  const approvedCount = allPendingAssets.filter((asset: PendingAsset) => asset.status === 'approved').length;
  const rejectedCount = allPendingAssets.filter((asset: PendingAsset) => asset.status === 'rejected').length;

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error as Error} />;

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Assets Approval</h1>
        <Button 
          onClick={() => router.push('/admin/pages/pending-assets')}
          className="transition-all hover:shadow-md"
        >
          <Eye className="mr-2 h-4 w-4" />
          View Pending Assets
        </Button>
      </div>

      {/* Overview Cards */}
      <AssetsOverview 
        pendingCount={pendingCount}
        approvedCount={approvedCount}
        rejectedCount={rejectedCount}
        setStatusFilter={setStatusFilter}
      />

      {/* Activity and Types Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 flex flex-col">
          <RecentActivityCard 
            recentAssets={recentAssets} 
          />
        </div>
        <div className="flex flex-col">
          <AssetTypesCard 
            assetTypeDistribution={assetTypeDistribution} 
          />
        </div>
      </div>

      {/* Assets Table */}
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <AssetsTable 
            filteredAssets={filteredAssets}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            handleAction={handleAction}
          />
        </CardHeader>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredAssets.length} of {allPendingAssets.length} assets
          </div>
        </CardFooter>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmationDialog 
        isOpen={isConfirmDialogOpen}
        setIsOpen={setIsConfirmDialogOpen}
        selectedAsset={selectedAsset}
        actionType={actionType}
        confirmAction={confirmAction}
      />
    </div>
  );
}