'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency, formatStatus, getStatusBadgeVariant } from '../utils/formatters'

type PendingAsset = {
  id: string
  name: string
  type: string
  value: number
  status: string
  createdAt: string
  user: {
    id: string
    fullName: string
    email: string
  }
}

interface PendingAssetsWidgetProps {
  pendingAssets: PendingAsset[]
  loading: boolean
}

const PendingAssetsWidget = ({ pendingAssets, loading }: PendingAssetsWidgetProps) => {
  const router = useRouter()
  
  // Only show the first 5 pending assets
  const displayAssets = pendingAssets.slice(0, 5)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Pending Assets</span>
          {!loading && pendingAssets.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {pendingAssets.length} pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Assets waiting for your approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : displayAssets.length > 0 ? (
          <div className="space-y-4">
            {displayAssets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between border-b pb-3">
                <div>
                  <div className="font-medium">{asset.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {asset.type} • {formatCurrency(asset.value)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Submitted by {asset.user.fullName} on {formatDate(asset.createdAt)}
                  </div>
                </div>
                <Badge 
                  variant={getStatusBadgeVariant(asset.status)}
                  className="capitalize"
                >
                  {formatStatus(asset.status)}
                </Badge>
              </div>
            ))}
            
            {pendingAssets.length > 5 && (
              <div className="text-center mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/admin/pages/pending-assets')}
                >
                  View all {pendingAssets.length} pending assets
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No pending assets to approve</p>
        )}
      </CardContent>
    </Card>
  )
}

export default PendingAssetsWidget 