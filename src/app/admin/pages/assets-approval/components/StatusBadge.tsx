import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AssetStatus } from '../types';

interface StatusBadgeProps {
  status: AssetStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
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
              <p>This asset is waiting for approval</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case 'approved':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>Approved</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>This asset has been approved</p>
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
              <p>This asset has been rejected</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
} 