import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'google_calendar_connected' },
    })
    return NextResponse.json({ connected: config?.value === 'true' })
  } catch (error) {
    return NextResponse.json({ connected: false })
  }
}

export async function DELETE() {
  try {
    await prisma.systemConfig.deleteMany({
      where: {
        key: { in: ['google_refresh_token', 'google_calendar_connected'] },
      },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
