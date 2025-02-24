'use server'

import { cookies } from 'next/headers'

export async function logout() {
  // Remove the userId cookie
  const cookieStore = await cookies()
  cookieStore.delete('userId')
  return { success: true }
} 