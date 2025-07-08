'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface InvitationDetails {
  inviterName: string;
  inviteeFullName: string;
  relationship: string;
  status: string;
}

function DirectAcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ic, setIc] = useState('');
  const [success, setSuccess] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const token = searchParams.get('token');
  const action = searchParams.get('action');

  // Fetch invitation details
  useEffect(() => {
    async function fetchInvitationDetails() {
      if (!token) {
        setError('No invitation token provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/family/invite/details?token=${token}`);
        
        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Failed to fetch invitation details');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setInvitation(data);
        setLoading(false);

        // If action is provided in URL, automatically process after verification
        if (action && ['accept', 'reject'].includes(action)) {
          // We'll wait for user to verify their IC before processing
        }
      } catch (err) {
        console.error('Error fetching invitation details:', err);
        setError('An error occurred while fetching invitation details');
        setLoading(false);
      }
    }

    fetchInvitationDetails();
  }, [token, action]);

  const handleDirectResponse = async () => {
    if (!token || !action || !['accept', 'reject'].includes(action as string)) {
      setError('Invalid action specified');
      return;
    }
    
    setProcessing(true);
    
    try {
      const response = await fetch('/api/family/invite/direct-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          action, 
          ic: ic.trim() // Send IC for verification
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process invitation');
      }
      
      setSuccess(true);
      setMessage(data.message);
      toast.success(data.message);
    } catch (err) {
      console.error('Error processing invitation:', err);
      setSuccess(false);
      setMessage(err instanceof Error ? err.message : 'An error occurred');
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-md mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Home Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="container max-w-md mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Invitation Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The invitation you are looking for does not exist or has expired.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Home Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If invitation is already processed
  if (invitation.status !== 'pending') {
    return (
      <div className="container max-w-md mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Invitation Already Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This invitation has already been {invitation.status}.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Home Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If the action has been processed successfully
  if (success === true) {
    return (
      <div className="container max-w-md mx-auto py-10">
        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center">Success!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">{message}</p>
            <p className="text-center mt-4">
              {action === 'accept' 
                ? `You are now connected with ${invitation.inviterName} as their ${invitation.relationship}.`
                : `You have rejected the invitation from ${invitation.inviterName}.`
              }
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Home Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If the action has failed
  if (success === false) {
    return (
      <div className="container max-w-md mx-auto py-10">
        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-center">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">{message}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Home Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Family Invitation</CardTitle>
          <CardDescription>
            {action === 'accept' ? 'Accept' : 'Reject'} invitation from {invitation.inviterName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            <strong>{invitation.inviterName}</strong> has invited you ({invitation.inviteeFullName}) to connect as their{' '}
            <strong>{invitation.relationship}</strong>.
          </p>
          
          <p>
            {action === 'accept' 
              ? 'By accepting this invitation, you will be added to each other\'s family network in the Islamic Inheritance System.'
              : 'You are about to reject this family connection invitation.'
            }
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="ic">Please verify your IC number</Label>
            <Input
              id="ic"
              placeholder="Enter your IC number"
              value={ic}
              onChange={(e) => setIc(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              For security purposes, please enter your IC number to verify your identity.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleDirectResponse}
            disabled={processing || !ic.trim()}
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {action === 'accept' ? 'Accept Invitation' : 'Reject Invitation'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function DirectAcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <DirectAcceptInvitationContent />
    </Suspense>
  );
} 