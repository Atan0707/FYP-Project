'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Pencil, Trash2, UserPlus } from 'lucide-react'

interface Admin {
  id: string
  username: string
  createdAt: string
  updatedAt: string
}

export default function AdminManagement() {
  const router = useRouter()
  const { toast } = useToast()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Check if current admin is superadmin
  useEffect(() => {
    async function checkSuperAdminStatus() {
      try {
        const response = await fetch('/api/admin/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.admin && data.admin.username === 'admin') {
            setIsSuperAdmin(true);
          } else {
            // Not a superadmin, redirect to dashboard
            toast({
              title: 'Access Denied',
              description: 'You do not have permission to access this page',
              variant: 'destructive',
            });
            router.push('/admin/pages/dashboard');
          }
        } else {
          // Not authenticated, redirect to login
          router.push('/admin/login');
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin permissions');
      }
    }
    
    checkSuperAdminStatus();
  }, [router, toast]);

  // Fetch admins on component mount
  useEffect(() => {
    fetchAdmins()
  }, [])

  async function fetchAdmins() {
    setLoading(true)
    setError(null)
    
    try {
      const result = await getAdmins()
      
      if (result.error) {
        setError(result.error)
        if (result.error === 'Unauthorized access') {
          // Redirect to admin login if unauthorized
          router.push('/admin/login')
        }
      } else if (result.admins) {
        // Convert Date objects to strings if needed
        const formattedAdmins = result.admins.map((admin: { id: string; username: string; createdAt: Date | string; updatedAt: Date | string }) => ({
          ...admin,
          createdAt: admin.createdAt.toString(),
          updatedAt: admin.updatedAt.toString()
        }));
        setAdmins(formattedAdmins)
      }
    } catch (err) {
      setError('Failed to fetch admins')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      const result = await createAdmin(formData)
      
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Success',
          description: 'Admin created successfully',
        })
        setIsCreateDialogOpen(false)
        form.reset()
        fetchAdmins()
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create admin',
        variant: 'destructive',
      })
      console.error(err)
    }
  }

  async function handleUpdateAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      const result = await updateAdmin(formData)
      
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Success',
          description: 'Admin updated successfully',
        })
        setIsEditDialogOpen(false)
        form.reset()
        fetchAdmins()
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update admin',
        variant: 'destructive',
      })
      console.error(err)
    }
  }

  async function handleDeleteAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      const result = await deleteAdmin(formData)
      
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Success',
          description: 'Admin deleted successfully',
        })
        setIsDeleteDialogOpen(false)
        fetchAdmins()
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete admin',
        variant: 'destructive',
      })
      console.error(err)
    }
  }

  // Format date for display
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // If not superadmin and still loading, show loading
  if (!isSuperAdmin && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Admin Management</CardTitle>
              <CardDescription>Manage administrator accounts</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Admin</DialogTitle>
                  <DialogDescription>
                    Add a new administrator account to the system.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAdmin}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" name="username" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" name="password" type="password" required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Admin</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>List of administrator accounts</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Updated At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.username}</TableCell>
                  <TableCell>{formatDate(admin.createdAt)}</TableCell>
                  <TableCell>{formatDate(admin.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setCurrentAdmin(admin)
                          setIsEditDialogOpen(true)
                        }}
                        disabled={admin.username === 'admin'}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          setCurrentAdmin(admin)
                          setIsDeleteDialogOpen(true)
                        }}
                        disabled={admin.username === 'admin'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {admins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    No administrators found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>
              Update administrator account details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateAdmin}>
            <div className="grid gap-4 py-4">
              <input type="hidden" name="id" value={currentAdmin?.id || ''} />
              <div className="grid gap-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input 
                  id="edit-username" 
                  name="username" 
                  defaultValue={currentAdmin?.username || ''}
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-password">
                  Password <span className="text-sm text-muted-foreground">(Leave blank to keep current)</span>
                </Label>
                <Input id="edit-password" name="password" type="password" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Admin</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Admin Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Admin</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this administrator account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeleteAdmin}>
            <input type="hidden" name="id" value={currentAdmin?.id || ''} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">Delete Admin</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
