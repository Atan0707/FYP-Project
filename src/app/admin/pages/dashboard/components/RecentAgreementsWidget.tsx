'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency, formatStatus, getStatusBadgeVariant } from '../utils/formatters'

type Agreement = {
  id: string
  status: string
  createdAt: string
  distribution: {
    type: string
    asset: {
      name: string
      value: number
    }
  }
}

interface RecentAgreementsWidgetProps {
  agreements: Agreement[]
  loading: boolean
}

const RecentAgreementsWidget = ({ agreements, loading }: RecentAgreementsWidgetProps) => {
  const router = useRouter()
  
  // Filter agreements that need admin attention
  const pendingAgreements = agreements.filter(
    agreement => agreement.status === 'pending_admin' || agreement.status === 'signed'
  )
  
  // Only show the first 5 agreements
  const displayAgreements = pendingAgreements.slice(0, 5)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Agreements Needing Attention</span>
          {!loading && pendingAgreements.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {pendingAgreements.length} pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Agreements waiting for your approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : displayAgreements.length > 0 ? (
          <div className="space-y-4">
            {displayAgreements.map((agreement) => (
              <div key={agreement.id} className="flex items-center justify-between border-b pb-3">
                <div>
                  <div className="font-medium">{agreement.distribution.asset.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {agreement.distribution.type.toUpperCase()} • 
                    {formatCurrency(agreement.distribution.asset.value)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Created on {formatDate(agreement.createdAt)}
                  </div>
                </div>
                <Badge 
                  variant={getStatusBadgeVariant(agreement.status)}
                  className="capitalize"
                >
                  {formatStatus(agreement.status)}
                </Badge>
              </div>
            ))}
            
            {pendingAgreements.length > 5 && (
              <div className="text-center mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/admin/pages/agreements')}
                >
                  View all {pendingAgreements.length} pending agreements
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No agreements need your attention</p>
        )}
      </CardContent>
    </Card>
  )
}

export default RecentAgreementsWidget 