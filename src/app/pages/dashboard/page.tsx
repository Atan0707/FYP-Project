'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { FiUsers, FiDollarSign, FiHome, FiCalendar, FiActivity, FiPlusCircle } from 'react-icons/fi';
import Link from 'next/link';

// Types
interface DashboardData {
  user: {
    fullName: string;
    email: string;
  };
  stats: {
    familyCount: number;
    assetsCount: number;
    totalAssetValue: number;
  };
  recentFamily: {
    id: string;
    fullName: string;
    relationship: string;
    createdAt: string;
  }[];
  recentAssets: {
    id: string;
    name: string;
    type: string;
    value: number;
    createdAt: string;
  }[];
}

// API function
const fetchDashboardData = async (): Promise<DashboardData> => {
  const response = await fetch('/api/dashboard');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  return response.json();
};

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
  }).format(value);
};

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
  });

  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Card>
          <CardHeader>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Card className="border-red-300 dark:border-red-700">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was an error loading your dashboard data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Welcome Section */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {greeting}, {data?.user?.fullName || 'User'}!
          </CardTitle>
          <CardDescription>
            Welcome to your i-FAMS dashboard. Here's an overview of your family and assets.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Family Members</CardTitle>
            <FiUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.familyCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total registered family members
            </p>
          </CardContent>
          <CardFooter className="p-2">
            <Link href="/pages/family" className="w-full">
              <Button variant="outline" size="sm" className="w-full">
                <FiPlusCircle className="mr-2 h-4 w-4" />
                Add Family Member
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <FiHome className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.assetsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total registered assets
            </p>
          </CardContent>
          <CardFooter className="p-2">
            <Link href="/pages/assets" className="w-full">
              <Button variant="outline" size="sm" className="w-full">
                <FiPlusCircle className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Asset Value</CardTitle>
            <FiDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.stats?.totalAssetValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined value of all assets
            </p>
          </CardContent>
          <CardFooter className="p-2">
            <Progress value={Math.min(data?.stats?.assetsCount || 0, 100)} className="h-2" />
          </CardFooter>
        </Card>
      </div>

      {/* Tabs for Recent Activity */}
      <Tabs defaultValue="family" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="family">Recent Family</TabsTrigger>
          <TabsTrigger value="assets">Recent Assets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="family" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Family Members</CardTitle>
              <CardDescription>
                The last 5 family members added to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.recentFamily && data.recentFamily.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Added On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentFamily.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.fullName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {member.relationship}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(member.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FiUsers className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No family members added yet</p>
                  <Link href="/pages/family" className="mt-4">
                    <Button variant="outline">Add Family Member</Button>
                  </Link>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Link href="/pages/family">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="assets" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Assets</CardTitle>
              <CardDescription>
                The last 5 assets added to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.recentAssets && data.recentAssets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Added On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {asset.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(asset.value)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(asset.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FiHome className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No assets added yet</p>
                  <Link href="/pages/assets" className="mt-4">
                    <Button variant="outline">Add Asset</Button>
                  </Link>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Link href="/pages/assets">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/pages/family">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
              <FiUsers className="h-6 w-6" />
              <span>Manage Family</span>
            </Button>
          </Link>
          <Link href="/pages/assets">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
              <FiHome className="h-6 w-6" />
              <span>Manage Assets</span>
            </Button>
          </Link>
          <Link href="/pages/agreements">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
              <FiCalendar className="h-6 w-6" />
              <span>Agreements</span>
            </Button>
          </Link>
          <Link href="/pages/settings">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
              <FiActivity className="h-6 w-6" />
              <span>Settings</span>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
