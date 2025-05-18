"use client"

import React, { useState, useEffect } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { Loader2, Upload, User, CheckCircle2, Phone, Mail, CreditCard, MapPin } from "lucide-react"

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
  const [isSubmitting, setIsSubmitting] = useState(false)

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
            photo: userData.photo,
          })
          
          // Set form values
          form.reset({
            fullName: userData.name,
            email: userData.email,
            ic: userData.ic,
            phone: userData.phone,
            address: userData.address || "",
            photo: userData.photo,
          })
          
          // Set image preview
          if (userData.photo && !userData.photo.includes('/images/default-avatar.jpg')) {
            setImagePreview(userData.photo)
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        toast.error("Failed to load user profile", {
          description: "Could not retrieve your profile information. Please try again later.",
          duration: 5000,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [form])

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSubmitting(true)
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
            photo: updatedUser.photo,
          })
        }
        
        toast.success("Profile updated successfully", {
          description: "Your profile information has been saved.",
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

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size too large", {
        description: "Please upload an image smaller than 5MB.",
        duration: 5000,
      })
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error("Invalid file type", {
        description: "Please upload a valid image file (JPEG, PNG, GIF).",
        duration: 5000,
      })
      return
    }

    try {
      setUploading(true)
      
      // Create a preview
      const reader = new FileReader()
      reader.onload = async (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string)
          
          // Upload to Google Cloud Storage via our API
          try {
            const response = await fetch('/api/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                image: event.target.result
              }),
            })
            
            if (!response.ok) {
              throw new Error('Failed to upload image')
            }
            
            const data = await response.json()
            
            // Update the form data with the new image URL
            form.setValue('photo', data.url)
            
            toast.success("Image uploaded successfully", {
              description: "Your profile picture has been updated. Don't forget to save your changes.",
              icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
              duration: 4000,
            })
          } catch (error) {
            console.error('Error uploading to GCS:', error)
            toast.error("Failed to upload to cloud storage", {
              description: "Please try again or use a different image.",
              duration: 5000,
            })
          }
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error("Failed to upload image", {
        description: "Please try again or use a different image.",
        duration: 5000,
      })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6">
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">View and manage your personal information</p>
      </div>
      
      <Card className="max-w-4xl mx-auto shadow-lg border border-neutral-200 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-neutral-200">
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2 text-primary" />
            Profile Information
          </CardTitle>
          <CardDescription>
            View and update your personal information
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Profile Photo Section */}
                <div className="flex flex-col items-center space-y-6 md:w-1/3">
                  <div className="relative">
                    <Avatar className="h-40 w-40 border-4 border-white shadow-lg">
                      <AvatarImage 
                        src={imagePreview || user?.photo || '/images/default-avatar.jpg'} 
                        alt={user?.fullName || 'User'} 
                        className="object-cover"
                      />
                      <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                        {user?.fullName?.substring(0, 2).toUpperCase() || <User className="h-16 w-16" />}
                      </AvatarFallback>
                    </Avatar>
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-center space-y-3 w-full">
                    <Label htmlFor="picture" className="w-full">
                      <div className="flex items-center justify-center w-full h-12 px-4 py-2 text-sm font-medium text-center transition-colors border rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground bg-slate-50 hover:bg-slate-100 shadow-sm">
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
                </div>
                
                {/* Profile Details Section */}
                <div className="md:w-2/3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            Full Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} className="focus-visible:ring-primary" />
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
                          <FormLabel className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Your email" {...field} disabled className="bg-slate-50" />
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
                          <FormLabel className="flex items-center">
                            <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                            IC Number
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Your IC" {...field} disabled className="bg-slate-50" />
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
                          <FormLabel className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                            Phone Number
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Your phone number" {...field} className="focus-visible:ring-primary" />
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
                      <FormItem className="mt-6">
                        <FormLabel className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          Address
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Your address" 
                            className="min-h-[100px] focus-visible:ring-primary resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-neutral-100 mt-6">
                <Button 
                  type="submit" 
                  className="w-full md:w-auto transition-all hover:shadow-md"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default UserProfile