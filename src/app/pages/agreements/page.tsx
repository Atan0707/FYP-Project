'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react';

interface Agreement {
  id: string;
  familyId: string;
  status: string;
  signedAt?: string;
  notes?: string;
  distributionId: string;
  createdAt: string;
  updatedAt: string;
}

interface AssetDistribution {
  id: string;
  type: string;
  notes?: string;
  status: string;
  beneficiaries?: Array<{
    familyId: string;
    percentage: number;
  }>;
  organization?: string;
  asset: {
    id: string;
    name: string;
    type: string;
    value: number;
  };
  agreements: Agreement[];
}

// API functions
const fetchPendingAgreements = async () => {
  const response = await fetch('/api/agreements/pending');
  if (!response.ok) throw new Error('Failed to fetch pending agreements');
  return response.json();
};

const fetchMyAgreements = async () => {
  const response = await fetch('/api/agreements');
  if (!response.ok) throw new Error('Failed to fetch my agreements');
  return response.json();
};

const signAgreement = async ({ id, notes }: { id: string; notes?: string }) => {
  const response = await fetch(`/api/agreements/${id}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!response.ok) throw new Error('Failed to sign agreement');
  return response.json();
};

const rejectAgreement = async ({ id, notes }: { id: string; notes?: string }) => {
  const response = await fetch(`/api/agreements/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!response.ok) throw new Error('Failed to reject agreement');
  return response.json();
};

export default function AgreementsPage() {
  const queryClient = useQueryClient();
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');

  // Queries
  const { data: pendingAgreements = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ['pendingAgreements'],
    queryFn: fetchPendingAgreements,
  });

  const { data: myAgreements = [], isLoading: isMyLoading } = useQuery({
    queryKey: ['myAgreements'],
    queryFn: fetchMyAgreements,
  });

  // Mutations
  const signMutation = useMutation({
    mutationFn: signAgreement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingAgreements'] });
      queryClient.invalidateQueries({ queryKey: ['myAgreements'] });
      toast.success('Agreement signed successfully');
      setIsSignDialogOpen(false);
      setSelectedAgreement(null);
      setNotes('');
    },
    onError: (error) => {
      toast.error('Failed to sign agreement: ' + (error as Error).message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectAgreement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingAgreements'] });
      queryClient.invalidateQueries({ queryKey: ['myAgreements'] });
      toast.success('Agreement rejected');
      setIsRejectDialogOpen(false);
      setSelectedAgreement(null);
      setNotes('');
    },
    onError: (error) => {
      toast.error('Failed to reject agreement: ' + (error as Error).message);
    },
  });

  const handleSign = () => {
    if (!selectedAgreement) return;
    signMutation.mutate({
      id: selectedAgreement.id,
      notes: notes || undefined,
    });
  };

  const handleReject = () => {
    if (!selectedAgreement) return;
    rejectMutation.mutate({
      id: selectedAgreement.id,
      notes: notes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'signed':
        return <Badge variant="success">Signed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isPendingLoading || isMyLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Agreements</h1>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">Pending Agreements</TabsTrigger>
          <TabsTrigger value="my">My Agreements</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Agreements</CardTitle>
              <CardDescription>
                Review and sign agreements for asset distributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingAgreements.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No pending agreements found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Distribution Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAgreements.map((agreement: Agreement & { distribution: AssetDistribution }) => (
                      <TableRow key={agreement.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {agreement.distribution.asset.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {agreement.distribution.asset.type} • RM{' '}
                              {agreement.distribution.asset.value.toFixed(2)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {agreement.distribution.type}
                        </TableCell>
                        <TableCell>{getStatusBadge(agreement.status)}</TableCell>
                        <TableCell>
                          {format(new Date(agreement.createdAt), 'PPP')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => {
                                setSelectedAgreement(agreement);
                                setIsSignDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Sign
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedAgreement(agreement);
                                setIsRejectDialogOpen(true);
                              }}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my">
          <Card>
            <CardHeader>
              <CardTitle>My Agreements</CardTitle>
              <CardDescription>
                View all your agreements and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myAgreements.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No agreements found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Distribution Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Signed On</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myAgreements.map((agreement: Agreement & { distribution: AssetDistribution }) => (
                      <TableRow key={agreement.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {agreement.distribution.asset.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {agreement.distribution.asset.type} • RM{' '}
                              {agreement.distribution.asset.value.toFixed(2)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {agreement.distribution.type}
                        </TableCell>
                        <TableCell>{getStatusBadge(agreement.status)}</TableCell>
                        <TableCell>
                          {agreement.signedAt
                            ? format(new Date(agreement.signedAt), 'PPP')
                            : '-'}
                        </TableCell>
                        <TableCell>{agreement.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Agreement</DialogTitle>
            <DialogDescription>
              Please review the agreement details before signing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Additional Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or comments about your signature"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={signMutation.isPending}>
              {signMutation.isPending ? 'Signing...' : 'Sign Agreement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Agreement</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this agreement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for Rejection</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain why you are rejecting this agreement"
                className="mt-1"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !notes}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Agreement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}