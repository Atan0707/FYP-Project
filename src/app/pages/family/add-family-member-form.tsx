'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  ic: z.string().min(1, 'IC number is required'),
  relationship: z.string().min(1, 'Relationship is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface AddFamilyMemberFormProps {
  onClose: () => void;
}

export function AddFamilyMemberForm({ onClose }: AddFamilyMemberFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<{ fullName: string; email: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ic: '',
      relationship: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      
      // First, check if the user exists
      const checkResponse = await fetch('/api/family/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ic: values.ic }),
      });
      
      const checkData = await checkResponse.json();
      
      if (!checkData.success) {
        toast.error('Error', {
          description: checkData.error || 'Failed to check user existence'
        });
        return;
      }

      // Add family member
      const response = await fetch('/api/family/add-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ic: values.ic,
          relationship: values.relationship,
          isRegistered: checkData.isRegistered,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Success', {
          description: 'Family member added successfully'
        });
        onClose();
      } else {
        toast.error('Error', {
          description: data.error || 'Failed to add family member'
        });
      }
    } catch {
      toast.error('Error', {
        description: 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkUser = async (ic: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/family/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ic }),
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        setFoundUser(data.user);
      } else {
        setFoundUser(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setFoundUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="ic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IC Number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter IC number"
                    onChange={(e) => {
                      field.onChange(e);
                      if (e.target.value.length >= 12) {
                        checkUser(e.target.value);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
                {foundUser && (
                  <p className="text-sm text-green-600">
                    Found: {foundUser.fullName} ({foundUser.email})
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Family Member
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
} 