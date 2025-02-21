import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Format the response to match your User type
    return NextResponse.json({
      name: user.fullName || 'Anonymous',
      email: user.email,
      avatar: '/avatars/default.jpg' // Using default avatar since your DB doesn't have image field
    })

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 