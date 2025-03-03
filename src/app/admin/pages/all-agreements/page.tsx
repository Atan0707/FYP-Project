'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Search, Filter, ArrowLeft, Users, AlertCircle, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from '@/components/ui/progress';
import { Skeleton } from "@/components/ui/skeleton";

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
const fetchAllAgreements = async () => {
  const response = await fetch('/api/admin/agreements');
  if (!response.ok) throw new Error('Failed to fetch all agreements');
  return response.json();
};

const AllAgreementsPage = () => {
  const { data: allAgreements = [], isLoading } = useQuery({
    queryKey: ['adminAllAgreements'],
    queryFn: fetchAllAgreements,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [filteredAgreements, setFilteredAgreements] = useState<Agreement[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (allAgreements.length > 0) {
      // Calculate status counts
      const counts: Record<string, number> = {
        pending: 0,
        signed: 0,
        rejected: 0,
        pending_admin: 0,
        completed: 0,
      };
      
      allAgreements.forEach((agreement: Agreement) => {
        if (counts[agreement.status] !== undefined) {
          counts[agreement.status]++;
        }
      });
      
      setStatusCounts(counts);
      
      // Apply filters
      let filtered = [...allAgreements];

      // Apply search term filter
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(agreement => 
          agreement.distribution.asset.name.toLowerCase().includes(lowerSearchTerm) ||
          agreement.distribution.asset.type.toLowerCase().includes(lowerSearchTerm) ||
          agreement.notes?.toLowerCase().includes(lowerSearchTerm)
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(agreement => agreement.status === statusFilter);
      }

      // Apply type filter
      if (typeFilter !== 'all') {
        filtered = filtered.filter(agreement => agreement.distribution.type === typeFilter);
      }

      setFilteredAgreements(filtered);
    } else {
      setFilteredAgreements([]);
      setStatusCounts({});
    }
  }, [allAgreements, searchTerm, statusFilter, typeFilter]);

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
    const signedAgreements = distribution.agreements.filter(a => a.status === 'signed' || a.status === 'completed').length;
    const rejectedAgreements = distribution.agreements.filter(a => a.status === 'rejected').length;
    const progress = (signedAgreements / totalAgreements) * 100;

    return {
      total: totalAgreements,
      signed: signedAgreements,
      rejected: rejectedAgreements,
      progress,
    };
  };

  const renderSkeletonCards = () => {
    return Array(3).fill(0).map((_, index) => (
      <Card key={index}>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Link href="/admin/pages/agreements">
            <Button variant="outline" size="icon" className="mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">All Agreements</h1>
        </div>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-secondary/20">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold">{allAgreements.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/20">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold">{statusCounts.pending || 0}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-green-600">{statusCounts.completed || 0}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-blue-600">{statusCounts.pending_admin || 0}</div>
              <div className="text-sm text-muted-foreground">Pending Admin</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-red-600">{statusCounts.rejected || 0}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search and Filter</CardTitle>
          <CardDescription>
            Find agreements by asset name, type, or status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search agreements..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">
                    Pending {statusCounts.pending ? `(${statusCounts.pending})` : ''}
                  </SelectItem>
                  <SelectItem value="signed">
                    Signed {statusCounts.signed ? `(${statusCounts.signed})` : ''}
                  </SelectItem>
                  <SelectItem value="rejected">
                    Rejected {statusCounts.rejected ? `(${statusCounts.rejected})` : ''}
                  </SelectItem>
                  <SelectItem value="pending_admin">
                    Pending Admin {statusCounts.pending_admin ? `(${statusCounts.pending_admin})` : ''}
                  </SelectItem>
                  <SelectItem value="completed">
                    Completed {statusCounts.completed ? `(${statusCounts.completed})` : ''}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="waqf">Waqf</SelectItem>
                  <SelectItem value="hibah">Hibah</SelectItem>
                  <SelectItem value="will">Will</SelectItem>
                  <SelectItem value="faraid">Faraid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agreement List</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading agreements...' : `${filteredAgreements.length} agreement${filteredAgreements.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {renderSkeletonCards()}
            </div>
          ) : filteredAgreements.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No agreements found matching your criteria
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAgreements.map((agreement: Agreement) => (
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
                        {getStatusBadge(agreement.status)}
                        <Badge variant="outline" className="ml-2">
                          {agreement.distribution.agreements.length} agreement{agreement.distribution.agreements.length !== 1 ? 's' : ''}
                        </Badge>
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
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {agreement.signedAt
                            ? `Signed on ${format(new Date(agreement.signedAt), 'PPP')}`
                            : `Created on ${format(new Date(agreement.createdAt), 'PPP')}`}
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
                        </div>
                        <Progress 
                          value={getSigningProgress(agreement.distribution).progress} 
                          className="h-2"
                        />
                      </div>
                      
                      {agreement.notes && (
                        <div className="text-sm mt-2 pt-2 border-t flex items-start gap-1">
                          <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <span className="font-medium">Notes:</span> {agreement.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
        {!isLoading && filteredAgreements.length > 0 && (
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredAgreements.length} of {allAgreements.length} agreements
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default AllAgreementsPage; 