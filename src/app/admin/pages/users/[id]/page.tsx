"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ArrowLeft, Mail, Phone, MapPin, Calendar, User, Users, DollarSign } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UserDetails {
  user: {
    id: string
    email: string
    fullName: string
    ic: string
    phone: string
    address?: string
    photo?: string
    createdAt: string
    updatedAt: string
  }
  familyMembers: Array<{
    id: string
    fullName: string
    ic: string
    relationship: string
    phone: string
    isRegistered: boolean
    relatedUserId?: string
    createdAt: string
    updatedAt: string
  }>
  assets: Array<{
    id: string
    name: string
    type: string
    value: number
    description?: string
    pdfFile?: string
    createdAt: string
    updatedAt: string
  }>
}

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/users/${params.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch user details')
        }
        
        const data = await response.json()
        setUserDetails(data)
      } catch (error) {
        console.error('Error fetching user details:', error)
        toast.error('Failed to load user details')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchUserDetails()
    }
  }, [params.id])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(value)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <p>Loading user details...</p>
        </div>
      </div>
    )
  }

  if (!userDetails) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <p>User not found</p>
        </div>
      </div>
    )
  }

  const { user, familyMembers, assets } = userDetails

  const totalAssetValue = assets.reduce((sum, asset) => sum + asset.value, 0)

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
        <h1 className="text-2xl font-bold">User Details</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.photo || ''} alt={user.fullName} />
              <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user.fullName}</CardTitle>
              <CardDescription>User Profile</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{user.ic}</span>
              </div>
              <div className="flex items-center">
                <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{user.phone}</span>
              </div>
              {user.address && (
                <div className="flex items-start">
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-1" />
                  <span>{user.address}</span>
                </div>
              )}
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Joined {format(new Date(user.createdAt), 'PPP')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Overview of user's data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-secondary/50 p-4 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">Family Members</div>
                <div className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-primary" />
                  <div className="text-2xl font-bold">{familyMembers.length}</div>
                </div>
              </div>
              <div className="bg-secondary/50 p-4 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">Assets</div>
                <div className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-primary" />
                  <div className="text-2xl font-bold">{assets.length}</div>
                </div>
              </div>
              <div className="bg-secondary/50 p-4 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">Total Asset Value</div>
                <div className="text-2xl font-bold">{formatCurrency(totalAssetValue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="family" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="family">Family Members</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>
        <TabsContent value="family">
          <Card>
            <CardHeader>
              <CardTitle>Family Members</CardTitle>
              <CardDescription>
                List of family members added by this user
              </CardDescription>
            </CardHeader>
            <CardContent>
              {familyMembers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No family members found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>IC</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {familyMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.fullName}</TableCell>
                        <TableCell>{member.ic}</TableCell>
                        <TableCell>{member.relationship}</TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell>
                          {member.isRegistered ? (
                            <Badge variant="success">Registered</Badge>
                          ) : (
                            <Badge variant="secondary">Not Registered</Badge>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(member.createdAt), 'PPP')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle>Assets</CardTitle>
              <CardDescription>
                List of assets owned by this user
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assets.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No assets found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Added On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>{asset.type}</TableCell>
                        <TableCell>{formatCurrency(asset.value)}</TableCell>
                        <TableCell>{asset.description || '-'}</TableCell>
                        <TableCell>{format(new Date(asset.createdAt), 'PPP')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 