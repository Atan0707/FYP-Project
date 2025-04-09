import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PendingAsset } from '../types';
import { StatusBadge } from './StatusBadge';

interface RecentActivityCardProps {
  recentAssets: PendingAsset[];
}

export function RecentActivityCard({ recentAssets }: RecentActivityCardProps) {
  return (
    <Card className="h-full shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Recent Asset Activity</CardTitle>
        <CardDescription>
          Latest approved and rejected assets
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto">
        <div className="space-y-4">
          {recentAssets.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No recent approved or rejected assets found.
            </div>
          ) : (
            recentAssets.map((asset) => (
              <div 
                key={asset.id} 
                className="flex items-center justify-between border-b pb-3 hover:bg-secondary/5 p-2 rounded-md transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    asset.status === 'approved' ? 'bg-green-100' : 
                    asset.status === 'rejected' ? 'bg-red-100' : 'bg-secondary/50'
                  }`}>
                    {asset.status === 'approved' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : asset.status === 'rejected' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {asset.user.fullName} • {format(new Date(asset.updatedAt), 'PPp')}
                    </div>
                  </div>
                </div>
                <div>
                  <StatusBadge status={asset.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
} 