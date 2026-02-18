'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SettingsContent() {
  const searchParams = useSearchParams()
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    checkCalendarStatus()

    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'google_connected') {
      setMessage({ type: 'success', text: '✅ Google Calendar connected successfully!' })
      setCalendarConnected(true)
    }
    if (error === 'google_auth_denied') {
      setMessage({ type: 'error', text: '❌ Google Calendar access was denied.' })
    }
    if (error === 'no_refresh_token') {
      setMessage({ type: 'error', text: '❌ Could not get refresh token. Try again.' })
    }
    if (error === 'callback_failed') {
      setMessage({ type: 'error', text: '❌ Connection failed. Please try again.' })
    }
  }, [])

  const checkCalendarStatus = async () => {
    try {
      const response = await fetch('/api/settings/calendar-status')
      const data = await response.json()
      setCalendarConnected(data.connected)
    } catch (error) {
      console.error('Failed to check calendar status:', error)
    } finally {
      setLoading(false)
    }
  }

  const disconnectCalendar = async () => {
    try {
      await fetch('/api/settings/calendar-status', { method: 'DELETE' })
      setCalendarConnected(false)
      setMessage({ type: 'success', text: 'Google Calendar disconnected.' })
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Message Banner */}
        {message && (
          <div className={`p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Google Calendar */}
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">📅</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Google Calendar</h2>
                <p className="text-sm text-gray-500">
                  Sync job appointments to your Google Calendar
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              calendarConnected
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {loading ? '...' : calendarConnected ? '✅ Connected' : 'Not connected'}
            </span>
          </div>

          {calendarConnected ? (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-xl p-4 text-sm text-green-800">
                <p className="font-semibold mb-2">✅ Google Calendar is connected!</p>
                <ul className="space-y-1 text-green-700">
                  <li>• Appointments auto-create in your calendar</li>
                  <li>• 24hr and 1hr reminders set automatically</li>
                  <li>• Jobs are colour coded by service type</li>
                  <li>• Cancellations remove calendar events</li>
                </ul>
              </div>
              <button
                onClick={disconnectCalendar}
                className="btn btn-secondary text-sm text-red-600 hover:bg-red-50"
              >
                Disconnect Google Calendar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-semibold mb-2">What you'll get:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>📅 Appointments auto-appear in Google Calendar</li>
                  <li>📱 Syncs to your phone automatically</li>
                  <li>🔔 24hr reminder notifications</li>
                  <li>🎨 Colour coded by service type</li>
                  <li>🗑️ Cancellations remove events automatically</li>
                </ul>
              </div>
              <a
                href="/api/auth/google"
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <span>🔗</span>
                Connect Google Calendar
              </a>
              <p className="text-xs text-gray-400">
                You'll be redirected to Google to grant calendar access.
                We only request calendar read/write permissions.
              </p>
            </div>
          )}
        </div>

        {/* Company Info */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">🏢</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Company Info</h2>
              <p className="text-sm text-gray-500">Used in notifications and invoices</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                className="input"
                placeholder="Your Pool Service Pty Ltd"
                defaultValue={process.env.NEXT_PUBLIC_COMPANY_NAME || ''}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="text"
                className="input"
                placeholder="1300 123 456"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="info@yourpoolservice.com.au"
              />
            </div>
            <p className="text-xs text-gray-400">
              These are currently set via environment variables in your .env file.
              (COMPANY_NAME, COMPANY_PHONE, COMPANY_EMAIL)
            </p>
          </div>
        </div>

        {/* System Info */}
        <div className="card bg-gray-50">
          <h2 className="text-lg font-bold text-gray-700 mb-3">System Info</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Phase</span>
              <span className="font-medium">4 (Google Calendar)</span>
            </div>
            <div className="flex justify-between">
              <span>Database</span>
              <span className="font-medium text-green-600">✅ Connected</span>
            </div>
            <div className="flex justify-between">
              <span>Google Calendar</span>
              <span className={`font-medium ${calendarConnected ? 'text-green-600' : 'text-gray-400'}`}>
                {calendarConnected ? '✅ Connected' : '⬜ Not connected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>SMS (Twilio)</span>
              <span className="text-gray-400">⬜ Phase 5</span>
            </div>
            <div className="flex justify-between">
              <span>Email (Resend)</span>
              <span className="text-gray-400">⬜ Phase 5</span>
            </div>
            <div className="flex justify-between">
              <span>MYOB</span>
              <span className="text-gray-400">⬜ Phase 5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  )
}