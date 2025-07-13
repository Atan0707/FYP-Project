'use client';

import { useState, Suspense } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PlusCircle, Pencil, Trash2, Search, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAvailableRelationships } from '@/lib/relationships';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Get available relationships
const relationships = getAvailableRelationships();

// Feature flag to enable/disable non-registered family members
const nonRegisteredFeatures = false; // true - turn on    false - turn off

// Malaysian IC validation function
const validateMalaysianIC = (ic: string): boolean => {
  // Remove dashes if present
  const cleanedValue = ic.replace(/-/g, '');
  
  // Check if it's 12 digits
  if (!/^\d{12}$/.test(cleanedValue)) return false;
  
  // Extract date part (first 6 digits)
  const year = parseInt(cleanedValue.substring(0, 2));
  const month = parseInt(cleanedValue.substring(2, 4));
  const day = parseInt(cleanedValue.substring(4, 6));
  
  // Validate date
  const currentYear = new Date().getFullYear() % 100;
  const century = year > currentYear ? 1900 : 2000;
  const fullYear = century + year;
  
  const date = new Date(fullYear, month - 1, day);
  const isValidDate = date.getFullYear() === fullYear && 
                      date.getMonth() === month - 1 && 
                      date.getDate() === day;
  
  // Month should be between 1-12, day should be valid for the month
  return month >= 1 && month <= 12 && isValidDate;
};

interface Family {
  id: string;
  fullName: string;
  ic: string;
  relationship: string;
  phone: string;
  isRegistered: boolean;
}

interface PendingInvitation {
  id: string;
  inviteeFullName: string;
  inviteeIC: string;
  relationship: string;
  inviteePhone: string;
  status: string;
  createdAt: string;
}

interface FamilyData {
  families: Family[];
  pendingInvitations: PendingInvitation[];
}

interface User {
  id: string;
  fullName: string;
  ic: string;
  phone: string;
  email?: string;
}

// API functions
const fetchFamilies = async (): Promise<FamilyData> => {
  const response = await fetch('/api/family');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const searchUser = async (ic: string): Promise<User | null> => {
  const response = await fetch('/api/user/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ic }),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  return response.json();
};

const createFamily = async (data: Omit<Family, 'id'>) => {
  const response = await fetch('/api/family', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    // Try to extract error message from response
    const errorData = await response.json().catch(() => null);
    if (errorData && errorData.error) {
      throw new Error(errorData.error);
    }
    throw new Error(`Server error: ${response.status}`);
  }
  
  return response.json();
};

const sendInvitation = async (data: {
  fullName: string;
  ic: string;
  email: string;
  phone: string;
  relationship: string;
}) => {
  const response = await fetch('/api/family/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    // Try to extract error message from response
    const errorData = await response.json().catch(() => null);
    if (errorData && errorData.error) {
      throw new Error(errorData.error);
    }
    throw new Error(`Server error: ${response.status}`);
  }
  
  return response.json();
};

const respondToInvitation = async (token: string, action: 'accept' | 'reject') => {
  const response = await fetch('/api/family/invite', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, action }),
  });
  
  if (!response.ok) {
    // Try to extract error message from response
    const errorData = await response.json().catch(() => null);
    if (errorData && errorData.error) {
      throw new Error(errorData.error);
    }
    throw new Error(`Server error: ${response.status}`);
  }
  
  return response.json();
};

