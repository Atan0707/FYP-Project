'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function logout() {
  // Delete the session cookie
  (await cookies()).delete('session');
  
  // Redirect to login page
  redirect('/pages/login');
} 