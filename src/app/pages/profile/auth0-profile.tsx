'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

export default function Auth0Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserProfile() {
      try {
        setLoading(true);
        const response = await fetch('/api/user');
        
        if (!response.ok) {
          throw new Error('Failed to load user profile');
        }
        
        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        setError('Could not load profile. Please try again later.');
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadUserProfile();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">User Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-48 h-6 bg-gray-200 animate-pulse rounded" />
              <div className="w-64 h-4 bg-gray-200 animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">User Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <p className="text-red-500">{error || 'User profile not available'}</p>
              <a href="/auth/login" className="mt-4 text-primary hover:underline">
                Login again
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-2xl">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-gray-500">{user.email}</p>
            </div>
            
            <div className="w-full pt-6 border-t border-gray-200">
              <h3 className="font-medium mb-2">Account Information</h3>
              <p className="text-sm text-gray-600 mb-4">
                Your account is connected through Auth0 authentication.
              </p>
              
              <div className="flex justify-center mt-6">
                <a 
                  href="/auth/logout" 
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Logout
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 