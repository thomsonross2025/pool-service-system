import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode } from '@/lib/google-calendar'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_denied`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=no_code`
      )
    }

    const tokens = await getTokensFromCode(code)

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=no_refresh_token`
      )
    }

    await prisma.systemConfig.upsert({
      where: { key: 'google_refresh_token' },
      update: { value: tokens.refresh_token },
      create: { key: 'google_refresh_token', value: tokens.refresh_token },
    })

    await prisma.systemConfig.upsert({
      where: { key: 'google_calendar_connected' },
      update: { value: 'true' },
      create: { key: 'google_calendar_connected', value: 'true' },
    })

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=google_connected`
    )
  } catch (error) {
    console.error('Error in Google callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=callback_failed`
    )
  }
}
