"use client"

import React, { useState, useEffect } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { Loader2, Upload, User } from "lucide-react"

// Define the form schema
const profileFormSchema = z.object({
  fullName: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  ic: z.string(),
  phone: z.string().min(2, {
    message: "Phone number must be at least 2 digits.",
  }),
  address: z.string().optional(),
  photo: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

const UserProfile = () => {
  const [user, setUser] = useState<ProfileFormValues | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Initialize form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      ic: "",
      phone: "",
      address: "",
      photo: "",
    },
  })

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/user')
        if (response.ok) {
          const userData = await response.json()
          setUser({
            fullName: userData.name,
            email: userData.email,
            ic: userData.ic,
            phone: userData.phone,
            address: userData.address || "",
            photo: userData.avatar,
          })
          
          // Set form values
          form.reset({
            fullName: userData.name,
            email: userData.email,
            ic: userData.ic,
            phone: userData.phone,
            address: userData.address || "",
            photo: userData.avatar,
          })
          
          // Set image preview
          if (userData.avatar && userData.avatar !== '/avatars/default.jpg') {
            setImagePreview(userData.avatar)
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        toast.error("Failed to load user profile")
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [form])

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: data.fullName,
          phone: data.phone,
          address: data.address,
          photo: data.photo,
        }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        if (user) {
          setUser({
            ...user,
            fullName: updatedUser.name,
            phone: updatedUser.phone,
            address: updatedUser.address || "",
            photo: updatedUser.avatar,
          })
        }
        
        toast.success("Profile updated")
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(error instanceof Error ? error.message : "Failed to update profile")
    }
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB")
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file")
      return
    }

    try {
      setUploading(true)
      
      // Create a preview
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string)
          
          // In a real app, you would upload to a server/cloud storage
          // For now, we'll just use the data URL
          form.setValue('photo', event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success("Image uploaded successfully")
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error("Failed to upload image")
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="details">Profile Details</TabsTrigger>
          <TabsTrigger value="photo">Profile Photo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                View and update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Your email" {...field} disabled />
                          </FormControl>
                          <FormDescription>
                            Email cannot be changed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="ic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IC Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Your IC" {...field} disabled />
                          </FormControl>
                          <FormDescription>
                            IC number cannot be changed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Your address" 
                            className="min-h-[100px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full md:w-auto">
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="photo">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
              <CardDescription>
                Update your profile picture
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-6">
              <div className="relative">
                <Avatar className="h-40 w-40">
                  <AvatarImage src={imagePreview || user?.photo || '/avatars/default.jpg'} alt={user?.fullName || 'User'} />
                  <AvatarFallback className="text-4xl">
                    {user?.fullName?.substring(0, 2).toUpperCase() || <User className="h-16 w-16" />}
                  </AvatarFallback>
                </Avatar>
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-center space-y-2 w-full max-w-xs">
                <Label htmlFor="picture" className="w-full">
                  <div className="flex items-center justify-center w-full h-12 px-4 py-2 text-sm font-medium text-center transition-colors border rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload new photo
                  </div>
                  <Input 
                    id="picture" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </Label>
                <p className="text-xs text-muted-foreground text-center">
                  Supported formats: JPEG, PNG, GIF. Max size: 5MB.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => form.handleSubmit(onSubmit)()}
                disabled={uploading}
              >
                Save Photo
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default UserProfile