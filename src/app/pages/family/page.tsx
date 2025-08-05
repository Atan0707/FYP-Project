'use client';

import { useState, Suspense, useMemo } from 'react';
// Removed unused table components - now using cards for better mobile experience
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
import { 
  PlusCircle, 
  Pencil, 
  Trash2, 
  Search, 
  Clock, 
  Users, 
  // UserCheck, 
  // UserX,
  Mail,
  Phone,
  Calendar,
  Filter,
  MoreHorizontal,
  // Download - removed as not currently used
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAvailableRelationships, getDisplayRelationshipName } from '@/lib/relationships';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

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
  email: string;
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
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  
  // Check if there's an invitation token in the URL
  const invitationToken = searchParams.get('token');

  // Queries
  const { data, isLoading, error } = useQuery({
    queryKey: ['families'],
    queryFn: fetchFamilies,
  });

  // Memoize the raw data to prevent unnecessary re-renders
  const families = useMemo(() => data?.families || [], [data?.families]);
  const pendingInvitations = useMemo(() => data?.pendingInvitations || [], [data?.pendingInvitations]);

  // Filter and search functionality
  const filteredFamilies = useMemo(() => {
    let filtered = [...families];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(family => 
        family.fullName.toLowerCase().includes(term) ||
        family.ic.toLowerCase().includes(term) ||
        family.phone.toLowerCase().includes(term) ||
        getDisplayRelationshipName(family.relationship).toLowerCase().includes(term)
      );
    }
    
    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(family => {
        if (filterStatus === 'registered') return family.isRegistered;
        if (filterStatus === 'unregistered') return !family.isRegistered;
        return true;
      });
    }
    
    return filtered;
  }, [families, searchTerm, filterStatus]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalFamily = families.length;
    const registeredCount = families.filter(f => f.isRegistered).length;
    const unregisteredCount = families.filter(f => !f.isRegistered).length;
    const pendingCount = pendingInvitations.length;
    
    return {
      total: totalFamily,
      registered: registeredCount,
      unregistered: unregisteredCount,
      pending: pendingCount
    };
  }, [families, pendingInvitations]);

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

    // For registered users, always allow them to be added (they have accounts in the system)
    // The nonRegisteredFeatures flag only applies to unregistered users
    const invitationData = {
      fullName: foundUser.fullName,
      ic: foundUser.ic,
      email: foundUser.email || `${foundUser.ic}@placeholder.com`, // Use placeholder if no email for some reason
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
    return (
      <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 lg:p-6">
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <div className="h-6 sm:h-8 w-32 sm:w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="h-16 sm:h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 lg:p-6">
        <Card className="border-red-300 dark:border-red-700">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-red-500 text-base sm:text-lg">Error Loading Family Data</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <p className="text-sm sm:text-base">There was an error loading your family data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-4 lg:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Family Members
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your family members and their relationships
          </p>
        </div>
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
            <Button 
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                setEditingFamily(null);
                setFoundUser(null);
                setSearchIC('');
                setShowForm(false);
                setShowConfirmation(false);
                setSelectedRelationship('');
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Family Member
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium">Total Family</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Family members connected
            </p>
          </CardContent>
        </Card>
        
        {/* Temporarily commented out - not needed for now */}
        {/* <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium">Registered</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.registered}</div>
            <p className="text-xs text-muted-foreground">
              Members with accounts
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium">Unregistered</CardTitle>
            <UserX className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.unregistered}</div>
            <p className="text-xs text-muted-foreground">
              Members without accounts
            </p>
          </CardContent>
        </Card> */}
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Invitations sent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="confirmed" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-2 h-auto">
            <TabsTrigger value="confirmed" className="text-xs sm:text-sm py-2">
              Confirmed ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm py-2">
              Pending ({stats.pending})
            </TabsTrigger>
          </TabsList>
          
          {/* Search and Filter for Confirmed tab */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search family members..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterStatus(null)}>
                  All Members
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('registered')}>
                  Registered Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('unregistered')}>
                  Unregistered Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Dialog Content */}
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
          <DialogContent className="sm:max-w-md max-w-[95vw]">
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
                      
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertDescription>
                          {foundUser.email 
                            ? "This user has an email address. An invitation will be sent to them to accept or reject the family connection."
                            : "This registered user will receive an invitation to accept or reject the family connection."
                          }
                        </AlertDescription>
                      </Alert>
                      
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
                                {getDisplayRelationshipName(relationship)}
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
                          disabled={!selectedRelationship}
                        >
                          Send Invitation
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
                                  {getDisplayRelationshipName(relationship)}
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

        {/* Tab Content */}
        <TabsContent value="confirmed">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Confirmed Family Members</CardTitle>
              <CardDescription className="text-sm">
                {filteredFamilies.length} of {families.length} family members
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {filteredFamilies.length > 0 ? (
                <div className="space-y-4">
                  {filteredFamilies.map((family: Family) => (
                    <Card key={family.id} className="hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                              <h3 className="font-semibold text-lg">{family.fullName}</h3>
                              <Badge variant={family.isRegistered ? "default" : "secondary"} className="w-fit">
                                {family.isRegistered ? 'Registered' : 'Unregistered'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 00-2-2v2m0 2v2" />
                                </svg>
                                <span className="font-mono">{family.ic}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>{family.phone}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                                <Users className="h-4 w-4" />
                                <span>{getDisplayRelationshipName(family.relationship)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (family.isRegistered) {
                                      setEditingRelationship(family);
                                      setNewRelationship(family.relationship);
                                      setIsRelationshipDialogOpen(true);
                                    } else {
                                      setEditingFamily(family);
                                      setIsOpen(true);
                                    }
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  {family.isRegistered ? "Update Relationship" : "Edit Member"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => deleteMutation.mutate(family.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No family members found</h3>
                  <p className="text-muted-foreground mt-2 max-w-md">
                    {searchTerm || filterStatus
                      ? "No family members match your current filters. Try adjusting your search criteria."
                      : "You haven't added any family members yet. Click the 'Add Family Member' button to get started."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Pending Invitations</CardTitle>
              <CardDescription className="text-sm">
                {pendingInvitations.length} invitation{pendingInvitations.length !== 1 ? 's' : ''} awaiting response
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {pendingInvitations.length > 0 ? (
                <div className="space-y-4">
                  {pendingInvitations.map((invitation) => (
                    <Card key={invitation.id} className="hover:shadow-md transition-shadow border border-yellow-200 bg-yellow-50/50 dark:border-yellow-700 dark:bg-yellow-950/20">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                              <h3 className="font-semibold text-lg">{invitation.inviteeFullName}</h3>
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 w-fit">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 00-2-2v2m0 2v2" />
                                </svg>
                                <span className="font-mono">{invitation.inviteeIC}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>{invitation.inviteePhone}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>{getDisplayRelationshipName(invitation.relationship)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>Sent {format(new Date(invitation.createdAt), 'MMM d, yyyy')}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                              disabled={cancelInvitationMutation.isPending}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No pending invitations</h3>
                  <p className="text-muted-foreground mt-2 max-w-md">
                    You don&apos;t have any pending invitations. All invited family members have responded or you haven&apos;t sent any invitations yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  <div className="font-medium">{getDisplayRelationshipName(editingRelationship.relationship)}</div>
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
                        {getDisplayRelationshipName(relationship)}
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