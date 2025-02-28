'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function adminLogout() {
  // Remove the adminId cookie
  const cookieStore = await cookies()
  cookieStore.delete({
    name: 'adminId',
    path: '/'
  })
  
  // Redirect to login page
  redirect('/admin/login')
} 