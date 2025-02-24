'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddFamilyMemberForm } from './add-family-member-form';
import { FamilyMembersList } from './family-members-list';
import { Plus } from 'lucide-react';

const Family = () => {
  const [isAddingMember, setIsAddingMember] = useState(false);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Family Members</h1>
          <p className="text-muted-foreground">
            Manage your family members and their relationships
          </p>
        </div>
        <Button onClick={() => setIsAddingMember(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Family Member
        </Button>
      </div>

      {isAddingMember && (
        <Card>
          <CardHeader>
            <CardTitle>Add Family Member</CardTitle>
            <CardDescription>
              Enter the IC number of your family member. If they are registered, their details will be shown automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddFamilyMemberForm onClose={() => setIsAddingMember(false)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Family Members</CardTitle>
          <CardDescription>
            List of all your registered and pending family members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FamilyMembersList />
        </CardContent>
      </Card>
    </div>
  );
};

export default Family;