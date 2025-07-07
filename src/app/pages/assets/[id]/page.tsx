'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Download, Users, AlertCircle, UserCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from "@/components/ui/separator";
import { ethers, Log } from 'ethers';
import { createAgreement, addSigner } from '@/lib/agreement';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FamilyMember {
  id: string;
  fullName: string;
  relationship: string;
  relatedUserId: string;
  ic: string;
}

interface Beneficiary {
  id: string;
  percentage: number;
  familyMember?: FamilyMember;
  firstName?: string;
}

interface Distribution {
  id: string;
  type: string;
  status: string;
  notes?: string;
  beneficiaries?: Beneficiary[];
  organization?: string;
  agreements?: Agreement[];
  agreement?: {
    id: string;
    status: string;
    transactionHash?: string;
  };
}

interface Asset {
  id: string;
  name: string;
  type: string;
  value: number;
  description?: string;
  pdfFile?: string;
  createdAt: string;
  distribution?: Distribution | null;
}

interface Agreement {
  id: string;
  familyId: string;
  status: string;
  signedAt?: string;
  notes?: string;
  signedById?: string;
  transactionHash?: string;
  familyMember?: {
    id: string;
    fullName: string;
    relationship: string;
    email?: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  ic?: string;
  phone?: string;
  address?: string;
  photo?: string;
}

const distributionTypes = [
  { value: 'waqf', label: 'Waqf' },
  { value: 'faraid', label: 'Faraid' },
  { value: 'hibah', label: 'Hibah' },
  { value: 'will', label: 'Will' },
];

const getSigningProgress = (distribution: Distribution) => {
  if (!distribution?.agreements) return { total: 0, signed: 0, rejected: 0, progress: 0 };
  
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

const getDistributionStatus = (distribution: Distribution) => {
  if (!distribution || !distribution.agreements || distribution.agreements.length === 0) {
    return distribution?.status || 'pending';
  }
  
  // If the distribution status is already set to a final state, return it
  if (distribution.status === 'pending_admin' || distribution.status === 'completed') {
    return distribution.status;
  }
  
  const progress = getSigningProgress(distribution);
  
  if (progress.rejected > 0) return 'rejected';
  if (progress.signed === progress.total) return 'completed';
  if (progress.signed > 0) return 'in_progress';
  return 'pending';
};

const getStatusBadge = (status: string, transactionHash?: string) => {
  const getBadgeComponent = () => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending Signatures</Badge>;
      case 'in_progress':
        return <Badge variant="default">Signing in Progress</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'signed':
        return <Badge variant="success">Signed</Badge>;
      case 'pending_admin':
        return <Badge variant="success">Pending Admin</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // If there's a transaction hash and the status indicates a signed transaction, make it clickable
  if (transactionHash && (status === 'signed' || status === 'completed' || status === 'pending_admin')) {
    return (
      <a
        href={`https://sepolia.scrollscan.com/tx/${transactionHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block transition-opacity hover:opacity-80"
      >
        {getBadgeComponent()}
      </a>
    );
  }

  return getBadgeComponent();
};

export default function AssetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  const [transactionState, setTransactionState] = useState<'idle' | 'creating-agreement' | 'adding-signers' | 'saving'>('idle');
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [progressSteps, setProgressSteps] = useState<{ step: string; status: 'pending' | 'completed' | 'error' }[]>([
    { step: 'Creating agreement on blockchain', status: 'pending' },
    { step: 'Adding signers to agreement', status: 'pending' },
    { step: 'Saving distribution details', status: 'pending' },
  ]);

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          console.log('Current user data:', userData);
          setCurrentUser(userData);
          // console.log('Private key:', privateKey);
          // console.log('RPC URL:', rpcUrl);
        } else {
          console.error('Failed to fetch user data:', response.status);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);
  
  

  // Fetch asset details
  const { data: assetDetails, isLoading } = useQuery<Asset>({
    queryKey: ['asset', params.id],
    queryFn: async () => {
      const response = await fetch(`/api/asset/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch asset');
      const data = await response.json();
      
      // If we have a distribution with an agreement, fetch the agreement details
      if (data.distribution?.id) {
        try {
          const agreementResponse = await fetch(`/api/agreements/${data.distribution.id}`);
          if (agreementResponse.ok) {
            const agreementData = await agreementResponse.json();
            data.distribution.agreement = agreementData;
          }
        } catch (error) {
          console.error('Error fetching agreement details:', error);
        }
      }
      
      // Fetch family member details for agreements
      if (data.distribution?.agreements?.length > 0) {
        // Create a map of family IDs to fetch
        const familyIds = [...new Set(
          data.distribution.agreements
            .filter((a: Agreement) => !a.familyMember)
            .map((a: Agreement) => a.familyId)
        )];
          
        if (familyIds.length > 0) {
          // Fetch family details
          const familyDetailsPromises = familyIds.map(async (id) => {
            try {
              const res = await fetch(`/api/family/${id}`);
              if (res.ok) {
                const familyData = await res.json();
                return { id, data: familyData };
              }
              return { id, data: null };
            } catch (err) {
              console.error(`Error fetching family ${id}:`, err);
              return { id, data: null };
            }
          });
          
          const familyResults = await Promise.all(familyDetailsPromises);
          
          // Create a map for easy lookup
          const familyMap = new Map();
          familyResults.forEach(result => {
            if (result.data) {
              familyMap.set(result.id, result.data);
            }
          });
          
          // Attach family details to agreements
          data.distribution.agreements = data.distribution.agreements.map((agreement: Agreement) => {
            if (!agreement.familyMember && familyMap.has(agreement.familyId)) {
              return {
                ...agreement,
                familyMember: familyMap.get(agreement.familyId)
              };
            }
            return agreement;
          });
        }
      }
      
      // Fetch family member details for beneficiaries
      if (data.distribution?.beneficiaries) {
        const beneficiariesWithDetails = await Promise.all(
          data.distribution.beneficiaries.map(async (beneficiary: Beneficiary) => {
            try {
              const familyResponse = await fetch(`/api/family/${beneficiary.id}`);
              if (familyResponse.ok) {
                const familyData = await familyResponse.json();
                return {
                  ...beneficiary,
                  familyMember: familyData,
                };
              }
            } catch (err) {
              console.error(`Error fetching beneficiary ${beneficiary.id}:`, err);
            }
            return beneficiary;
          })
        );
        data.distribution.beneficiaries = beneficiariesWithDetails;
      }
      
      return data;
    },
  });

  // Fetch family members for distribution types that need signers
  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ['familyMembers'],
    queryFn: async () => {
      const response = await fetch('/api/family');
      if (!response.ok) throw new Error('Failed to fetch family members');
      const data = await response.json();
      console.log('Fetched family members:', data);
      return data;
    },
    enabled: selectedType === 'hibah' || selectedType === 'faraid' || selectedType === 'will' || selectedType === 'waqf',
  });

