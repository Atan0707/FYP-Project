'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function userLogout() {
  // Remove the adminId cookie
  const cookieStore = await cookies()
  cookieStore.delete('userId', { path: '/' })
  
  // Redirect to login page
  redirect('/login')
} 