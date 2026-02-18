'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const jobNumber = searchParams.get('jobNumber')

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-primary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Request Received!</h1>
          {jobNumber && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Your Job Number</p>
              <p className="text-2xl font-bold text-primary-600">{jobNumber}</p>
            </div>
          )}
          <div className="text-left space-y-3 mb-8 text-gray-700">
            <p className="flex items-start gap-2">
              <span className="text-xl">📱</span>
              <span>SMS confirmation sent</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-xl">⏰</span>
              <span>We'll contact you within 2 hours</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-xl">📋</span>
              <span>Keep your job number for reference</span>
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-primary w-full">View Dashboard</Link>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
