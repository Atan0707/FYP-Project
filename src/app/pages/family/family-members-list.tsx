'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

interface FamilyMember {
  id: string;
  fullName: string;
  email: string;
  relationship: string;
  isRegistered: boolean;
  pendingIc?: string;
}

export function FamilyMembersList() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/family/members');
      const data = await response.json();
      
      if (data.success) {
        setMembers(data.members);
      } else {
        toast.error('Error', {
          description: data.error || 'Failed to fetch family members'
        });
      }
    } catch {
      toast.error('Error', {
        description: 'An unexpected error occurred while fetching members'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMember = async (id: string) => {
    try {
      const response = await fetch(`/api/family/members/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Success', {
          description: 'Family member removed successfully'
        });
        fetchMembers(); // Refresh the list
      } else {
        toast.error('Error', {
          description: data.error || 'Failed to remove family member'
        });
      }
    } catch {
      toast.error('Error', {
        description: 'An unexpected error occurred while removing member'
      });
    }
  };

  // Fetch members on component mount
  useEffect(() => {
    fetchMembers();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No family members added yet
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Relationship</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.fullName}</TableCell>
              <TableCell className="capitalize">{member.relationship}</TableCell>
              <TableCell>
                {member.isRegistered ? (
                  <span className="text-green-600">Registered</span>
                ) : (
                  <span className="text-yellow-600">Pending</span>
                )}
              </TableCell>
              <TableCell>
                {member.isRegistered ? member.email : member.pendingIc}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => deleteMember(member.id)}
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
} 