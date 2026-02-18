import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  try {
    const url = getAuthUrl()
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('Error generating auth URL:', error)
    return NextResponse.json({ error: 'Failed to start Google auth' }, { status: 500 })
  }
}
