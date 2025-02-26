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
import { toast } from 'sonner';
import { CheckCircle, XCircle, Download, User, AlertCircle, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
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

export default function PendingAssetsPage() {
  const router = useRouter();
  const [selectedAsset, setSelectedAsset] = useState<PendingAsset | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const queryClient = useQueryClient();

  // Queries
  const { data: allAssets = [], isLoading, error } = useQuery({
    queryKey: ['adminPendingAssets'],
    queryFn: fetchPendingAssets,
  });

  // Filter only pending assets
  const pendingAssets = allAssets.filter((asset: PendingAsset) => asset.status === 'pending');

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

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.push('/admin/pages/assets-approval')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assets Approval
        </Button>
        <h1 className="text-2xl font-bold">Pending Assets</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Asset Submissions</CardTitle>
          <CardDescription>
            Review and approve or reject pending asset submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingAssets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No pending assets found. All assets have been processed.
            </div>
          ) : (
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
                    <TableHead>Submitted On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAssets.map((asset: PendingAsset) => (
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
                      <TableCell>{format(new Date(asset.createdAt), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {pendingAssets.length} pending assets
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