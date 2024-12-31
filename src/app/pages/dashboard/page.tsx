'use client';

import { Button } from "@/components/ui/button";
import { logout } from "../_lib/auth-actions";
import { getCurrentUser, checkSession } from "@/app/server/actions";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { useEffect, useState } from "react";
import { User } from "../_lib/definitions";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initializeData() {
      const session = await checkSession();
      if (!session) {
        alert('You are not logged in');
        redirect('/pages/login');
      }
      
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    initializeData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">Error loading user data</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Welcome, {user.fullName}!</h1>
        <Button
          variant="destructive"
          onClick={() => logout()}
        >
          Log Out
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="font-medium text-gray-600">Full Name</label>
              <p className="text-lg">{user.fullName}</p>
            </div>
            <div>
              <label className="font-medium text-gray-600">Email</label>
              <p className="text-lg">{user.email}</p>
            </div>
            <div>
              <label className="font-medium text-gray-600">IC Number</label>
              <p className="text-lg">{user.ic}</p>
            </div>
            <div>
              <label className="font-medium text-gray-600">Phone Number</label>
              <p className="text-lg">{user.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}