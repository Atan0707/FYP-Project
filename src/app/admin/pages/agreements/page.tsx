'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Loader2, 
  Clock, 
  Filter, 
  Eye,
  XCircle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import Link from 'next/link';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { contractService } from '@/services/contractService';
import { sendAgreementCompletionEmails } from '@/services/agreementEmailService';

interface Agreement {
  id: string;
  familyId: string;
  status: string;
  signedAt?: string;
  notes?: string;
  adminSignedAt?: string;
  distributionId: string;
  createdAt: string;
  updatedAt: string;
  distribution: AssetDistribution;
  family?: {
    id: string;
    name: string;
  };
}

interface AssetDistribution {
  id: string;
  type: string;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  beneficiaries?: Array<{
    familyId: string;
    percentage: number;
    family?: {
      id: string;
      name: string;
    };
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
  const response = await fetch('/api/admin/agreements/pending?includeFamilyInfo=true');
  if (!response.ok) throw new Error('Failed to fetch pending admin agreements');
  return response.json();
};

const fetchAllAgreements = async () => {
  const response = await fetch('/api/admin/agreements?includeFamilyInfo=true');
  if (!response.ok) throw new Error('Failed to fetch all agreements');
  return response.json();
};

const signAdminAgreement = async ({ distributionId, notes, agreementId }: { distributionId: string; notes?: string; agreementId: string }) => {
  try {
    // Check if contract service is initialized
    if (!contractService) {
      throw new Error('Blockchain service is not initialized. Please check your environment configuration.');
    }

    // First, get the tokenId from the agreementId using the contract service
    console.log('Agreement ID:', agreementId);
    const tokenIdResponse = await contractService.getTokenIdFromAgreementId(agreementId);
    console.log('Token ID Response:', tokenIdResponse);
    
    if (!tokenIdResponse.success || !tokenIdResponse.tokenId) {
      throw new Error(tokenIdResponse.error || 'Failed to get token ID from agreement ID');
    }

    // Get admin info from API first to get the admin username
    const adminResponse = await fetch('/api/admin/profile');
    if (!adminResponse.ok) {
      throw new Error('Admin not authenticated or session expired. Please log in again.');
    }
    const adminData = await adminResponse.json();
    const adminName = adminData.username;

    // Now sign on the smart contract using the tokenId
    const contractResponse = await contractService.adminSignAgreement(
      tokenIdResponse.tokenId,
      adminName, // Using the admin name from API
      notes
    );

    if (!contractResponse.success) {
      throw new Error(contractResponse.error || 'Failed to sign on blockchain');
    }

    // If contract signing is successful, proceed with API call
    const response = await fetch(`/api/admin/agreements/distribution/${distributionId}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });

    if (!response.ok) throw new Error('Failed to sign agreement');
    
    // Get the updated agreement data
    const agreementData = await response.json();
    
    // After successful signing, send email notifications to all participants using the email service
    try {
      const emailResult = await sendAgreementCompletionEmails(agreementId);
      if (emailResult.success) {
        toast.success(`Successfully sent email notifications to all ${emailResult.emailsSent} participants.`);
      } else {
        toast.warning('Agreement signed successfully, but there was an issue sending email notifications.');
      }
    } catch (emailError) {
      console.error('Failed to send agreement completion emails:', emailError);
      toast.error('Agreement signed successfully, but failed to send email notifications.');
    }
    
    return agreementData;
  } catch (error) {
    console.error('Error in signAdminAgreement:', error);
    throw error;
  }
};

const AdminAgreements = () => {
  const queryClient = useQueryClient();
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_admin' | 'signed' | 'rejected' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // useEffect(() => {
  //   const data  = fetchAllAgreements();
  //   console.log("All agreements", data)
  //   const data2 = fetchPendingAdminAgreements();
  //   console.log("Pending admin agreements", data2)
  // })

  // Queries
  const { data: pendingAgreements = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ['adminPendingAgreements'],
    queryFn: fetchPendingAdminAgreements,
  });

  const { data: allAgreementsData = [], isLoading: isAllAgreementsLoading } = useQuery({
    queryKey: ['adminAllAgreements'],
    queryFn: fetchAllAgreements,
  });

  // Combine both data sources
  const allAgreements = useMemo(() => {
    // Create a map of existing agreements by asset ID to prevent duplicates
    const agreementMap = new Map();
    
    // Process all agreements data first
    allAgreementsData.forEach((agreement: Agreement) => {
      const assetId = agreement.distribution.asset.id;
      if (!agreementMap.has(assetId) || 
          (agreement.status === 'completed' && agreementMap.get(assetId).status !== 'completed')) {
        agreementMap.set(assetId, agreement);
      }
    });
    
    // Add pending agreements only if they don't exist for that asset
    pendingAgreements.forEach((agreement: Agreement) => {
      const assetId = agreement.distribution.asset.id;
      if (!agreementMap.has(assetId)) {
        agreementMap.set(assetId, agreement);
      }
    });
    
    return Array.from(agreementMap.values());
  }, [allAgreementsData, pendingAgreements]);

  // Filter agreements based on status and search term
  const filteredAgreements = useMemo(() => {
    let filtered = statusFilter === 'all' 
      ? allAgreements 
      : allAgreements.filter((agreement: Agreement) => agreement.status === statusFilter);
    
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((agreement: Agreement) => 
        agreement.distribution.asset.name.toLowerCase().includes(term) ||
        agreement.distribution.type.toLowerCase().includes(term) ||
        (agreement.distribution.organization && 
         agreement.distribution.organization.toLowerCase().includes(term))
      );
    }
    
    return filtered;
  }, [allAgreements, statusFilter, searchTerm]);

  // Get recent agreements (last 5)
  const recentAgreements = [...allAgreements]
    .filter((agreement: Agreement) => agreement.status === 'signed' || agreement.status === 'rejected')
    .sort((a: Agreement, b: Agreement) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Get distribution types
  const distributionTypes = allAgreements.reduce((acc: Record<string, number>, agreement: Agreement) => {
    const type = agreement.distribution.type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Mutations
  const signMutation = useMutation({
    mutationFn: signAdminAgreement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPendingAgreements'] });
      queryClient.invalidateQueries({ queryKey: ['adminAllAgreements'] });
      toast.success('Agreement signed successfully on blockchain and database');
      setIsSignDialogOpen(false);
      setSelectedAgreement(null);
      setNotes('');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Admin account not found')) {
        toast.error('Admin account not found. Please log in again.', {
          duration: 5000,
          action: {
            label: 'Login',
            onClick: () => window.location.href = '/admin/login',
          },
        });
      } else {
        toast.error('Failed to sign agreement: ' + errorMessage);
      }
    },
  });

  // Reset state when dialogs close
  useEffect(() => {
    if (!isSignDialogOpen) {
      setIsConfirmed(false);
      setNotes('');
    }
  }, [isSignDialogOpen]);

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
    const signedAgreements = distribution.agreements.filter(a => 
      a.status === 'signed' || 
      a.status === 'pending_admin' || 
      a.status === 'completed'
    ).length;
    const rejectedAgreements = distribution.agreements.filter(a => a.status === 'rejected').length;
    const progress = (signedAgreements / totalAgreements) * 100;

    return {
      total: totalAgreements,
      signed: signedAgreements,
      rejected: rejectedAgreements,
      progress,
    };
  };

  useEffect(() => {
    console.log("Selected agreement", selectedAgreement)
  }, [selectedAgreement])

  const getStatusBadge = (status: string, context: 'signature' | 'agreement' = 'agreement') => {
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
      case 'pending_admin':
        // For signatures in pending_admin agreements, show them as signed
        if (context === 'signature') {
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
                  <p>This signature has been completed and is waiting for admin approval</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        // For the agreement itself, show pending admin
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="default" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>Pending Admin</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>This agreement is waiting for admin approval</p>
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

  if (isPendingLoading || isAllAgreementsLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const pendingAdminCount = allAgreements.filter((agreement: Agreement) => agreement.status === 'pending_admin').length;
  const signedCount = allAgreements.filter((agreement: Agreement) => agreement.status === 'signed').length;

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agreements Management</h1>
        <Link href="/admin/pages/agreements/all">
          <Button variant="outline" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View All Agreements
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Agreements Overview</CardTitle>
          <CardDescription>
            Summary of all agreement submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-secondary/50 p-4 rounded-lg hover:bg-secondary/70 transition-colors cursor-pointer" 
                 onClick={() => setStatusFilter('pending_admin')}>
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                <AlertCircle className="mr-2 h-4 w-4" />
                Pending Admin Review
              </div>
              <div className="text-2xl font-bold">{pendingAdminCount}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg hover:bg-green-100 transition-colors cursor-pointer" 
                 onClick={() => setStatusFilter('signed')}>
              <div className="text-sm font-medium text-green-700 mb-1 flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                Signed Agreements
              </div>
              <div className="text-2xl font-bold text-green-800">{signedCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Agreement Activity</CardTitle>
              <CardDescription>
                Latest signed and rejected agreements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAgreements.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No recent signed or rejected agreements found.
                  </div>
                ) : (
                  recentAgreements.map((agreement: Agreement) => (
                    <div key={agreement.id} className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          agreement.status === 'signed' ? 'bg-green-100' : 
                          agreement.status === 'rejected' ? 'bg-red-100' : 'bg-secondary/50'
                        }`}>
                          {agreement.status === 'signed' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : agreement.status === 'rejected' ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{agreement.distribution.asset.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Distribution Type: <span className="capitalize">{agreement.distribution.type}</span> • {format(new Date(agreement.updatedAt), 'PPp')}
                          </div>
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(agreement.status)}
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
              <CardTitle>Distribution Types</CardTitle>
              <CardDescription>
                Distribution by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(distributionTypes).length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No distribution types found.
                  </div>
                ) : (
                  Object.entries(distributionTypes).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center p-2 rounded-md hover:bg-secondary/30">
                      <span className="font-medium capitalize">{type}</span>
                      <Badge variant="outline">{count as number}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>All Agreements</CardTitle>
              <CardDescription>
                View and manage all agreements
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-64">
                <Input
                  placeholder="Search agreements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'pending_admin' | 'signed' | 'rejected' | 'completed')}>
                <TabsList>
                  <TabsTrigger value="all" className="flex items-center gap-1">
                    <Filter className="h-4 w-4" />
                    All
                  </TabsTrigger>
                  <TabsTrigger value="pending_admin" className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Pending Admin
                  </TabsTrigger>
                  <TabsTrigger value="signed" className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Signed
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    Rejected
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Completed
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Distribution Type</TableHead>
                  <TableHead>Value (RM)</TableHead>
                  <TableHead>Beneficiaries</TableHead>
                  <TableHead>Signing Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgreements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      No agreements found with the selected filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAgreements.map((agreement: Agreement) => (
                    <TableRow key={agreement.id} className={
                      agreement.status === 'signed' ? 'bg-green-50' : 
                      agreement.status === 'rejected' ? 'bg-red-50' : ''
                    }>
                      <TableCell>
                        <div>
                          <div className="font-medium">{agreement.distribution.asset.name}</div>
                          <div className="text-xs text-muted-foreground">{agreement.distribution.asset.type}</div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{agreement.distribution.type}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('en-MY', {
                          style: 'currency',
                          currency: 'MYR',
                        }).format(agreement.distribution.asset.value)}
                      </TableCell>
                      <TableCell>
                        {getDistributionDetails(agreement.distribution)}
                      </TableCell>
                      <TableCell>
                        <div className="w-full space-y-1">
                          <div className="text-xs">
                            {getSigningProgress(agreement.distribution).signed} of {getSigningProgress(agreement.distribution).total} signed
                          </div>
                          <Progress 
                            value={getSigningProgress(agreement.distribution).progress} 
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(agreement.status)}
                      </TableCell>
                      <TableCell>{format(new Date(agreement.createdAt), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">
                        {agreement.status === 'pending_admin' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 mr-2"
                              onClick={() => {
                                setSelectedAgreement(agreement);
                                setIsSignDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Sign Agreement
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary/80"
                          onClick={() => {
                            setSelectedAgreement(agreement);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
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
            Showing {filteredAgreements.length} of {allAgreements.length} agreements
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Agreement</DialogTitle>
            <DialogDescription>
              This will sign the agreement for this asset distribution. All users who have signed will be notified that the agreement has been completed.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAgreement && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Distribution Information</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="font-medium">Asset:</span> {selectedAgreement.distribution.asset.name}</div>
                  <div><span className="font-medium">Type:</span> <span className="capitalize">{selectedAgreement.distribution.type}</span></div>
                  <div><span className="font-medium">Value:</span> RM {selectedAgreement.distribution.asset.value.toFixed(2)}</div>
                  <div><span className="font-medium">Signatures:</span> {selectedAgreement.distribution.agreements.length} total</div>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
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
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="confirm" 
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
              />
              <label
                htmlFor="confirm"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I confirm that I want to sign this agreement
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignDialogOpen(false)} disabled={signMutation.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={() => signMutation.mutate({
                distributionId: selectedAgreement?.distributionId || '',
                notes: notes || undefined,
                agreementId: selectedAgreement?.id || '',
              })} 
              className="bg-green-600 hover:bg-green-700"
              disabled={signMutation.isPending || !isConfirmed}
            >
              {signMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : (
                'Sign Agreement'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto pr-8">
          <DialogHeader className="top-0 z-10 bg-background pb-4 border-b">
            <DialogTitle>Agreement Details</DialogTitle>
            <DialogDescription>
              Detailed information about this agreement and its distribution
            </DialogDescription>
          </DialogHeader>
          
          {selectedAgreement && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Asset Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Name:</span>
                      <span>{selectedAgreement.distribution.asset.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Type:</span>
                      <span className="capitalize">{selectedAgreement.distribution.asset.type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Value:</span>
                      <span>{new Intl.NumberFormat('en-MY', {
                        style: 'currency',
                        currency: 'MYR',
                      }).format(selectedAgreement.distribution.asset.value)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Distribution Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Type:</span>
                      <span className="capitalize">{selectedAgreement.distribution.type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Status:</span>
                      <span>{getStatusBadge(selectedAgreement.distribution.status)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Created:</span>
                      <span>{format(new Date(selectedAgreement.distribution.createdAt), 'PPp')}</span>
                    </div>
                    {selectedAgreement.distribution.notes && (
                      <div className="text-sm">
                        <span className="font-medium">Notes:</span>
                        <p className="mt-1 text-muted-foreground">{selectedAgreement.distribution.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Agreements</CardTitle>
                  <CardDescription className="text-xs">All agreements for this distribution</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-[200px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead>Participant</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Signed At</TableHead>
                            <TableHead>Admin Signed At</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedAgreement.distribution.agreements.map((agreement) => (
                            <TableRow key={agreement.id}>
                              <TableCell className="text-sm">{agreement.family?.name || agreement.familyId}</TableCell>
                              <TableCell className="text-sm">{getStatusBadge(agreement.status, 'signature')}</TableCell>
                              <TableCell className="text-sm">
                                {agreement.signedAt 
                                  ? format(new Date(agreement.signedAt), 'dd/MM/yyyy HH:mm') 
                                  : '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {agreement.adminSignedAt 
                                  ? format(new Date(agreement.adminSignedAt), 'dd/MM/yyyy HH:mm') 
                                  : '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {agreement.notes || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedAgreement.distribution.type === 'hibah' || 
               selectedAgreement.distribution.type === 'will' || 
               selectedAgreement.distribution.type === 'faraid' ? (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Beneficiaries</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {selectedAgreement.distribution.beneficiaries && 
                     selectedAgreement.distribution.beneficiaries.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-[200px] overflow-y-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-background">
                              <TableRow>
                                <TableHead>Participant</TableHead>
                                <TableHead>Percentage</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedAgreement.distribution.beneficiaries.map((beneficiary, index) => (
                                <TableRow key={index}>
                                  <TableCell className="text-sm">{beneficiary.family?.name || beneficiary.familyId}</TableCell>
                                  <TableCell className="text-sm">{beneficiary.percentage}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No beneficiaries found.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : selectedAgreement.distribution.type === 'waqf' && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Organization</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="p-3 border rounded-lg text-sm">
                      {selectedAgreement.distribution.organization || 'No organization specified'}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter className="bottom-0 z-10 bg-background pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAgreements;