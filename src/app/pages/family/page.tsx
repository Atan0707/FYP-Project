'use client';

import { useState } from 'react';
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
import { PlusCircle, Pencil, Trash2, Search } from 'lucide-react';
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

// Get available relationships
const relationships = getAvailableRelationships();

interface Family {
  id: string;
  fullName: string;
  ic: string;
  relationship: string;
  phone: string;
  occupation: string;
  income: number;
  isRegistered: boolean;
}

interface User {
  id: string;
  fullName: string;
  ic: string;
  phone: string;
}

// API functions
const fetchFamilies = async () => {
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

export default function FamilyPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [searchIC, setSearchIC] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<string>('');
  const queryClient = useQueryClient();

  // Queries
  const { data: families = [], isLoading, error } = useQuery({
    queryKey: ['families'],
    queryFn: fetchFamilies,
  });

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
      // Still refresh the data to be sure
      await queryClient.invalidateQueries({ queryKey: ['families'] });
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

  const handleSearch = async () => {
    if (!searchIC.trim()) {
      toast.error('Please enter an IC number');
      return;
    }

    try {
      const user = await searchUser(searchIC);
      if (user) {
        setFoundUser(user);
        setShowConfirmation(true);
        toast.success('User found! Please review the details.');
      } else {
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

    const familyData = {
      fullName: foundUser.fullName,
      ic: foundUser.ic,
      phone: foundUser.phone,
      relationship: selectedRelationship,
      occupation: '',
      income: 0,
      isRegistered: true,
    };
    
    toast.info('Adding family member...');
    createMutation.mutate(familyData);
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
    const occupation = formData.get('occupation') as string;
    const incomeStr = formData.get('income') as string;
    
    // Validate required fields
    if (!fullName || !ic || !phone || !occupation || !incomeStr) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const income = parseFloat(incomeStr);
    if (isNaN(income)) {
      toast.error('Income must be a valid number');
      return;
    }
    
    const familyData = {
      fullName,
      ic,
      relationship,
      phone,
      occupation,
      income,
      isRegistered: false,
    };

    toast.info(editingFamily ? 'Updating family member...' : 'Adding family member...');
    
    if (editingFamily) {
      updateMutation.mutate({ ...familyData, id: editingFamily.id });
    } else {
      createMutation.mutate(familyData);
    }
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
            {!editingFamily && !showForm && !showConfirmation && (
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Enter IC number"
                  value={searchIC}
                  onChange={(e) => setSearchIC(e.target.value)}
                />
                <Button type="button" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
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
                    disabled={!selectedRelationship}
                  >
                    Add as Family Member
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
                  <div className="grid gap-2">
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      name="occupation"
                      defaultValue={editingFamily?.occupation}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="income">Monthly Income</Label>
                    <Input
                      id="income"
                      name="income"
                      type="number"
                      defaultValue={editingFamily?.income}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingFamily ? 'Update' : 'Add'} Family Member
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>IC Number</TableHead>
              <TableHead>Relationship</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>Monthly Income</TableHead>
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
                <TableCell>{family.occupation}</TableCell>
                <TableCell>RM {family.income.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={family.isRegistered ? "success" : "secondary"}>
                    {family.isRegistered ? 'Registered' : 'Not Registered'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditingFamily(family);
                      setIsOpen(true);
                    }}
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
    </div>
  );
}