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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle, Users, AlertCircle, Clock, XCircle, Loader2 } from 'lucide-react';
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

  const getDistributionStatus = (distribution: AssetDistribution) => {
    if (!distribution || !distribution.agreements) return 'pending';
    
    const { total, signed, rejected } = getSigningProgress(distribution);
    
    if (rejected > 0) return 'rejected';
    if (signed === total) return 'completed';
    if (signed > 0) return 'in_progress';
    return 'pending';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Pending</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>This agreement is waiting for signatures</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'signed':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Signed</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>This agreement has been signed</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'rejected':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  <span>Rejected</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>This agreement has been rejected</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'in_progress':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="default" className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>In Progress</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>This agreement is in progress</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'completed':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Completed</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>This agreement has been completed</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDistributionDetails = (distribution: AssetDistribution) => {
    switch (distribution.type) {
      case 'waqf':
        return distribution.organization;
      case 'hibah':
      case 'will':
        if (distribution.beneficiaries && distribution.beneficiaries.length > 0) {
          return `${distribution.beneficiaries.length} beneficiaries`;
        }
        return null;
      case 'faraid':
        return 'Islamic Inheritance';
      default:
        return null;
    }
  };

  const getAgreementRole = (agreement: Agreement) => {
    const isOwner = agreement.distribution.asset.userId === agreement.familyId;
    return (
      <Badge variant={isOwner ? "default" : "outline"} className="ml-2">
        {isOwner ? "Owner" : "Beneficiary"}
      </Badge>
    );
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

  const pendingCount = pendingAgreements.length;
  const signedCount = myAgreements.filter((agreement: Agreement) => agreement.status === 'signed').length;
  const rejectedCount = myAgreements.filter((agreement: Agreement) => agreement.status === 'rejected').length;

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agreements</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Agreements Overview</CardTitle>
          <CardDescription>
            Summary of your agreements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-secondary/50 p-4 rounded-lg hover:bg-secondary/70 transition-colors cursor-pointer">
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Pending Agreements
              </div>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
              <div className="text-sm font-medium text-green-700 mb-1 flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                Signed Agreements
              </div>
              <div className="text-2xl font-bold text-green-800">{signedCount}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
              <div className="text-sm font-medium text-red-700 mb-1 flex items-center">
                <XCircle className="mr-2 h-4 w-4" />
                Rejected Agreements
              </div>
              <div className="text-2xl font-bold text-red-800">{rejectedCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Agreements Section */}
      {pendingAgreements.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pending Agreements</CardTitle>
            <CardDescription>
              Review and sign agreements for asset distributions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingAgreements.map((agreement: Agreement) => (
                <Card key={agreement.id}>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          {agreement.distribution.asset.name}
                          {getAgreementRole(agreement)}
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
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
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
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => {
                            setSelectedAgreement(agreement);
                            setIsRejectDialogOpen(true);
                          }}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
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
                          {getDistributionDetails(agreement.distribution) && (
                            <span className="ml-2 text-muted-foreground">
                              ({getDistributionDetails(agreement.distribution)})
                            </span>
                          )}
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
                                    {getSigningProgress(agreement.distribution).total} family members have signed
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
                          {getStatusBadge(getDistributionStatus(agreement.distribution))}
                        </div>
                        <div className="relative">
                          <Progress 
                            value={getSigningProgress(agreement.distribution).progress} 
                            className="h-2"
                          />
                          {getSigningProgress(agreement.distribution).rejected > 0 && (
                            <div className="absolute top-0 right-0 h-2 bg-destructive/20" 
                              style={{ 
                                width: `${(getSigningProgress(agreement.distribution).rejected / getSigningProgress(agreement.distribution).total) * 100}%` 
                              }} 
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Agreements Section */}
      <Card>
        <CardHeader>
          <CardTitle>My Agreements</CardTitle>
          <CardDescription>
            View all your agreements and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myAgreements.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No agreements found
            </div>
          ) : (
            <div className="space-y-4">
              {myAgreements.map((agreement: Agreement) => (
                <Card key={agreement.id}>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          {agreement.distribution.asset.name}
                          {getAgreementRole(agreement)}
                        </CardTitle>
                        <CardDescription>
                          {agreement.distribution.asset.type} • RM{' '}
                          {agreement.distribution.asset.value.toFixed(2)}
                        </CardDescription>
                      </div>
                      <div>
                        {getStatusBadge(agreement.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <div>
                          <span className="font-medium">Distribution Type:</span>{' '}
                          <span className="capitalize">{agreement.distribution.type}</span>
                          {getDistributionDetails(agreement.distribution) && (
                            <span className="ml-2 text-muted-foreground">
                              ({getDistributionDetails(agreement.distribution)})
                            </span>
                          )}
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
                      
                      <div className="space-y-2 mt-3">
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
                                    {getSigningProgress(agreement.distribution).total} family members have signed
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
                          {getStatusBadge(getDistributionStatus(agreement.distribution))}
                        </div>
                        <div className="relative">
                          <Progress 
                            value={getSigningProgress(agreement.distribution).progress} 
                            className="h-2"
                          />
                          {getSigningProgress(agreement.distribution).rejected > 0 && (
                            <div className="absolute top-0 right-0 h-2 bg-destructive/20" 
                              style={{ 
                                width: `${(getSigningProgress(agreement.distribution).rejected / getSigningProgress(agreement.distribution).total) * 100}%` 
                              }} 
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Agreement</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign this agreement? This action cannot be undone.
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

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Agreement</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this agreement. This action cannot be undone.
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
            <Button onClick={handleReject} variant="destructive">
              Reject Agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}