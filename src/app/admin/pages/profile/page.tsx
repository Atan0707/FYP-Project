"use client"

import React, { useState, useEffect } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { Loader2, User, CheckCircle2, KeyRound, Shield, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

// Define the form schema
const profileFormSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // If newPassword is provided, confirmPassword must match
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // If newPassword is provided, currentPassword must also be provided
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required to change password",
  path: ["currentPassword"],
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface AdminData {
  id: string
  username: string
  createdAt: string
  updatedAt: string
}

const AdminProfile = () => {
  const [admin, setAdmin] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPasswordFields, setShowPasswordFields] = useState(false)

  // Initialize form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  // Fetch admin data
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/profile')
        if (response.ok) {
          const data = await response.json()
          setAdmin(data.admin)
          
          // Set form values
          form.reset({
            username: data.admin.username,
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          })
        } else {
          toast.error("Failed to load admin profile", {
            description: "Could not retrieve your profile information. Please try again later.",
            duration: 5000,
          })
        }
      } catch (error) {
        console.error('Error fetching admin:', error)
        toast.error("Failed to load admin profile", {
          description: "Could not retrieve your profile information. Please try again later.",
          duration: 5000,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAdmin()
  }, [form])

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSubmitting(true)
      
      // Prepare request body
      const requestBody: {
        username: string;
        currentPassword?: string;
        newPassword?: string;
      } = {
        username: data.username,
      }

      // Only include password fields if changing password
      if (data.newPassword) {
        requestBody.currentPassword = data.currentPassword
        requestBody.newPassword = data.newPassword
      }

      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const result = await response.json()
        setAdmin(result.admin)
        
        // Reset password fields
        form.setValue('currentPassword', '')
        form.setValue('newPassword', '')
        form.setValue('confirmPassword', '')
        setShowPasswordFields(false)
        
        toast.success("Profile updated successfully", {
          description: result.message || "Your profile information has been saved.",
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          duration: 4000,
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error("Failed to update profile", {
        description: error instanceof Error ? error.message : "Please try again later.",
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading admin profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6">
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Admin Profile</h1>
        <p className="text-muted-foreground">Manage your administrator account settings</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <div className="lg:col-span-1">
          <Card className="shadow-lg border border-neutral-200">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-neutral-200">
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary" />
                Admin Information
              </CardTitle>
              <CardDescription>
                Your administrator account details
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                  <AvatarImage src="" alt={admin?.username || 'Admin'} className="object-cover" />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {admin?.username ? getInitials(admin.username) : <Shield className="h-8 w-8" />}
                  </AvatarFallback>
                </Avatar>
                
                                 <div className="text-center space-y-2">
                   <h3 className="text-xl font-semibold">{admin?.username}</h3>
                   <Badge 
                     variant={admin?.username === 'admin' ? "default" : "secondary"} 
                     className="flex items-center"
                   >
                     <Shield className="h-3 w-3 mr-1" />
                     {admin?.username === 'admin' ? 'Root Administrator' : 'Administrator'}
                   </Badge>
                 </div>
                
                <Separator />
                
                <div className="w-full space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Account ID:</span>
                    <span className="font-mono text-xs">{admin?.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{admin?.createdAt ? format(new Date(admin.createdAt), 'MMM dd, yyyy') : 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span>{admin?.updatedAt ? format(new Date(admin.updatedAt), 'MMM dd, yyyy') : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border border-neutral-200">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-neutral-200">
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2 text-primary" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Update your username and password
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                     {/* Username Field */}
                   <FormField
                     control={form.control}
                     name="username"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel className="flex items-center">
                           <User className="h-4 w-4 mr-2 text-muted-foreground" />
                           Username
                         </FormLabel>
                         <FormControl>
                           <Input 
                             placeholder="Enter your username" 
                             {...field} 
                             className="focus-visible:ring-primary" 
                             disabled={admin?.username === 'admin'}
                           />
                         </FormControl>
                         <FormDescription>
                           {admin?.username === 'admin' 
                             ? "The root admin username cannot be changed for security reasons"
                             : "This is your unique administrator username"
                           }
                         </FormDescription>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                  <Separator />

                  {/* Password Change Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium">Change Password</h3>
                        <p className="text-sm text-muted-foreground">
                          Update your account password for security
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPasswordFields(!showPasswordFields)}
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        {showPasswordFields ? 'Cancel' : 'Change Password'}
                      </Button>
                    </div>

                    {showPasswordFields && (
                      <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                        <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">You will need to log in again after changing your password</span>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Enter your current password" 
                                  {...field} 
                                  className="focus-visible:ring-primary" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Enter your new password" 
                                  {...field} 
                                  className="focus-visible:ring-primary" 
                                />
                              </FormControl>
                              <FormDescription>
                                Choose a strong password with at least 8 characters
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Confirm your new password" 
                                  {...field} 
                                  className="focus-visible:ring-primary" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-w-[120px]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Update Profile
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AdminProfile
