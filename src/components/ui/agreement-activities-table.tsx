'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, ChevronDown, Activity, Clock, CheckCircle, UserPlus, Crown, Link } from 'lucide-react';
import { 
  getAgreementActivities, 
  getActivityDescription,
  type AgreementActivity 
} from '@/services/agreementActivities';
import { cn } from '@/lib/utils';

interface AgreementActivitiesTableProps {
  agreementId: string;
}

const activityIcons = {
  created: Activity,
  signer_added: UserPlus,
  signed: CheckCircle,
  admin_signed: Crown,
  completed: CheckCircle,
};

const getActivityIconColor = (type: AgreementActivity['type']) => {
  switch (type) {
    case 'created':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'signer_added':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'signed':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'admin_signed':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'completed':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getBadgeColor = (type: AgreementActivity['type']) => {
  switch (type) {
    case 'created':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'signer_added':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'signed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'admin_signed':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function AgreementActivitiesTable({ agreementId }: AgreementActivitiesTableProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    data: activities = [],
    isLoading,
    error,
    refetch,
  } = useQuery<AgreementActivity[]>({
    queryKey: ['agreementActivities', agreementId],
    queryFn: () => getAgreementActivities(agreementId),
    enabled: !!agreementId,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });

  const getActivityIcon = (type: AgreementActivity['type']) => {
    const IconComponent = activityIcons[type] || Activity;
    return <IconComponent className="h-4 w-4" />;
  };

  const formatTimestamp = (timestamp: Date) => {
    return format(timestamp, 'MMM dd, yyyy HH:mm:ss');
  };

  const truncateHash = (hash: string) => {
    if (!hash || hash.length < 16) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
  };

  // Show only first 3 activities when collapsed
  const displayedActivities = isExpanded ? activities : activities.slice(0, 3);
  const hasMoreActivities = activities.length > 3;

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 border border-blue-200">
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
            Blockchain Activities
          </CardTitle>
          <CardDescription>
            Loading transaction history from the blockchain...
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-white">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 border border-red-200">
              <Activity className="h-4 w-4 text-red-600" />
            </div>
            Blockchain Activities
          </CardTitle>
          <CardDescription>
            Failed to load blockchain transaction history
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Error loading activities: {error instanceof Error ? error.message : 'Unknown error'}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="w-full sm:w-auto"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 border border-gray-200">
              <Activity className="h-4 w-4 text-gray-600" />
            </div>
            Blockchain Activities
          </CardTitle>
          <CardDescription>
            No blockchain activities found for this agreement
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-center py-12 border rounded-lg bg-gray-50/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mx-auto mb-4">
              <Activity className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No activities recorded on the blockchain yet. Activities will appear here once the agreement is created on-chain.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 border border-blue-200">
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
          Blockchain Activities
        </CardTitle>
        <CardDescription>
          Complete transaction history from the blockchain ({activities.length} {activities.length === 1 ? 'activity' : 'activities'})
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 pl-6"></TableHead>
                <TableHead className="font-semibold">Activity</TableHead>
                <TableHead className="min-w-[160px] font-semibold">Timestamp</TableHead>
                <TableHead className="min-w-[140px] font-semibold">Transaction</TableHead>
                <TableHead className="text-right min-w-[100px] pr-6 font-semibold">Block</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedActivities.map((activity) => (
                <TableRow key={activity.id} className="group hover:bg-gray-50/50 transition-colors">
                  <TableCell className="py-4 pl-6">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border",
                      getActivityIconColor(activity.type)
                    )}>
                      {getActivityIcon(activity.type)}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs font-medium", getBadgeColor(activity.type))}
                        >
                          {activity.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-900 leading-relaxed">
                        {getActivityDescription(activity)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <a
                      href={`https://sepolia.basescan.org/tx/${activity.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors group/link"
                    >
                      <Link className="h-3.5 w-3.5" />
                      <span className="text-xs font-mono">{truncateHash(activity.transactionHash)}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </a>
                  </TableCell>
                  <TableCell className="text-right py-4 pr-6">
                    <span className="text-xs font-mono text-muted-foreground">
                      #{activity.blockNumber}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {hasMoreActivities && !isExpanded && (
          <div className="border-t bg-gray-50/50 px-4 sm:px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="w-full justify-center text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ChevronDown className="h-4 w-4 mr-2" />
              Show {activities.length - 3} More Activities
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 