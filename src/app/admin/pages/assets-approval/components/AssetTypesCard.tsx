import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AssetTypeDistribution } from '../types';

interface AssetTypesCardProps {
  assetTypeDistribution: AssetTypeDistribution;
}

export function AssetTypesCard({ assetTypeDistribution }: AssetTypesCardProps) {
  return (
    <Card className="h-full shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Asset Types</CardTitle>
        <CardDescription>
          Distribution by type
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto">
        <div className="space-y-2">
          {Object.entries(assetTypeDistribution).length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No asset types found.
            </div>
          ) : (
            Object.entries(assetTypeDistribution).map(([type, count]) => (
              <div 
                key={type} 
                className="flex justify-between items-center p-2 rounded-md hover:bg-secondary/30 transition-colors"
              >
                <span className="font-medium">{type}</span>
                <Badge variant="outline" className="ml-2 min-w-[2.5rem] text-center">
                  {count}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
} 