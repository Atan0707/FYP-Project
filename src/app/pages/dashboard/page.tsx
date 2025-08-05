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
import { FiUsers, FiDollarSign, FiHome, FiCalendar, FiPlusCircle } from 'react-icons/fi';
import Link from 'next/link';
import { getDisplayRelationshipName } from '@/lib/relationships';
// import { OnboardingDialog } from '@/components/OnboardingDialog';

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
      <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 lg:p-6">
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <div className="h-6 sm:h-8 w-32 sm:w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="h-16 sm:h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 lg:p-6">
        <Card className="border-red-300 dark:border-red-700">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-red-500 text-base sm:text-lg">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <p className="text-sm sm:text-base">There was an error loading your dashboard data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-4 lg:p-6">
      {/* Onboarding Dialog */}
      {/* <OnboardingDialog /> */}
      
      {/* Welcome Section */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl font-bold leading-tight">
            {greeting}, {data?.user?.fullName || 'User'}!
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Welcome to your WEMSP dashboard. Here&apos;s an overview of your family and assets.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium">Family Members</CardTitle>
            <FiUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{data?.stats?.familyCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total registered family members
            </p>
          </CardContent>
          <CardFooter className="p-2 sm:p-3">
            <Link href="/pages/family" className="w-full">
              <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                <FiPlusCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Add Family Member
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <FiHome className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{data?.stats?.assetsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total registered assets
            </p>
          </CardContent>
          <CardFooter className="p-2 sm:p-3">
            <Link href="/pages/assets" className="w-full">
              <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                <FiPlusCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Add Asset
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium">Total Asset Value</CardTitle>
            <FiDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold break-all">
              {formatCurrency(data?.stats?.totalAssetValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined value of all assets
            </p>
          </CardContent>
          <CardFooter className="p-2 sm:p-3">
            <Progress value={Math.min(data?.stats?.assetsCount || 0, 100)} className="h-2" />
          </CardFooter>
        </Card>
      </div>

      {/* Tabs for Recent Activity */}
      <Tabs defaultValue="family" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="family" className="text-xs sm:text-sm py-2">Recent Family</TabsTrigger>
          <TabsTrigger value="assets" className="text-xs sm:text-sm py-2">Recent Assets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="family" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Recent Family Members</CardTitle>
              <CardDescription className="text-sm">
                The last 5 family members added to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {data?.recentFamily && data.recentFamily.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm">Relationship</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Added On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentFamily.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium text-xs sm:text-sm">{member.fullName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getDisplayRelationshipName(member.relationship)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                            {format(new Date(member.createdAt), 'MMM dd, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
                  <FiUsers className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground mb-3 sm:mb-4" />
                  <p className="text-muted-foreground text-sm sm:text-base">No family members added yet</p>
                  <Link href="/pages/family" className="mt-3 sm:mt-4">
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm">Add Family Member</Button>
                  </Link>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end p-3 sm:p-6 pt-0">
              <Link href="/pages/family">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm">View All</Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="assets" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Recent Assets</CardTitle>
              <CardDescription className="text-sm">
                The last 5 assets added to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {data?.recentAssets && data.recentAssets.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm">Type</TableHead>
                        <TableHead className="text-xs sm:text-sm">Value</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Added On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentAssets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium text-xs sm:text-sm">{asset.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {asset.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm break-all">{formatCurrency(asset.value)}</TableCell>
                          <TableCell className="text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                            {format(new Date(asset.createdAt), 'MMM dd, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
                  <FiHome className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground mb-3 sm:mb-4" />
                  <p className="text-muted-foreground text-sm sm:text-base">No assets added yet</p>
                  <Link href="/pages/assets" className="mt-3 sm:mt-4">
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm">Add Asset</Button>
                  </Link>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end p-3 sm:p-6 pt-0">
              <Link href="/pages/assets">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm">View All</Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-6 pt-0">
          <Link href="/pages/family">
            <Button variant="outline" className="w-full h-20 sm:h-24 flex flex-col gap-1 sm:gap-2 hover:shadow-md transition-all">
              <FiUsers className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Manage Family</span>
            </Button>
          </Link>
          <Link href="/pages/assets">
            <Button variant="outline" className="w-full h-20 sm:h-24 flex flex-col gap-1 sm:gap-2 hover:shadow-md transition-all">
              <FiHome className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Manage Assets</span>
            </Button>
          </Link>
          <Link href="/pages/agreements">
            <Button variant="outline" className="w-full h-20 sm:h-24 flex flex-col gap-1 sm:gap-2 hover:shadow-md transition-all">
              <FiCalendar className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Agreements</span>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
