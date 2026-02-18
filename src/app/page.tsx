import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-primary-600 mb-4">
            Pool Service System
          </h1>
          <p className="text-xl text-gray-600">
            Job management for pool, spa, solar & gas services
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/dashboard" className="card hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                Dashboard
              </h2>
              <span className="text-3xl">📊</span>
            </div>
            <p className="text-gray-600">View and manage all jobs</p>
          </Link>

          <Link href="/intake/demo" className="card hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                Customer Intake
              </h2>
              <span className="text-3xl">📝</span>
            </div>
            <p className="text-gray-600">Customer service request form</p>
          </Link>
        </div>

        <div className="mt-12 card bg-primary-50 border-primary-200">
          <h3 className="text-lg font-semibold text-primary-900 mb-2">
            🚀 Phase 1 Complete
          </h3>
          <ul className="text-primary-700 space-y-1 text-sm">
            <li>✅ Next.js + TypeScript + Tailwind</li>
            <li>✅ PostgreSQL + Prisma</li>
            <li>✅ Redis + BullMQ</li>
            <li>✅ Background workers</li>
            <li>✅ Job management</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
