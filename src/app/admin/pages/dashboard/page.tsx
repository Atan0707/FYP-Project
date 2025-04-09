'use client'

import React, { useEffect, useState } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import PendingAssetsWidget from './components/PendingAssetsWidget'
import RecentAgreementsWidget from './components/RecentAgreementsWidget'
import { formatDate, formatCurrency, formatStatus } from './utils/formatters'

// Types based on the Prisma schema
type User = {
  id: string
  email: string
  fullName: string
  createdAt: string
}

type PendingAsset = {
  id: string
  name: string
  type: string
  value: number
  status: string
  createdAt: string
  user: {
    id: string
    fullName: string
    email: string
  }
}

type Agreement = {
  id: string
  status: string
  createdAt: string
  distribution: {
    type: string
    asset: {
      name: string
      value: number
    }
  }
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([])
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [recentActivity, setRecentActivity] = useState<Array<{type: string, description: string, date: string}>>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const usersResponse = await fetch('/api/admin/users')
        const usersData = await usersResponse.json()
        setUsers(usersData)

        // Fetch pending assets
        const pendingAssetsResponse = await fetch('/api/admin/pending-assets')
        const pendingAssetsData = await pendingAssetsResponse.json()
        setPendingAssets(pendingAssetsData)

        // Fetch agreements
        const agreementsResponse = await fetch('/api/admin/agreements')
        const agreementsData = await agreementsResponse.json()
        setAgreements(agreementsData)

        // Create recent activity from all data
        const activity = [
          ...usersData.slice(0, 5).map((user: User) => ({
            type: 'User Registration',
            description: `${user.fullName} registered`,
            date: formatDate(user.createdAt)
          })),
          ...pendingAssetsData.slice(0, 5).map((asset: PendingAsset) => ({
            type: 'Asset Submission',
            description: `${asset.user.fullName} submitted ${asset.name}`,
            date: formatDate(asset.createdAt)
          })),
          ...agreementsData.slice(0, 5).map((agreement: Agreement) => ({
            type: 'Agreement Update',
            description: `Agreement for ${agreement.distribution.asset.name} is ${formatStatus(agreement.status)}`,
            date: formatDate(agreement.createdAt)
          }))
        ]
        
        // Sort by date (newest first) and take top 10
        activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setRecentActivity(activity.slice(0, 10))
        
        setLoading(false)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate statistics
  const totalUsers = users.length
  const totalPendingAssets = pendingAssets.filter(asset => asset.status === 'pending').length
  const totalAgreements = agreements.length
  const totalAssetValue = pendingAssets.reduce((sum, asset) => sum + asset.value, 0)

  // Prepare chart data
  const assetTypeData = pendingAssets.reduce((acc: Record<string, number>, asset) => {
    acc[asset.type] = (acc[asset.type] || 0) + 1
    return acc
  }, {})

  const assetTypeChartData = Object.entries(assetTypeData).map(([name, value]) => ({ name, value }))

  const agreementStatusData = agreements.reduce((acc: Record<string, number>, agreement) => {
    acc[agreement.status] = (acc[agreement.status] || 0) + 1
    return acc
  }, {})

  const agreementStatusChartData = Object.entries(agreementStatusData).map(([name, value]) => ({ 
    name: formatStatus(name), 
    value 
  }))

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      
      {loading ? (
        // Loading state
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Stats Cards
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPendingAssets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Agreements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAgreements}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Asset Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAssetValue)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Widgets for pending items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PendingAssetsWidget pendingAssets={pendingAssets} loading={loading} />
        <RecentAgreementsWidget agreements={agreements} loading={loading} />
      </div>

      {/* Tabs for different dashboard sections */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="assets">Asset Analytics</TabsTrigger>
          <TabsTrigger value="agreements">Agreement Analytics</TabsTrigger>
        </TabsList>
        
        {/* Recent Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                The latest actions across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivity.map((activity, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{activity.type}</TableCell>
                        <TableCell>{activity.description}</TableCell>
                        <TableCell>{activity.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-neutral-600 dark:text-neutral-400">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Asset Analytics Tab */}
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle>Asset Distribution by Type</CardTitle>
              <CardDescription>
                Breakdown of assets by their categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : assetTypeChartData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetTypeChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {assetTypeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} assets`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-neutral-600 dark:text-neutral-400">No asset data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Agreement Analytics Tab */}
        <TabsContent value="agreements">
          <Card>
            <CardHeader>
              <CardTitle>Agreement Status Distribution</CardTitle>
              <CardDescription>
                Overview of agreement statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : agreementStatusChartData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={agreementStatusChartData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} agreements`, 'Count']} />
                      <Legend />
                      <Bar dataKey="value" name="Count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-neutral-600 dark:text-neutral-400">No agreement data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminDashboard