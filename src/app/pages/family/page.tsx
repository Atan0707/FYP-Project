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
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';

interface Family {
  id: string;
  fullName: string;
  ic: string;
  relationship: string;
  phone: string;
  occupation: string;
  income: number;
}

export default function FamilyPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const familyData = {
      fullName: formData.get('fullName') as string,
      ic: formData.get('ic') as string,
      relationship: formData.get('relationship') as string,
      phone: formData.get('phone') as string,
      occupation: formData.get('occupation') as string,
      income: parseFloat(formData.get('income') as string),
    };

    try {
      const response = await fetch('/api/family', {
        method: editingFamily ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingFamily ? { ...familyData, id: editingFamily.id } : familyData),
      });

      if (response.ok) {
        toast.success(`Family member ${editingFamily ? 'updated' : 'added'} successfully`);
        setIsOpen(false);
        // Refresh family list
        fetchFamilies();
      }
    } catch (error) {
      toast.error('Something went wrong: '+ error);
    }
  };

  const fetchFamilies = async () => {
    try {
      const response = await fetch('/api/family');
      const data = await response.json();
      setFamilies(data);
    } catch (error) {
      console.error('Error fetching families:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/family/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Family member deleted successfully');
        fetchFamilies();
      }
    } catch (error) {
      toast.error('Failed to delete family member: '+ error);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Family Members</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingFamily(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Family Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFamily ? 'Edit' : 'Add'} Family Member</DialogTitle>
            </DialogHeader>
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
                    defaultValue={editingFamily?.ic}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input
                    id="relationship"
                    name="relationship"
                    defaultValue={editingFamily?.relationship}
                    required
                  />
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {families.map((family) => (
              <TableRow key={family.id}>
                <TableCell>{family.fullName}</TableCell>
                <TableCell>{family.ic}</TableCell>
                <TableCell>{family.relationship}</TableCell>
                <TableCell>{family.phone}</TableCell>
                <TableCell>{family.occupation}</TableCell>
                <TableCell>RM {family.income.toFixed(2)}</TableCell>
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
                    onClick={() => handleDelete(family.id)}
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