const updateFamily = async ({ id, ...data }: Family) => {
  const response = await fetch('/api/family', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  
  if (!response.ok) {
    // Try to extract error message from response
    const errorData = await response.json().catch(() => null);
    if (errorData && errorData.error) {
      throw new Error(errorData.error);
    }
    throw new Error(`Server error: ${response.status}`);
  }
  
  return response.json();
};

const deleteFamily = async (id: string) => {
  const response = await fetch(`/api/family/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const cancelInvitation = async (id: string) => {
  const response = await fetch(`/api/family/invite/details`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invitationId: id }),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

// Add a new function to update family relationships
// const updateFamilyRelationships = async () => {
//   const response = await fetch('/api/cron/update-family-relationships');
//   if (!response.ok) {
//     throw new Error('Network response was not ok');
//   }
//   return response.json();
// };

// Add new API function for updating only the relationship
const updateFamilyRelationship = async (data: { id: string; relationship: string }) => {
  const response = await fetch('/api/family/relationship', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (errorData && errorData.error) {
      throw new Error(errorData.error);
    }
    throw new Error(`Server error: ${response.status}`);
  }
  
  return response.json();
};

function FamilyPageContent() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [searchIC, setSearchIC] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<string>('');
  const [processingInvitation, setProcessingInvitation] = useState(false);
  
  // Add new states for relationship editing
  const [isRelationshipDialogOpen, setIsRelationshipDialogOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<Family | null>(null);
  const [newRelationship, setNewRelationship] = useState<string>('');
  
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  
  // Check if there's an invitation token in the URL
  const invitationToken = searchParams.get('token');

  // Queries
  const { data, isLoading, error } = useQuery({
    queryKey: ['families'],
    queryFn: fetchFamilies,
  });

  const families = data?.families || [];
  const pendingInvitations = data?.pendingInvitations || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: createFamily,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Family member added successfully');
      setIsOpen(false);
      setFoundUser(null);
      setSearchIC('');
      setShowForm(false);
      setSelectedRelationship('');
    },
    onError: async (error: Error) => {
      console.error('Error adding family member:', error);
      toast.error(`Failed to add family member: ${error.message}`);
      // Don't close the dialog on error so the user can fix the issue
      // Still refresh the data to be sure
      await queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: sendInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Invitation sent successfully');
      setIsOpen(false);
      setFoundUser(null);
      setSearchIC('');
      setShowForm(false);
      setSelectedRelationship('');
    },
    onError: (error: Error) => {
      console.error('Error sending invitation:', error);
      toast.error(`Failed to send invitation: ${error.message}`);
    },
  });

  const respondInvitationMutation = useMutation({
    mutationFn: ({ token, action }: { token: string; action: 'accept' | 'reject' }) => 
      respondToInvitation(token, action),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success(data.message);
      setProcessingInvitation(false);
      // Remove the token from the URL
      window.history.replaceState({}, '', '/pages/family');
    },
    onError: (error: Error) => {
      console.error('Error responding to invitation:', error);
      toast.error(`Failed to process invitation: ${error.message}`);
      setProcessingInvitation(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateFamily,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Family member updated successfully');
      setIsOpen(false);
    },
    onError: async (error: Error) => {
      console.error('Error updating family member:', error);
      toast.error(`Failed to update family member: ${error.message}`);
      // Don't close the dialog on error so the user can fix the issue
      // Still refresh the data to be sure
      await queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFamily,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Family member deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete family member: ' + error.message);
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Invitation cancelled successfully');
    },
    onError: (error) => {
      toast.error('Failed to cancel invitation: ' + error.message);
    },
  });

  // Add new mutation for updating relationship only
  const updateRelationshipMutation = useMutation({
    mutationFn: updateFamilyRelationship,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Family relationship updated successfully');
      setIsRelationshipDialogOpen(false);
      setEditingRelationship(null);
      setNewRelationship('');
    },
    onError: (error: Error) => {
      console.error('Error updating family relationship:', error);
      toast.error(`Failed to update relationship: ${error.message}`);
    },
  });

  // Handle invitation token if present
  const handleInvitation = (token: string, action: 'accept' | 'reject') => {
    setProcessingInvitation(true);
    respondInvitationMutation.mutate({ token, action });
  };

  // Check for invitation token on component mount
  if (invitationToken && !processingInvitation) {
    return (
      <div className="container mx-auto py-10">
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Family Invitation</h2>
          <p className="mb-6">You have received an invitation to connect as a family member. Would you like to accept or reject this invitation?</p>
          
          <div className="flex gap-4">
            <Button 
              variant="default" 
              className="flex-1"
              onClick={() => handleInvitation(invitationToken, 'accept')}
              disabled={processingInvitation}
            >
              Accept
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => handleInvitation(invitationToken, 'reject')}
              disabled={processingInvitation}
            >
              Reject
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSearch = async () => {
    if (!searchIC.trim()) {
      toast.error('Please enter an IC number');
      return;
    }

    // Validate Malaysian IC
    if (!validateMalaysianIC(searchIC)) {
      toast.error('Please enter a valid Malaysian IC number');
      return;
    }

    try {
      const user = await searchUser(searchIC);
      if (user) {
        setFoundUser(user);
        setShowConfirmation(true);
        toast.success('User found! Please review the details.');
      } else {
        // Check if non-registered features are disabled
        if (!nonRegisteredFeatures) {
          toast.error('This feature is disabled. Only registered users can be added as family members.');
          return;
        }
        setFoundUser(null);
        setShowForm(true);
        toast.info('User not registered. Please fill in the details.');
      }
    } catch (err) {
      toast.error('Error searching for user');
      console.error('Search error:', err);
      setFoundUser(null);
    }
  };

  const handleConfirmRegistered = () => {
    if (!foundUser) {
      toast.error('User information is missing');
      return;
    }
    
    if (!selectedRelationship) {
      toast.error('Please select a relationship');
      return;
    }

    // If user doesn't have email and non-registered features are disabled
    if (!foundUser.email && !nonRegisteredFeatures) {
      toast.error('This feature is disabled. Only users with email addresses can be added as family members.');
      return;
    }

    // Always send an invitation for registered users
    const invitationData = {
      fullName: foundUser.fullName,
      ic: foundUser.ic,
      email: foundUser.email || `${foundUser.ic}@placeholder.com`, // Use placeholder if no email
      phone: foundUser.phone,
      relationship: selectedRelationship,
    };
    
    toast.info('Sending invitation...');
    inviteMutation.mutate(invitationData);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get the relationship from the form
    const relationshipField = document.querySelector('select[name="relationship"]') as HTMLSelectElement;
    const relationship = relationshipField ? relationshipField.value : '';
    
    if (!relationship) {
      toast.error('Please select a relationship');
      return;
    }
    
    const fullName = formData.get('fullName') as string;
    const ic = formData.get('ic') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    
    // Validate required fields
    if (!fullName || !ic || !phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Validate Malaysian IC
    if (!validateMalaysianIC(ic)) {
      toast.error('Please enter a valid Malaysian IC number');
      return;
    }
    
    // If email is provided, send an invitation
    if (email) {
      const invitationData = {
        fullName,
        ic,
        email,
        phone,
        relationship,
      };
      
      toast.info('Sending invitation...');
      inviteMutation.mutate(invitationData);
    } else {
      // Check if non-registered features are disabled (only for new additions, not edits)
      if (!editingFamily && !nonRegisteredFeatures) {
        toast.error('This feature is disabled. Only users with email addresses can be added as family members.');
        return;
      }
      
      // If no email, add as a non-registered family member
      const familyData = {
        fullName,
        ic,
        relationship,
        phone,
        isRegistered: false,
      };
  
      toast.info(editingFamily ? 'Updating family member...' : 'Adding family member...');
      
      if (editingFamily) {
        updateMutation.mutate({ ...familyData, id: editingFamily.id });
      } else {
        createMutation.mutate(familyData);
      }
    }
  };

  // Add handler for relationship update
  const handleRelationshipUpdate = () => {
    if (!editingRelationship || !newRelationship) {
      toast.error('Please select a relationship');
      return;
    }

    updateRelationshipMutation.mutate({
      id: editingRelationship.id,
      relationship: newRelationship,
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {(error as Error).message}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Family Members</h1>
        <div className="flex gap-2">
          {/* <Button 
            variant="outline" 
            onClick={() => updateRelationshipsMutation.mutate()}
            disabled={updateRelationshipsMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${updateRelationshipsMutation.isPending ? 'animate-spin' : ''}`} />
            Update Relationships
          </Button> */}
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setShowForm(false);
              setFoundUser(null);
              setSearchIC('');
              setShowConfirmation(false);
              setSelectedRelationship('');
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingFamily(null);
                setFoundUser(null);
                setSearchIC('');
                setShowForm(false);
                setShowConfirmation(false);
                setSelectedRelationship('');
              }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Family Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingFamily ? 'Edit' : 'Add'} Family Member</DialogTitle>
              </DialogHeader>
              {editingFamily && editingFamily.isRegistered ? (
                <div className="p-4 text-center">
                  <div className="mb-4 text-amber-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Cannot Edit Registered Family Member</h3>
                  <p className="text-muted-foreground mb-4">
                    This family member has a registered account. Their information is synchronized with their profile and cannot be edited here.
                  </p>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  {!editingFamily && !showForm && !showConfirmation && (
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter IC number"
                          value={searchIC}
                          onChange={(e) => setSearchIC(e.target.value)}
                        />
                        <Button type="button" onClick={handleSearch}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Enter your Malaysian IC number (with or without dashes)
                      </div>
                    </div>
                  )}
                  {showConfirmation && foundUser && (
                    <div className="space-y-4">
                      <div className="rounded-lg border p-4 space-y-3">
                        <div>
                          <Label>Full Name</Label>
                          <div className="font-medium">{foundUser.fullName}</div>
                        </div>
                        <div>
                          <Label>IC Number</Label>
                          <div className="font-medium">{foundUser.ic}</div>
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <div className="font-medium">{foundUser.phone}</div>
                        </div>
                        <div className="pt-2">
                          <Badge variant="success">Registered User</Badge>
                        </div>
                      </div>
                      
                      {foundUser.email && (
                        <Alert className="bg-blue-50 border-blue-200">
                          <AlertDescription>
                            This user has an email address. An invitation will be sent to them to accept or reject the family connection.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {!foundUser.email && !nonRegisteredFeatures && (
                        <Alert className="bg-red-50 border-red-200">
                          <AlertDescription>
                            This feature is disabled. Only users with email addresses can be added as family members.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="grid gap-2">
                        <Label htmlFor="relationship">Relationship</Label>
                        <Select
                          onValueChange={(value) => setSelectedRelationship(value)}
                          value={selectedRelationship}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            {relationships.map((relationship) => (
                              <SelectItem key={relationship} value={relationship}>
                                {relationship.charAt(0).toUpperCase() + relationship.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => {
                          setShowConfirmation(false);
                          setFoundUser(null);
                          setSearchIC('');
                          setSelectedRelationship('');
                        }}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleConfirmRegistered}
                          disabled={!selectedRelationship || (!foundUser.email && !nonRegisteredFeatures)}
                        >
                          {foundUser.email ? 'Send Invitation' : 'Add as Family Member'}
                        </Button>
                      </div>
                    </div>
                  )}
                  {(showForm || editingFamily) && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="fullName">Full Name</Label>
                          <Input
                            id="fullName"
                            name="fullName"
                            defaultValue={editingFamily?.fullName}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="ic">IC Number</Label>
                          <Input
                            id="ic"
                            name="ic"
                            defaultValue={editingFamily?.ic || searchIC}
                            required
                          />
                          <div className="text-xs text-muted-foreground">
                            Enter your Malaysian IC number (with or without dashes)
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="relationship">Relationship</Label>
                          <Select name="relationship" defaultValue={editingFamily?.relationship}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                              {relationships.map((relationship) => (
                                <SelectItem key={relationship} value={relationship}>
                                  {relationship.charAt(0).toUpperCase() + relationship.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            name="phone"
                            defaultValue={editingFamily?.phone}
                            required
                          />
                        </div>
                        {!editingFamily && (
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email {nonRegisteredFeatures ? '(Optional)' : '(Required)'}</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              required={!nonRegisteredFeatures}
                            />
                            <div className="text-xs text-muted-foreground">
                              {nonRegisteredFeatures 
                                ? 'If provided, an invitation will be sent to this email' 
                                : 'Email is required to send invitation to the user'
                              }
                            </div>
                          </div>
                        )}
                      </div>
                      <Button type="submit" className="w-full">
                        {editingFamily ? 'Update' : 'Add'} Family Member
                      </Button>
                    </form>
                  )}
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {pendingInvitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Pending Invitations</h2>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>IC Number</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.inviteeFullName}</TableCell>
                    <TableCell>{invitation.inviteeIC}</TableCell>
                    <TableCell>{invitation.relationship}</TableCell>
                    <TableCell>{invitation.inviteePhone}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        <Clock className="h-3 w-3 mr-1" /> Pending
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(invitation.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Confirmed Family Members</h2>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>IC Number</TableHead>
              <TableHead>Relationship</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {families.map((family: Family) => (
              <TableRow key={family.id}>
                <TableCell>{family.fullName}</TableCell>
                <TableCell>{family.ic}</TableCell>
                <TableCell>{family.relationship}</TableCell>
                <TableCell>{family.phone}</TableCell>
                <TableCell>
                  <Badge variant={family.isRegistered ? "success" : "secondary"}>
                    {family.isRegistered ? 'Registered' : 'Not Registered'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {/* Single Edit Button - Handles both relationship and full edits */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (family.isRegistered) {
                        // For registered users, open relationship update dialog
                        setEditingRelationship(family);
                        setNewRelationship(family.relationship);
                        setIsRelationshipDialogOpen(true);
                      } else {
                        // For non-registered users, open full edit dialog
                        setEditingFamily(family);
                        setIsOpen(true);
                      }
                    }}
                    title={family.isRegistered ? "Update relationship" : "Edit family member"}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteMutation.mutate(family.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Relationship Update Dialog */}
      <Dialog open={isRelationshipDialogOpen} onOpenChange={(open) => {
        setIsRelationshipDialogOpen(open);
        if (!open) {
          setEditingRelationship(null);
          setNewRelationship('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Family Relationship</DialogTitle>
          </DialogHeader>
          {editingRelationship && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <Label>Family Member</Label>
                  <div className="font-medium">{editingRelationship.fullName}</div>
                </div>
                <div>
                  <Label>IC Number</Label>
                  <div className="font-medium">{editingRelationship.ic}</div>
                </div>
                <div>
                  <Label>Current Relationship</Label>
                  <div className="font-medium capitalize">{editingRelationship.relationship}</div>
                </div>
                {editingRelationship.isRegistered && (
                  <div className="pt-2">
                    <Badge variant="success">Registered User</Badge>
                  </div>
                )}
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription>
                  Updating the relationship will automatically update the relationship for both family members.
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-2">
                <Label htmlFor="newRelationship">New Relationship</Label>
                <Select
                  onValueChange={(value) => setNewRelationship(value)}
                  value={newRelationship}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {relationships.map((relationship) => (
                      <SelectItem key={relationship} value={relationship}>
                        {relationship.charAt(0).toUpperCase() + relationship.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setIsRelationshipDialogOpen(false);
                  setEditingRelationship(null);
                  setNewRelationship('');
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleRelationshipUpdate}
                  disabled={!newRelationship || newRelationship === editingRelationship.relationship || updateRelationshipMutation.isPending}
                >
                  {updateRelationshipMutation.isPending ? 'Updating...' : 'Update Relationship'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FamilyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FamilyPageContent />
    </Suspense>
  );
}