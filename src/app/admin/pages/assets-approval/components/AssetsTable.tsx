import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Filter, Clock, Download, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { PendingAsset, AssetStatus } from '../types';
import { StatusBadge } from './StatusBadge';

interface AssetsTableProps {
  filteredAssets: PendingAsset[];
  statusFilter: AssetStatus | 'all';
  setStatusFilter: (status: AssetStatus | 'all') => void;
  handleAction: (asset: PendingAsset, action: 'approve' | 'reject') => void;
}

export function AssetsTable({ 
  filteredAssets, 
  statusFilter, 
  setStatusFilter,
  handleAction
}: AssetsTableProps) {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle>All Asset Submissions</CardTitle>
          <CardDescription>
            View and manage all asset submissions
          </CardDescription>
        </div>
        <Tabs 
          value={statusFilter} 
          onValueChange={(value) => setStatusFilter(value as AssetStatus | 'all')}
          className="w-full md:w-auto"
        >
          <TabsList className="w-full md:w-auto grid grid-cols-4 md:flex">
            <TabsTrigger value="all" className="flex items-center gap-1">
              <Filter className="h-4 w-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-1">
              <XCircle className="h-4 w-4" />
              Rejected
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4 border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Asset Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value (RM)</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                  No assets found with the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => (
                <TableRow 
                  key={asset.id} 
                  className={
                    asset.status === 'approved' ? 'bg-green-50 hover:bg-green-100' : 
                    asset.status === 'rejected' ? 'bg-red-50 hover:bg-red-100' : 
                    'hover:bg-secondary/5'
                  }
                >
                  <TableCell>
                    <div className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{asset.user.fullName}</div>
                        <div className="text-xs text-muted-foreground">{asset.user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.type}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('en-MY', {
                      style: 'currency',
                      currency: 'MYR',
                    }).format(asset.value)}
                  </TableCell>
                  <TableCell>{asset.description || '-'}</TableCell>
                  <TableCell>
                    {asset.pdfFile ? (
                      <a
                        href={`/api/download/${encodeURIComponent(asset.pdfFile.split('/').pop() || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <Download className="mr-1 h-4 w-4" />
                        View PDF
                      </a>
                    ) : (
                      <span className="text-gray-400">No document</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={asset.status} />
                  </TableCell>
                  <TableCell>{format(new Date(asset.createdAt), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-right">
                    {asset.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleAction(asset, 'approve')}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleAction(asset, 'reject')}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
} 