'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationBell } from '@/components/NotificationBell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  ArrowUpDown, 
  Calendar, 
  Download, 
  Filter, 
  Search 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { contractService } from '@/services/contractService';


interface Agreement {
  id: string;
  familyId: string;
  status: string;
  signedAt?: string;
  notes?: string;
  signedById?: string;
  transactionHash?: string;
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
  const { addNotification } = useNotifications();
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [signerIC, setSignerIC] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerificationStep, setIsVerificationStep] = useState(false);
  const [isVerificationCodeSent, setIsVerificationCodeSent] = useState(false);
  const [verificationTimer, setVerificationTimer] = useState(0);

  useEffect(() => {
    console.log("Selected Agreement", selectedAgreement);
  }, [selectedAgreement]);

  // Queries
  const { data: pendingAgreements = [], isLoading: isPendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['pendingAgreements'],
    queryFn: fetchPendingAgreements,
  });

  const { data: myAgreements = [], isLoading: isMyLoading, refetch: refetchMyAgreements } = useQuery({
    queryKey: ['myAgreements'],
    queryFn: fetchMyAgreements,
  });

  // Timer effect for verification countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (verificationTimer > 0) {
      interval = setInterval(() => {
        setVerificationTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [verificationTimer]);

  // Mutations
  const generateVerificationMutation = useMutation({
    mutationFn: async (agreementId: string) => {
      const response = await fetch('/api/agreement-verification/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate verification code');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsVerificationCodeSent(true);
      setVerificationTimer(600); // 10 minutes countdown
      toast.success('Verification code sent to your email');
    },
    onError: (error) => {
      toast.error('Failed to send verification code: ' + (error as Error).message);
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async ({ agreementId, verificationCode }: { agreementId: string; verificationCode: string }) => {
      const response = await fetch('/api/agreement-verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId, verificationCode }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify code');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsVerificationStep(false);
      toast.success('Verification successful! Proceeding with signing...');
      // Proceed with the actual signing
      if (selectedAgreement) {
        signMutation.mutate({
          agreementId: selectedAgreement.id,
          signerIC,
        });
      }
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const signMutation = useMutation({
    mutationFn: async ({ agreementId, signerIC }: { agreementId: string; signerIC: string }) => {
      if (!contractService) {
        throw new Error('Contract service not initialized');
      }
      console.log('Signing agreement with ID:', agreementId);
      console.log('Signer IC:', signerIC);

      // First get the tokenId from the agreementId
      const tokenResult = await contractService.getTokenIdFromAgreementId(agreementId);
      console.log('Token result:', tokenResult);
      if (!tokenResult.success || !tokenResult.tokenId) {
        throw new Error(tokenResult.error || 'Failed to get token ID');
      }

      // Then sign the agreement with the tokenId
      const result = await contractService.signAgreement(tokenResult.tokenId, signerIC);
      if (!result.success) {
        throw new Error(result.error || 'Failed to sign agreement');
      }

              // After successful blockchain signing, update the database with transaction hash
        const dbUpdateResponse = await fetch(`/api/agreements/${agreementId}/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transactionHash: result.transactionHash 
          }),
        });

      if (!dbUpdateResponse.ok) {
        throw new Error('Failed to update database after signing');
      }

      return result;
    },
    onSuccess: async () => {
      // Refetch both queries to update the UI
      await Promise.all([
        refetchPending(),
        refetchMyAgreements()
      ]);
      
      queryClient.invalidateQueries({ queryKey: ['pendingAgreements'] });
      queryClient.invalidateQueries({ queryKey: ['myAgreements'] });
      
      const message = `Agreement for ${selectedAgreement?.distribution.asset.name} signed successfully`;
      toast.success(message);
      addNotification(message, 'success');
      
      setIsSignDialogOpen(false);
      setSelectedAgreement(null);
      setSignerIC('');
    },
    onError: (error) => {
      const message = 'Failed to sign agreement: ' + (error as Error).message;
      toast.error(message);
      addNotification(message, 'error');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectAgreement,
    onSuccess: async () => {
      // Force refetch both queries to ensure data is up-to-date
      await Promise.all([
        refetchPending(),
        refetchMyAgreements()
      ]);
      
      queryClient.invalidateQueries({ queryKey: ['pendingAgreements'] });
      queryClient.invalidateQueries({ queryKey: ['myAgreements'] });
      
      const message = `Agreement for ${selectedAgreement?.distribution.asset.name} rejected`;
      toast.success(message);
      addNotification(message, 'warning');
      
      setIsRejectDialogOpen(false);
      setSelectedAgreement(null);
      setNotes('');
    },
    onError: (error) => {
      const message = 'Failed to reject agreement: ' + (error as Error).message;
      toast.error(message);
      addNotification(message, 'error');
    },
  });

  const handleSign = () => {
    if (!selectedAgreement) return;
    
    if (!signerIC) {
      toast.error('Please enter your IC number');
      return;
    }

    // First step: Generate verification code
    if (!isVerificationStep) {
      generateVerificationMutation.mutate(selectedAgreement.id);
      setIsVerificationStep(true);
      return;
    }

    // Second step: Verify the code
    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    verifyCodeMutation.mutate({
      agreementId: selectedAgreement.id,
      verificationCode,
    });
  };

  const handleResendVerificationCode = () => {
    if (!selectedAgreement) return;
    generateVerificationMutation.mutate(selectedAgreement.id);
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

  // This function is used in the UI, even if the linter doesn't detect it
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getDistributionStatus = (distribution: AssetDistribution) => {
    if (!distribution || !distribution.agreements) return 'pending';
    
    const { total, signed, rejected } = getSigningProgress(distribution);
    
    if (rejected > 0) return 'rejected';
    if (signed === total) return 'completed';
    if (signed > 0) return 'in_progress';
    return 'pending';
  };

  const getStatusBadge = (status: string, transactionHash?: string) => {
    const BadgeComponent = ({ children, variant, className }: { 
      children: React.ReactNode; 
      variant?: "success" | "default" | "secondary" | "destructive" | "outline" | null; 
      className?: string 
    }) => {
      if (transactionHash && (status === 'signed' || status === 'completed')) {
        return (
          <a
            href={`https://sepolia.scrollscan.com/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block transition-transform hover:scale-105"
          >
            <Badge variant={variant} className={`${className} cursor-pointer hover:shadow-md`}>
              {children}
            </Badge>
          </a>
        );
      }
      return <Badge variant={variant} className={className}>{children}</Badge>;
    };

    switch (status) {
      case 'pending':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <BadgeComponent variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Pending</span>
                </BadgeComponent>
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
                <BadgeComponent variant="success" className="bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Signed</span>
                </BadgeComponent>
              </TooltipTrigger>
              <TooltipContent>
                <p>{transactionHash ? 'Click to view transaction on blockchain' : 'This agreement has been signed'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'rejected':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <BadgeComponent variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  <span>Rejected</span>
                </BadgeComponent>
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
                <BadgeComponent variant="default" className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>In Progress</span>
                </BadgeComponent>
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
                <BadgeComponent variant="success" className="bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Completed</span>
                </BadgeComponent>
              </TooltipTrigger>
              <TooltipContent>
                <p>{transactionHash ? 'Click to view transaction on blockchain' : 'This agreement has been completed'}</p>
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

  // Filter and sort agreements
  const filteredMyAgreements = useMemo(() => {
    let filtered = [...myAgreements];
    
    //  search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(agreement => 
        agreement.distribution.asset.name.toLowerCase().includes(term) ||
        agreement.distribution.type.toLowerCase().includes(term)
      );
    }
    
    //  status filter
    if (filterStatus) {
      filtered = filtered.filter(agreement => agreement.status === filterStatus);
    }
    
    //  sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'value':
          comparison = a.distribution.asset.value - b.distribution.asset.value;
          break;
        case 'name':
          comparison = a.distribution.asset.name.localeCompare(b.distribution.asset.name);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [myAgreements, searchTerm, filterStatus, sortBy, sortOrder]);

  const handleViewDetails = (agreement: Agreement) => {
    setSelectedAgreement(agreement);
    setIsInfoDialogOpen(true);
  };

  const handleExportAgreements = () => {
    // Create CSV content
    const headers = ['Asset Name', 'Type', 'Value', 'Status', 'Date'];
    const rows = filteredMyAgreements.map(agreement => [
      agreement.distribution.asset.name,
      agreement.distribution.type,
      agreement.distribution.asset.value.toString(),
      agreement.status,
      format(new Date(agreement.updatedAt), 'yyyy-MM-dd') // boleh tukar sini ke createdAt
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `agreements-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addNotification('Agreements exported successfully', 'success');
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
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
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
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

      <Tabs defaultValue="pending" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Agreements</TabsTrigger>
          <TabsTrigger value="pending">Pending Agreements</TabsTrigger>         
        </TabsList>
        
        <TabsContent value="pending">
          {pendingAgreements.length > 0 ? (
            <Card>
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
                          <div>
                            {getStatusBadge(agreement.status, agreement.transactionHash)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">Distribution Type</p>
                            <p className="text-sm text-muted-foreground">
                              {agreement.distribution.type.charAt(0).toUpperCase() + agreement.distribution.type.slice(1)}{' '}
                              {getDistributionDetails(agreement.distribution) && `(${getDistributionDetails(agreement.distribution)})`}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Created</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(agreement.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAgreement(agreement);
                            setIsRejectDialogOpen(true);
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedAgreement(agreement);
                            setIsSignDialogOpen(true);
                          }}
                        >
                          Sign
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Pending Agreements</CardTitle>
                <CardDescription>
                  You don&apos;t have any pending agreements to review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium">All caught up!</h3>
                  <p className="text-muted-foreground mt-2 max-w-md">
                    You&apos;ve reviewed all your pending agreements. Check back later for new agreements.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle>All Agreements</CardTitle>
                  <CardDescription>
                    View all your agreements and their status
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search agreements..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Filter className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setFilterStatus(null)}>
                          All
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterStatus('pending')}>
                          Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterStatus('signed')}>
                          Signed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterStatus('rejected')}>
                          Rejected
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setSortBy('date'); toggleSortOrder(); }}>
                          Date {sortBy === 'date' && (sortOrder === 'asc' ? '(Oldest first)' : '(Newest first)')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSortBy('value'); toggleSortOrder(); }}>
                          Value {sortBy === 'value' && (sortOrder === 'asc' ? '(Low to High)' : '(High to Low)')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSortBy('name'); toggleSortOrder(); }}>
                          Name {sortBy === 'name' && (sortOrder === 'asc' ? '(A-Z)' : '(Z-A)')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Button variant="outline" size="icon" onClick={handleExportAgreements}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMyAgreements.length > 0 ? (
                <div className="space-y-4">
                  {filteredMyAgreements.map((agreement: Agreement) => (
                    <Card key={agreement.id} className="hover:bg-muted/50 transition-colors">
                      <CardHeader className="pb-2">
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
                            {getStatusBadge(agreement.status, agreement.transactionHash)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">Distribution Type</p>
                            <p className="text-sm text-muted-foreground">
                              {agreement.distribution.type.charAt(0).toUpperCase() + agreement.distribution.type.slice(1)}{' '}
                              {getDistributionDetails(agreement.distribution) && `(${getDistributionDetails(agreement.distribution)})`}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm font-medium">Created</p>
                              <p className="text-sm text-muted-foreground flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(agreement.createdAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                            {agreement.signedAt && (
                              <div>
                                <p className="text-sm font-medium">Signed</p>
                                <p className="text-sm text-muted-foreground flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {format(new Date(agreement.signedAt), 'MMM d, yyyy')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(agreement)}
                        >
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No agreements found</h3>
                  <p className="text-muted-foreground mt-2 max-w-md">
                    {searchTerm || filterStatus
                      ? "No agreements match your current filters. Try adjusting your search criteria."
                      : "You don&apos;t have any agreements yet."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sign Dialog */}
      <Dialog open={isSignDialogOpen} onOpenChange={(open) => {
        setIsSignDialogOpen(open);
        if (!open) {
          // Reset all states when dialog closes
          setIsVerificationStep(false);
          setIsVerificationCodeSent(false);
          setVerificationCode('');
          setSignerIC('');
          setVerificationTimer(0);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isVerificationStep ? 'Verify Your Identity' : 'Sign Agreement'}
            </DialogTitle>
            <DialogDescription>
              {isVerificationStep ? (
                <>
                  A verification code has been sent to your email. Please enter the code to proceed with signing the agreement for{' '}
                  <span className="font-medium">{selectedAgreement?.distribution.asset.name}</span>.
                </>
              ) : (
                <>
                  You are about to sign the agreement for{' '}
                  <span className="font-medium">{selectedAgreement?.distribution.asset.name}</span>.
                  This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!isVerificationStep ? (
              <>
                <div>
                  <Label htmlFor="signerIC">IC Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="signerIC"
                    value={signerIC}
                    onChange={(e) => setSignerIC(e.target.value)}
                    placeholder="Enter your IC number"
                    required
                  />
                  {signerIC.length === 0 && (
                    <p className="text-sm text-red-500 mt-1">
                      IC number is required to sign the agreement
                    </p>
                  )}
                </div>

              </>
            ) : (
              <div>
                <Label htmlFor="verificationCode">Verification Code <span className="text-red-500">*</span></Label>
                <Input
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 5-digit verification code"
                  maxLength={5}
                  required
                />
                {isVerificationCodeSent && verificationTimer > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    Code expires in {Math.floor(verificationTimer / 60)}:{(verificationTimer % 60).toString().padStart(2, '0')}
                  </p>
                )}
                {verificationTimer === 0 && isVerificationCodeSent && (
                  <div className="mt-2">
                    <p className="text-sm text-red-500 mb-2">Verification code has expired.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerificationCode}
                      disabled={generateVerificationMutation.isPending}
                    >
                      {generateVerificationMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Resend Code'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSignDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              disabled={
                (!isVerificationStep && (!signerIC || signMutation.isPending || generateVerificationMutation.isPending)) ||
                (isVerificationStep && (!verificationCode || verifyCodeMutation.isPending || signMutation.isPending))
              }
            >
              {generateVerificationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Code...
                </>
              ) : verifyCodeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : signMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : isVerificationStep ? (
                'Verify & Sign'
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Agreement</DialogTitle>
            <DialogDescription>
              You are about to reject the agreement for{' '}
              <span className="font-medium">{selectedAgreement?.distribution.asset.name}</span>.
              Please provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-notes">Reason for Rejection <span className="text-red-500">*</span></Label>
              <Textarea
                id="reject-notes"
                placeholder="Explain why you are rejecting this agreement"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
              />
              {notes.length === 0 && (
                <p className="text-sm text-red-500 mt-1">
                  A reason is required when rejecting an agreement
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || notes.length === 0}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Agreement'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agreement Details Dialog */}
      <AlertDialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Agreement Details</AlertDialogTitle>
            <AlertDialogDescription>
              Detailed information about this agreement
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {selectedAgreement && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Asset Information</h3>
                  <div className="bg-muted p-3 rounded-md mt-1">
                    <p className="text-sm"><span className="font-medium">Name:</span> {selectedAgreement.distribution.asset.name}</p>
                    <p className="text-sm"><span className="font-medium">Type:</span> {selectedAgreement.distribution.asset.type}</p>
                    <p className="text-sm"><span className="font-medium">Value:</span> RM {selectedAgreement.distribution.asset.value.toFixed(2)}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Distribution Information</h3>
                  <div className="bg-muted p-3 rounded-md mt-1">
                    <p className="text-sm"><span className="font-medium">Type:</span> {selectedAgreement.distribution.type.charAt(0).toUpperCase() + selectedAgreement.distribution.type.slice(1)}</p>
                    <p className="text-sm"><span className="font-medium">Status:</span> {selectedAgreement.distribution.status}</p>
                    {selectedAgreement.distribution.notes && (
                      <p className="text-sm"><span className="font-medium">Notes:</span> {selectedAgreement.distribution.notes}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">Agreement Status</h3>
                <div className="bg-muted p-3 rounded-md mt-1 flex items-center justify-between">
                  <div>
                    <p className="text-sm"><span className="font-medium">Current Status:</span> {selectedAgreement.status}</p>
                    <p className="text-sm"><span className="font-medium">Created:</span> {format(new Date(selectedAgreement.createdAt), 'MMM d, yyyy h:mm a')}</p>
                    {selectedAgreement.signedAt && (
                      <p className="text-sm"><span className="font-medium">Signed:</span> {format(new Date(selectedAgreement.signedAt), 'MMM d, yyyy h:mm a')}</p>
                    )}
                  </div>
                  <div>
                    {getStatusBadge(selectedAgreement.status, selectedAgreement.transactionHash)}
                  </div>
                </div>
              </div>
              
              {selectedAgreement.notes && (
                <div>
                  <h3 className="text-sm font-medium">Notes</h3>
                  <div className="bg-muted p-3 rounded-md mt-1">
                    <p className="text-sm">{selectedAgreement.notes}</p>
                  </div>
                </div>
              )}
              
              {selectedAgreement.status === 'pending' && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsInfoDialogOpen(false);
                      setIsRejectDialogOpen(true);
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      setIsInfoDialogOpen(false);
                      setIsSignDialogOpen(true);
                    }}
                  >
                    Sign
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}