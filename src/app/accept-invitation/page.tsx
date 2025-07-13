'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface InvitationDetails {
  inviterName: string;
  relationship: string;
  status: string;
}

function AcceptInvitationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const token = searchParams.get('token');

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
      } catch (err) {
        console.error('Error fetching invitation details:', err);
        setError('An error occurred while fetching invitation details');
        setLoading(false);
      }
    }

    fetchInvitationDetails();
  }, [token]);

  const handleResponse = async (action: 'accept' | 'reject') => {
    if (!token) return;
    
    setProcessing(true);
    
    try {
      const response = await fetch('/api/family/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process invitation');
      }
      
      const data = await response.json();
      toast.success(data.message);
      
      // Redirect to family page after successful processing
      router.push('/pages/family');
    } catch (err) {
      console.error('Error processing invitation:', err);
      toast.error(err instanceof Error ? err.message : 'An error occurred');
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
            <Button onClick={() => router.push('/pages/family')} className="w-full">
              Go to Family Page
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
            <Button onClick={() => router.push('/pages/family')} className="w-full">
              Go to Family Page
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
            <Button onClick={() => router.push('/pages/family')} className="w-full">
              Go to Family Page
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
            You have received a family connection request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            <strong>{invitation.inviterName}</strong> has invited you to connect as their{' '}
            <strong>{invitation.relationship}</strong>.
          </p>
          <p>
            By accepting this invitation, you will be added to each other&apos;s family network in the Islamic Inheritance System.
          </p>
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleResponse('reject')}
            disabled={processing}
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Reject
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleResponse('accept')}
            disabled={processing}
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Accept
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptInvitationPageContent />
    </Suspense>
  );
}