  // We'll handle distribution creation directly in the handleSubmit function

  const handleDistributionSelect = (type: string) => {
    setSelectedType(type);
    // Reset form when changing type
    setNotes('');
    setOrganization('');
    setSelectedBeneficiaryId('');
  };

  const updateProgressStep = (stepIndex: number, status: 'pending' | 'completed' | 'error') => {
    setProgressSteps(steps => 
      steps.map((step, index) => 
        index === stepIndex ? { ...step, status } : step
      )
    );
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      toast.error('Please select a distribution type');
      return;
    }

    // Validate based on type
    if (selectedType === 'will' && !notes) {
      toast.error('Please describe the will');
      return;
    }

    if (selectedType === 'hibah' && !selectedBeneficiaryId) {
      toast.error('Please select a beneficiary');
      return;
    }

    try {
      setIsProgressDialogOpen(true);
      setTransactionState('creating-agreement');
      updateProgressStep(0, 'pending');

      // First create the distribution and agreement in the database to get an ID
      const response = await fetch('/api/asset-distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          notes: notes,
          assetId: assetDetails!.id,
          beneficiaries: selectedType === 'hibah' ? [{ familyId: selectedBeneficiaryId, percentage: 100 }] : undefined,
          organization: selectedType === 'waqf' ? organization : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Distribution creation failed:', response.status, errorText);
        throw new Error(`Failed to create distribution: ${response.status} - ${errorText}`);
      }

      const distribution = await response.json();
      const agreementId = distribution.agreement.id; // Get the database-generated ID

      // Create a provider and signer
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer = new ethers.Wallet(privateKey!, provider);

      // Create the agreement on the blockchain using the database ID
      const tx = await createAgreement(
        signer,
        agreementId,
        assetDetails!.name,
        assetDetails!.type,
        assetDetails!.value,
        selectedType,
        'https://plum-tough-mongoose-147.mypinata.cloud/ipfs/bafkreier5qlxlholbixx2vkgnp3ics2u7cvhmnmtkgeoovfdporvh35feu'
      );

      // Store the transaction hash in the database
      const transactionHash = tx.hash;
      console.log('Transaction Hash:', transactionHash);
      
      // Update the agreement with the transaction hash
      const updateResponse = await fetch(`/api/agreements/${agreementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionHash }),
      });
      
      if (!updateResponse.ok) {
        console.warn('Failed to update agreement with transaction hash');
      }

      // Find the AgreementCreated event and get the tokenId
      const agreementCreatedEvent = tx.logs.find(
        (log: Log) => log.topics[0] === ethers.id(
          "AgreementCreated(uint256,string,address,string)"
        )
      );

      if (!agreementCreatedEvent) {
        throw new Error('Failed to get tokenId from transaction receipt');
      }

      // Get the tokenId from the event (it's the first indexed parameter)
      const tokenId = Number(agreementCreatedEvent.topics[1]);
      console.log('Token ID:', tokenId); // Debug log

      updateProgressStep(0, 'completed');
      setTransactionState('adding-signers');
      updateProgressStep(1, 'pending');

      // Prepare signers based on the distribution type
      let signersToAdd: Array<{ name: string; ic: string }> = [];

      // First add the current user as a signer if they have the required data
      if (currentUser && currentUser.name && currentUser.ic) {
        signersToAdd.push({
          name: currentUser.name,
          ic: currentUser.ic
        });
      } else {
        console.warn('Current user data is incomplete or missing, cannot add as signer');
      }

      // Then add family members based on distribution type
      if (selectedType === 'hibah' && selectedBeneficiaryId) {
        const beneficiary = familyMembers.find(m => m.id === selectedBeneficiaryId);
        if (beneficiary) {
          signersToAdd.push({
            name: beneficiary.fullName,
            ic: beneficiary.ic
          });
        }
      } else if (selectedType === 'faraid' || selectedType === 'will') {
        signersToAdd = [
          ...signersToAdd,
          ...familyMembers.map(member => ({
            name: member.fullName,
            ic: member.ic
          }))
        ];
      } else if (selectedType === 'waqf') {
        // For waqf, we need to add all family members as signers
        signersToAdd = [
          ...signersToAdd,
          ...familyMembers.map(member => ({
            name: member.fullName,
            ic: member.ic
          }))
        ];
      }

      console.log('Signers to add:', signersToAdd); // Debug log
      
      // Check if we have signers to add
      if (signersToAdd.length === 0) {
        console.log('No signers to add. This might be because no family members were found.');
        toast.warning('No family members found to add as signers. Please add family members first.');
        throw new Error('No signers to add');
      }

      // Add each signer individually
      for (const signerData of signersToAdd) {
        try {
          console.log('Adding signer:', signerData); // Debug log
          const receipt = await addSigner(
            signer,
            tokenId,
            signerData.name,
            signerData.ic
          );

          // Find the SignerAdded event
          const signerAddedEvent = receipt.logs.find(
            (log: Log) => log.topics[0] === ethers.id(
              "SignerAdded(uint256,string,string)"
            )
          );

          if (!signerAddedEvent) {
            throw new Error(`Failed to add signer ${signerData.name}`);
          }

          console.log('Signer added successfully:', signerData.name); // Debug log
        } catch (error) {
          console.error('Error adding signer:', signerData.name, error);
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      updateProgressStep(1, 'completed');
      setTransactionState('saving');
      updateProgressStep(2, 'pending');
      
      // The distribution is already created in the database, so we just need to
      // invalidate the query to refresh the UI with the new data
      queryClient.invalidateQueries({ queryKey: ['asset', params.id] });
      updateProgressStep(2, 'completed');
      
      // Reset form
      setNotes('');
      setOrganization('');
      setSelectedBeneficiaryId('');
      
      // Show success message
      toast.success('Distribution type set successfully');
      
      // Keep the dialog open for a moment to show completion
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsProgressDialogOpen(false);
      setTransactionState('idle');
    } catch (error) {
      console.error('Error creating distribution:', error);
      // Find the current step and mark it as error
      const currentStepIndex = progressSteps.findIndex(step => step.status === 'pending');
      if (currentStepIndex !== -1) {
        updateProgressStep(currentStepIndex, 'error');
      }
      toast.error('Failed to create distribution: ' + (error as Error).message);
      // Keep the dialog open to show the error state
      await new Promise(resolve => setTimeout(resolve, 3000));
      setIsProgressDialogOpen(false);
      setTransactionState('idle');
    }
  };

  const getSubmitButtonText = () => {
    switch (transactionState) {
      case 'creating-agreement':
        return 'Creating Agreement on Blockchain...';
      case 'adding-signers':
        return 'Adding Signers...';
      case 'saving':
        return 'Saving Distribution...';
      default:
        return 'Submit Distribution';
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

  if (!assetDetails) {
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
            <CardTitle>{assetDetails.name}</CardTitle>
            <CardDescription>Asset Information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Type</div>
                <div className="font-medium">{assetDetails.type}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Value</div>
                <div className="font-medium">
                  {new Intl.NumberFormat('en-MY', {
                    style: 'currency',
                    currency: 'MYR',
                  }).format(assetDetails.value)}
                </div>
              </div>
              {assetDetails.description && (
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="font-medium">{assetDetails.description}</div>
                </div>
              )}
              {assetDetails.pdfFile && (
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Document</div>
                  <a
                    href={`/api/download/${encodeURIComponent(assetDetails.pdfFile.replace('https://storage.googleapis.com/', ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    View Document
                  </a>
                </div>
              )}
              {assetDetails.distribution?.id && (
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Agreement</div>
                  <a
                    href={`/api/agreement-pdf/${assetDetails.distribution.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    View Agreement
                  </a>
                </div>
              )}
              {assetDetails.distribution?.agreement?.transactionHash && (
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Blockchain Transaction</div>
                  <a
                    href={`https://sepolia.basescan.org/tx/${assetDetails.distribution.agreement.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800 truncate"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                      <line x1="16" y1="8" x2="2" y2="22"></line>
                      <line x1="17.5" y1="15" x2="9" y2="15"></line>
                    </svg>
                    View on BaseScan
                  </a>
                </div>
              )}
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground">Created On</div>
                <div className="font-medium">{format(new Date(assetDetails.createdAt), 'PPP')}</div>
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
            <div className="space-y-6">
              {assetDetails.distribution ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="capitalize">
                      {assetDetails.distribution.type}
                    </Badge>
                    {getStatusBadge(getDistributionStatus(assetDetails.distribution))}
                  </div>
                  {assetDetails.distribution && (
                    <>
                      {assetDetails.distribution.notes && (
                        <div>
                          <div className="text-sm text-muted-foreground">Notes</div>
                          <div className="mt-1">{assetDetails.distribution.notes}</div>
                        </div>
                      )}
                      {assetDetails.distribution.organization && (
                        <div>
                          <div className="text-sm text-muted-foreground">Organization</div>
                          <div className="mt-1">{assetDetails.distribution.organization}</div>
                        </div>
                      )}
                      {assetDetails.distribution.beneficiaries && assetDetails.distribution.beneficiaries.length > 0 && (
                        <div>
                          <div className="text-sm text-muted-foreground">Beneficiaries</div>
                          <div className="mt-1">
                            {assetDetails.distribution.beneficiaries
                              ?.sort((a: Beneficiary, b: Beneficiary) => {
                                const nameA = a.familyMember?.fullName || a.firstName || '';
                                const nameB = b.familyMember?.fullName || b.firstName || '';
                                return nameA.localeCompare(nameB);
                              })
                              .map((beneficiary: Beneficiary, index: number) => (
                                <div key={beneficiary.id || `beneficiary-${index}`} className="flex items-center gap-2 mb-2">
                                  <span className="font-medium">
                                    {beneficiary.familyMember?.fullName || beneficiary.firstName || 'Unknown'} 
                                    {beneficiary.familyMember?.relationship && ` (${beneficiary.familyMember.relationship})`}
                                  </span>
                                  <span className="text-gray-600">- {beneficiary.percentage}%</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      <Separator className="my-4" />
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">Signing Status</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(getDistributionStatus(assetDetails.distribution))}
                          </div>
                        </div>

                        <div className="relative">
                          <Progress 
                            value={getSigningProgress(assetDetails.distribution)?.progress || 0} 
                            className="h-2"
                          />
                          {getSigningProgress(assetDetails.distribution)?.rejected > 0 && (
                            <div 
                              className="absolute top-0 right-0 h-2 bg-destructive/20" 
                              style={{ 
                                width: `${(getSigningProgress(assetDetails.distribution)?.rejected || 0) / (getSigningProgress(assetDetails.distribution)?.total || 1) * 100}%` 
                              }} 
                            />
                          )}
                        </div>

                        <div className="space-y-2">
                          {assetDetails.distribution.agreements?.map((agreement: Agreement) => (
                            <div key={agreement.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <UserCircle2 className="h-4 w-4" />
                                <span>
                                  {agreement.familyMember ? (
                                    <>
                                      {agreement.familyMember.fullName}
                                      <span className="text-muted-foreground ml-1">
                                        {(() => {
                                          // Check if this signature belongs to the current user
                                          // by comparing the signedById with current user's ID
                                          const isCurrentUser = currentUser && 
                                            agreement.signedById === currentUser.id;
                                          
                                          return isCurrentUser
                                            ? "(you)" 
                                            : `(${agreement.familyMember.relationship})`;
                                        })()}
                                      </span>
                                    </>
                                  ) : (
                                    'Unknown Member'
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {agreement.status === 'rejected' && agreement.notes && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertCircle className="h-4 w-4 text-destructive cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-sm">Rejection reason: {agreement.notes}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {getStatusBadge(agreement.status, agreement.transactionHash)}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {getSigningProgress(assetDetails.distribution)?.signed} of {getSigningProgress(assetDetails.distribution)?.total} family members have signed
                          {getSigningProgress(assetDetails.distribution)?.rejected > 0 && (
                            <span className="text-destructive ml-1">
                              • {getSigningProgress(assetDetails.distribution)?.rejected} rejection(s)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground mt-4">
                        Distribution type cannot be changed once set. Please contact admin for any changes.
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex-grow">
                    <Select
                      value={selectedType}
                      onValueChange={handleDistributionSelect}
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

                  {selectedType === 'waqf' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Organization (Optional)</label>
                        <Input
                          value={organization}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrganization(e.target.value)}
                          placeholder="Enter organization name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Additional Notes (Optional)</label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any additional notes about the waqf"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {selectedType === 'faraid' && (
                    <div>
                      <label className="text-sm font-medium">Additional Notes (Optional)</label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any additional notes about the faraid distribution"
                        className="mt-1"
                      />
                    </div>
                  )}

                  {selectedType === 'hibah' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Select Beneficiary</label>
                        <Select
                          value={selectedBeneficiaryId}
                          onValueChange={setSelectedBeneficiaryId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a family member" />
                          </SelectTrigger>
                          <SelectContent>
                            {familyMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.fullName} ({member.relationship})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Additional Notes (Optional)</label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any additional notes about the hibah"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {selectedType === 'will' && (
                    <div>
                      <label className="text-sm font-medium">Will Description (Required)</label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Describe the details of your will"
                        className="mt-1"
                        required
                      />
                    </div>
                  )}

                  {selectedType && (
                    <Button
                      onClick={handleSubmit}
                      className="w-full"
                      disabled={transactionState !== 'idle'}
                    >
                      {transactionState !== 'idle' && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {getSubmitButtonText()}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-6 py-4">
            <DialogTitle className="text-center text-xl font-semibold">Creating Agreement</DialogTitle>
            <div className="space-y-6">
              {progressSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                    step.status === 'pending' && "border-primary bg-primary/10",
                    step.status === 'completed' && "border-green-500 bg-green-50",
                    step.status === 'error' && "border-destructive bg-destructive/10"
                  )}>
                    {step.status === 'pending' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    {step.status === 'completed' && (
                      <svg
                        className="h-5 w-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    {step.status === 'error' && (
                      <svg
                        className="h-5 w-5 text-destructive"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "font-medium",
                      step.status === 'completed' && "text-green-600",
                      step.status === 'error' && "text-destructive"
                    )}>
                      {step.step}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step.status === 'pending' && "In progress..."}
                      {step.status === 'completed' && "Completed successfully"}
                      {step.status === 'error' && "Failed - please try again"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {progressSteps.every(step => step.status === 'completed') && (
              <div className="mt-6 text-center">
                <p className="text-green-600 font-medium">All steps completed successfully!</p>
              </div>
            )}
            
            {progressSteps.some(step => step.status === 'error') && (
              <div className="mt-6">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setIsProgressDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 