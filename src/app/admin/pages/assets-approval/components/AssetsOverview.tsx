import React from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AssetStatus } from '../types';

interface AssetsOverviewProps {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  setStatusFilter: (status: AssetStatus | 'all') => void;
}

export function AssetsOverview({ 
  pendingCount, 
  approvedCount, 
  rejectedCount, 
  setStatusFilter 
}: AssetsOverviewProps) {
  return (
    <Card className="mb-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle>Assets Overview</CardTitle>
        <CardDescription>
          Summary of all asset submissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            className="bg-secondary/50 p-4 rounded-lg hover:bg-secondary/70 transition-colors cursor-pointer border border-transparent hover:border-secondary" 
            onClick={() => setStatusFilter('pending')}
          >
            <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Pending Assets
            </div>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </div>
          <div 
            className="bg-green-50 p-4 rounded-lg hover:bg-green-100 transition-colors cursor-pointer border border-transparent hover:border-green-200" 
            onClick={() => setStatusFilter('approved')}
          >
            <div className="text-sm font-medium text-green-700 mb-1 flex items-center">
              <CheckCircle className="mr-2 h-4 w-4" />
              Approved Assets
            </div>
            <div className="text-2xl font-bold text-green-800">{approvedCount}</div>
          </div>
          <div 
            className="bg-red-50 p-4 rounded-lg hover:bg-red-100 transition-colors cursor-pointer border border-transparent hover:border-red-200" 
            onClick={() => setStatusFilter('rejected')}
          >
            <div className="text-sm font-medium text-red-700 mb-1 flex items-center">
              <XCircle className="mr-2 h-4 w-4" />
              Rejected Assets
            </div>
            <div className="text-2xl font-bold text-red-800">{rejectedCount}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 