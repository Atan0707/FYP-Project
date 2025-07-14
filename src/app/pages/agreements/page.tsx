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
    mutationFn: async ({ agreementId, signerIC }: { agreementId: string; signerIC: string }) => {
      const response = await fetch('/api/agreement-verification/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId, signerIC }),
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
      setIsVerificationStep(true); // Move this here - only show verification step on success
      toast.success('Verification code sent to your email');
    },
    onError: (error) => {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('not found') || errorMessage.includes('not accessible')) {
        toast.error('This agreement cannot be signed. It may have been deleted or you do not have permission to sign it.');
      } else if (errorMessage.includes('IC number')) {
        toast.error('The IC number you entered does not match your registered IC number.');
      } else {
        toast.error('Failed to send verification code: ' + errorMessage);
      }
      // Don't show verification step on error
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
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Invalid or expired')) {
        toast.error('The verification code is invalid or has expired. Please request a new code.');
      } else {
        toast.error('Verification failed: ' + errorMessage);
      }
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
        const errorData = await dbUpdateResponse.json();
        throw new Error(errorData.error || 'Failed to update database after signing');
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
      setIsVerificationStep(false);
      setVerificationCode('');
    },
    onError: (error) => {
      const message = 'Failed to sign agreement: ' + (error as Error).message;
      toast.error(message);
      addNotification(message, 'error');
      // Reset verification step if there's an error
      setIsVerificationStep(false);
      setVerificationCode('');
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
      generateVerificationMutation.mutate({
        agreementId: selectedAgreement.id,
        signerIC,
      });
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
    generateVerificationMutation.mutate({
      agreementId: selectedAgreement.id,
      signerIC,
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
    <div className="container mx-auto py-6 px-4 sm:py-10 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
        <TabsList className="mb-4 w-full overflow-x-auto">
          <TabsTrigger value="all" className="flex-1">All Agreements</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">Pending Agreements</TabsTrigger>         
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
                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                          <div>
                            <CardTitle className="text-lg flex flex-wrap items-center gap-2">
                              {agreement.distribution.asset.name}
                              {getAgreementRole(agreement)}
                            </CardTitle>
                            <CardDescription>
                              {agreement.distribution.asset.type} • RM{' '}
                              {agreement.distribution.asset.value.toFixed(2)}
                            </CardDescription>
                          </div>
                          <div className="self-start sm:self-auto">
                            {getStatusBadge(agreement.status, agreement.transactionHash)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                      <CardFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            setSelectedAgreement(agreement);
                            setIsRejectDialogOpen(true);
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="w-full sm:w-auto"
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
              <div className="flex flex-col gap-4">
                <div>
                  <CardTitle>All Agreements</CardTitle>
                  <CardDescription>
                    View all your agreements and their status
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search agreements..."
                      className="pl-8 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-10 w-10">
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
                        <Button variant="outline" size="icon" className="h-10 w-10">
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
                    
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={handleExportAgreements}>
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
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                          <div>
                            <CardTitle className="text-lg flex flex-wrap items-center gap-2">
                              {agreement.distribution.asset.name}
                              {getAgreementRole(agreement)}
                            </CardTitle>
                            <CardDescription>
                              {agreement.distribution.asset.type} • RM{' '}
                              {agreement.distribution.asset.value.toFixed(2)}
                            </CardDescription>
                          </div>
                          <div className="self-start sm:self-auto">
                            {getStatusBadge(agreement.status, agreement.transactionHash)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <p className="text-sm font-medium">Distribution Type</p>
                            <p className="text-sm text-muted-foreground">
                              {agreement.distribution.type.charAt(0).toUpperCase() + agreement.distribution.type.slice(1)}{' '}
                              {getDistributionDetails(agreement.distribution) && `(${getDistributionDetails(agreement.distribution)})`}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2 sm:mt-0">
                            <div>
                              <p className="text-sm font-medium">Created</p>
                              <p className="text-sm text-muted-foreground flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(agreement.createdAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                            {agreement.signedAt && (
                              <div className="mt-2 sm:mt-0">
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
        <DialogContent className="sm:max-w-md max-w-[95vw]">
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
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="mt-2 sm:mt-0 w-full sm:w-auto"
              onClick={() => {
                setIsSignDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
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
        <DialogContent className="sm:max-w-md max-w-[95vw]">
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
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              className="mt-2 sm:mt-0 w-full sm:w-auto"
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
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
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl overflow-y-auto max-h-[90vh] p-0">
          <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Agreement Details</DialogTitle>
              <DialogDescription>
                Detailed information about this agreement
              </DialogDescription>
            </DialogHeader>
          </div>
          
          {selectedAgreement && (
            <div className="px-6 pb-6 space-y-6">
              {/* Header Section with Asset Name and Status */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {selectedAgreement.distribution.asset.name}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Agreement ID: {selectedAgreement.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    {getAgreementRole(selectedAgreement)}
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-2">
                    {getStatusBadge(selectedAgreement.status, selectedAgreement.transactionHash)}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Last updated: {format(new Date(selectedAgreement.updatedAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Asset Information Card */}
                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-green-800 dark:text-green-200">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      Asset Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-green-200/50 dark:border-green-800/50">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedAgreement.distribution.asset.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-green-200/50 dark:border-green-800/50">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</span>
                        <Badge variant="outline" className="bg-white/50 dark:bg-gray-800/50">
                          {selectedAgreement.distribution.asset.type}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Value</span>
                        <span className="text-lg font-bold text-green-700 dark:text-green-300">
                          RM {selectedAgreement.distribution.asset.value.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Distribution Information Card */}
                <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-purple-800 dark:text-purple-200">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      Distribution Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-purple-200/50 dark:border-purple-800/50">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</span>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                          {selectedAgreement.distribution.type.charAt(0).toUpperCase() + selectedAgreement.distribution.type.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-purple-200/50 dark:border-purple-800/50">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                          {selectedAgreement.distribution.status.replace('_', ' ')}
                        </span>
                      </div>
                      {selectedAgreement.distribution.notes && (
                        <div className="py-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Notes</span>
                          <p className="text-sm text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 p-3 rounded-md">
                            {selectedAgreement.distribution.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline Section */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-800 dark:text-orange-200">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    Agreement Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Agreement Created</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {format(new Date(selectedAgreement.createdAt), 'EEEE, MMMM d, yyyy')}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {format(new Date(selectedAgreement.createdAt), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                    
                    {selectedAgreement.signedAt && (
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          {selectedAgreement.transactionHash && (
                            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Agreement Signed</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(selectedAgreement.signedAt), 'EEEE, MMMM d, yyyy')}
                            </p>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {format(new Date(selectedAgreement.signedAt), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedAgreement.transactionHash && (
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Blockchain Record</p>
                            <a
                              href={`https://sepolia.scrollscan.com/tx/${selectedAgreement.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                            >
                              View on Explorer
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono">
                            {selectedAgreement.transactionHash.slice(0, 20)}...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Additional Notes Section */}
              {selectedAgreement.notes && (
                <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-900/50 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      Additional Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedAgreement.notes}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Action Buttons */}
              {selectedAgreement.status === 'pending' && (
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none sm:w-auto"
                    onClick={() => {
                      setIsInfoDialogOpen(false);
                      setIsRejectDialogOpen(true);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Agreement
                  </Button>
                  <Button
                    className="flex-1 sm:flex-none sm:w-auto"
                    onClick={() => {
                      setIsInfoDialogOpen(false);
                      setIsSignDialogOpen(true);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Sign Agreement
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t px-6 py-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsInfoDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}