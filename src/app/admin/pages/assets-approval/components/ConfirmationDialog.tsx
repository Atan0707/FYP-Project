import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PendingAsset } from '../types';

interface ConfirmationDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedAsset: PendingAsset | null;
  actionType: 'approve' | 'reject';
  confirmAction: () => void;
}

export function ConfirmationDialog({
  isOpen,
  setIsOpen,
  selectedAsset,
  actionType,
  confirmAction,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className={actionType === 'approve' ? 'text-green-600' : 'text-red-600'}>
            {actionType === 'approve' ? '✓ Approve Asset' : '✗ Reject Asset'}
          </DialogTitle>
          <DialogDescription>
            {actionType === 'approve'
              ? 'Are you sure you want to approve this asset? This will add it to the user\'s assets.'
              : 'Are you sure you want to reject this asset? The user will be notified.'}
          </DialogDescription>
        </DialogHeader>
        {selectedAsset && (
          <div className="py-4">
            <div className="grid grid-cols-2 gap-3 text-sm bg-secondary/10 p-4 rounded-md">
              <div className="font-medium">Asset Name:</div>
              <div>{selectedAsset.name}</div>
              <div className="font-medium">Type:</div>
              <div>{selectedAsset.type}</div>
              <div className="font-medium">Value:</div>
              <div>
                {new Intl.NumberFormat('en-MY', {
                  style: 'currency',
                  currency: 'MYR',
                }).format(selectedAsset.value)}
              </div>
              <div className="font-medium">User:</div>
              <div>{selectedAsset.user.fullName}</div>
            </div>
          </div>
        )}
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="sm:w-auto w-full"
          >
            Cancel
          </Button>
          <Button
            variant={actionType === 'approve' ? 'default' : 'destructive'}
            onClick={confirmAction}
            className={`sm:w-auto w-full ${
              actionType === 'approve' 
                ? 'bg-green-600 hover:bg-green-700' 
                : ''
            }`}
          >
            {actionType === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 