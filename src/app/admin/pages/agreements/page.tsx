'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { CheckCircle, Users, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Agreement {
  id: string;
  familyId: string;
  status: string;
  signedAt?: string;
  notes?: string;
  distributionId: string;
  createdAt: string;
  updatedAt: string;
  distribution: AssetDistribution;
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
    userId: string;
  };
  agreements: Agreement[];
}

// API functions
const fetchPendingAdminAgreements = async () => {
  const response = await fetch('/api/admin/agreements/pending');
  if (!response.ok) throw new Error('Failed to fetch pending admin agreements');
  return response.json();
};

const fetchAllAgreements = async () => {
  const response = await fetch('/api/admin/agreements');
  if (!response.ok) throw new Error('Failed to fetch all agreements');
  return response.json();
};

const signAdminAgreement = async ({ id, notes }: { id: string; notes?: string }) => {
  const response = await fetch(`/api/admin/agreements/${id}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!response.ok) throw new Error('Failed to sign agreement');
  return response.json();
};

const AdminAgreements = () => {
  const queryClient = useQueryClient();
  const [selectedAgreement, setSelectedAgreement] = React.useState<Agreement | null>(null);
  const [isSignDialogOpen, setIsSignDialogOpen] = React.useState(false);
  const [notes, setNotes] = React.useState('');

  // Queries
  const { data: pendingAgreements = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ['adminPendingAgreements'],
    queryFn: fetchPendingAdminAgreements,
  });

  const { data: allAgreements = [], isLoading: isAllLoading } = useQuery({
    queryKey: ['adminAllAgreements'],
    queryFn: fetchAllAgreements,
  });

  // Mutations
  const signMutation = useMutation({
    mutationFn: signAdminAgreement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPendingAgreements'] });
      queryClient.invalidateQueries({ queryKey: ['adminAllAgreements'] });
      toast.success('Agreement signed successfully');
      setIsSignDialogOpen(false);
      setSelectedAgreement(null);
      setNotes('');
    },
    onError: (error) => {
      toast.error('Failed to sign agreement: ' + (error as Error).message);
    },
  });

  const handleSign = () => {
    if (!selectedAgreement) return;
    signMutation.mutate({
      id: selectedAgreement.id,
      notes: notes || undefined,
    });
  };

  const getSigningProgress = (distribution: AssetDistribution) => {
    if (!distribution || !distribution.agreements) {
      return {
        total: 0,
        signed: 0,
        rejected: 0,
        progress: 0,
      };
    }
    
    const totalAgreements = distribution.agreements.length;
    const signedAgreements = distribution.agreements.filter(a => a.status === 'signed').length;
    const rejectedAgreements = distribution.agreements.filter(a => a.status === 'rejected').length;
    const progress = (signedAgreements / totalAgreements) * 100;

    return {
      total: totalAgreements,
      signed: signedAgreements,
      rejected: rejectedAgreements,
      progress,
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'signed':
        return <Badge variant="success">Signed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending_admin':
        return <Badge variant="default">Pending Admin</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDistributionDetails = (distribution: AssetDistribution) => {
    switch (distribution.type) {
      case 'waqf':
        return (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Organization:</span> {distribution.organization}
          </div>
        );
      case 'hibah':
      case 'will':
        if (distribution.beneficiaries && distribution.beneficiaries.length > 0) {
          return (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Beneficiaries:</span>{' '}
              {distribution.beneficiaries.length} assigned
            </div>
          );
        }
        return null;
      case 'faraid':
        return (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Type:</span> Islamic Inheritance
          </div>
        );
      default:
        return null;
    }
  };

  if (isPendingLoading || isAllLoading) {
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
      <h1 className="text-3xl font-bold mb-6">Agreement Management</h1>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            Pending Admin Review
            {pendingAgreements.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingAgreements.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Agreements</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Admin Review</CardTitle>
              <CardDescription>
                Review and sign agreements that require admin approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingAgreements.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No agreements pending admin review
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAgreements.map((agreement: Agreement) => (
                    <Card key={agreement.id}>
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {agreement.distribution.asset.name}
                            </CardTitle>
                            <CardDescription>
                              {agreement.distribution.asset.type} • RM{' '}
                              {agreement.distribution.asset.value.toFixed(2)}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
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
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm">
                            <div>
                              <span className="font-medium">Distribution Type:</span>{' '}
                              <span className="capitalize">{agreement.distribution.type}</span>
                              {getDistributionDetails(agreement.distribution)}
                            </div>
                            <div className="text-muted-foreground">
                              Created on {format(new Date(agreement.createdAt), 'PPP')}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 cursor-help">
                                      <Users className="h-4 w-4" />
                                      <span className="text-sm">Signing Progress</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="w-64 p-2">
                                    <div className="space-y-2">
                                      <h4 className="text-sm font-semibold">Agreement Status</h4>
                                      <div className="text-sm">
                                        {getSigningProgress(agreement.distribution).signed} of{' '}
                                        {getSigningProgress(agreement.distribution).total} parties have signed
                                      </div>
                                      {getSigningProgress(agreement.distribution).rejected > 0 && (
                                        <div className="text-sm text-destructive flex items-center gap-1">
                                          <AlertCircle className="h-4 w-4" />
                                          {getSigningProgress(agreement.distribution).rejected} rejection(s)
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {getStatusBadge('pending_admin')}
                            </div>
                            <Progress 
                              value={getSigningProgress(agreement.distribution).progress} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Agreements</CardTitle>
              <CardDescription>
                View all agreements in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allAgreements.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No agreements found
                </div>
              ) : (
                <div className="space-y-4">
                  {allAgreements.map((agreement: Agreement) => (
                    <Card key={agreement.id}>
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {agreement.distribution.asset.name}
                            </CardTitle>
                            <CardDescription>
                              {agreement.distribution.asset.type} • RM{' '}
                              {agreement.distribution.asset.value.toFixed(2)}
                            </CardDescription>
                          </div>
                          {getStatusBadge(agreement.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <div>
                              <span className="font-medium">Distribution Type:</span>{' '}
                              <span className="capitalize">{agreement.distribution.type}</span>
                              {getDistributionDetails(agreement.distribution)}
                            </div>
                            <div className="text-muted-foreground">
                              {agreement.signedAt
                                ? `Signed on ${format(new Date(agreement.signedAt), 'PPP')}`
                                : `Created on ${format(new Date(agreement.createdAt), 'PPP')}`}
                            </div>
                          </div>
                          {agreement.notes && (
                            <div className="text-sm">
                              <span className="font-medium">Notes:</span> {agreement.notes}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Agreement as Admin</DialogTitle>
            <DialogDescription>
              Please review the agreement details carefully before signing. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about signing this agreement"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} className="bg-green-600 hover:bg-green-700">
              Sign Agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAgreements;