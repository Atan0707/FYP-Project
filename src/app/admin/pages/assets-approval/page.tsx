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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Download, User, AlertCircle, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface PendingAsset {
  id: string;
  name: string;
  type: string;
  value: number;
  description?: string;
  pdfFile?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

// API functions
const fetchPendingAssets = async () => {
  const response = await fetch('/api/admin/pending-assets');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const approveOrRejectAsset = async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
  const response = await fetch(`/api/admin/pending-assets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export default function AssetsApprovalPage() {
  const [selectedAsset, setSelectedAsset] = useState<PendingAsset | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const queryClient = useQueryClient();

  // Queries
  const { data: allPendingAssets = [], isLoading, error } = useQuery({
    queryKey: ['adminPendingAssets'],
    queryFn: fetchPendingAssets,
  });

  // Filter assets based on status
  const pendingAssets = statusFilter === 'all' 
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64 text-red-500">
          <AlertCircle className="mr-2 h-5 w-5" />
          <span>Error: {(error as Error).message}</span>
        </div>
      </div>
    );
  }

  const pendingCount = allPendingAssets.filter((asset: PendingAsset) => asset.status === 'pending').length;
  const approvedCount = allPendingAssets.filter((asset: PendingAsset) => asset.status === 'approved').length;
  const rejectedCount = allPendingAssets.filter((asset: PendingAsset) => asset.status === 'rejected').length;

  return (
    <div className="container mx-auto py-10">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Assets Approval</CardTitle>
          <CardDescription>
            Review and approve or reject user-submitted assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-secondary/50 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">Pending Assets</div>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </div>
            <div className="bg-secondary/50 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">Approved Assets</div>
              <div className="text-2xl font-bold">{approvedCount}</div>
            </div>
            <div className="bg-secondary/50 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">Rejected Assets</div>
              <div className="text-2xl font-bold">{rejectedCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Asset Activity</CardTitle>
              <CardDescription>
                Latest approved and rejected assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAssets.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No recent approved or rejected assets found.
                  </div>
                ) : (
                  recentAssets.map((asset: PendingAsset) => (
                    <div key={asset.id} className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-secondary/50 p-2 rounded-full">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {asset.user.fullName} • {format(new Date(asset.updatedAt), 'PPp')}
                          </div>
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(asset.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Asset Types</CardTitle>
              <CardDescription>
                Distribution by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(assetTypeDistribution).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span>{type}</span>
                    <Badge variant="outline">{count as number}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Asset Submissions</CardTitle>
              <CardDescription>
                Manage user-submitted assets
              </CardDescription>
            </div>
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'pending' | 'approved' | 'rejected')}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value (RM)</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                      No assets found with the selected filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingAssets.map((asset: PendingAsset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{asset.user.fullName}</div>
                            <div className="text-xs text-muted-foreground">{asset.user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.type}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('en-MY', {
                          style: 'currency',
                          currency: 'MYR',
                        }).format(asset.value)}
                      </TableCell>
                      <TableCell>{asset.description || '-'}</TableCell>
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
                        {getStatusBadge(asset.status)}
                      </TableCell>
                      <TableCell>{format(new Date(asset.createdAt), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">
                        {asset.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleAction(asset, 'approve')}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleAction(asset, 'reject')}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {pendingAssets.length} of {allPendingAssets.length} assets
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Asset' : 'Reject Asset'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Are you sure you want to approve this asset? This will add it to the user\'s assets.'
                : 'Are you sure you want to reject this asset? The user will be notified.'}
            </DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Asset Name:</div>
                <div>{selectedAsset.name}</div>
                <div className="font-medium">Type:</div>
                <div>{selectedAsset.type}</div>
                <div className="font-medium">Value:</div>
                <div>
                  {new Intl.NumberFormat('en-MY', {
                    style: 'currency',
                    currency: 'MYR',
                  }).format(selectedAsset.value)}
                </div>
                <div className="font-medium">User:</div>
                <div>{selectedAsset.user.fullName}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={confirmAction}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}