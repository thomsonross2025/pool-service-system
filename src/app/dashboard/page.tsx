'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Photo {
  id: string
  url: string
  filename: string | null
}

interface Job {
  id: string
  jobNumber: string
  status: string
  productType: string
  issueDescription: string
  urgency: string
  createdAt: string
  scheduledDate: string | null
  assignedTechnician: string | null
  customer: {
    name: string
    phone: string
    suburb: string
    email: string | null
  }
  photos: Photo[]
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Jobs', color: 'bg-gray-100 text-gray-800' },
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'quoted', label: 'Quoted', color: 'bg-purple-100 text-purple-800' },
  { value: 'waiting_parts', label: 'Waiting Parts', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-green-100 text-green-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-orange-100 text-orange-800' },
  { value: 'complete', label: 'Complete', color: 'bg-gray-100 text-gray-700' },
]

const productEmoji: Record<string, string> = {
  pool: '🏊',
  spa: '🛁',
  solar: '☀️',
  gas_hot_water: '🔥',
  other: '🔧',
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editFields, setEditFields] = useState({
    assignedTechnician: '',
    scheduledDate: '',
    status: '',
  })

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    if (selectedJob) {
      setEditFields({
        assignedTechnician: selectedJob.assignedTechnician || '',
        scheduledDate: selectedJob.scheduledDate
          ? new Date(selectedJob.scheduledDate).toISOString().slice(0, 16)
          : '',
        status: selectedJob.status,
      })
    }
  }, [selectedJob])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      const data = await response.json()
      setJobs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveJobEdits = async () => {
    if (!selectedJob) return
    setSaving(true)
    try {
      await fetch(`/api/jobs/${selectedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editFields.status,
          assignedTechnician: editFields.assignedTechnician || null,
          scheduledDate: editFields.scheduledDate
            ? new Date(editFields.scheduledDate).toISOString()
            : null,
        }),
      })
      await fetchJobs()
      setSelectedJob(null)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    const matchesSearch = !search || 
      job.jobNumber.toLowerCase().includes(search.toLowerCase()) ||
      job.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      job.customer.suburb.toLowerCase().includes(search.toLowerCase()) ||
      job.issueDescription.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header - Fixed */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="text-xl font-bold text-primary-600">
              🏊 Pool Service
            </Link>
            <Link 
              href="/intake/demo" 
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium text-sm active:bg-primary-700 transition-colors"
            >
              + New Job
            </Link>
          </div>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="🔍 Search jobs, customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="overflow-x-auto hide-scrollbar">
          <div className="flex gap-2 px-4 pb-3 min-w-max">
            {STATUS_OPTIONS.map((status) => {
              const count = status.value === 'all' 
                ? jobs.length 
                : jobs.filter(j => j.status === status.value).length
              
              return (
                <button
                  key={status.value}
                  onClick={() => setStatusFilter(status.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    statusFilter === status.value
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                  }`}
                >
                  {status.label} ({count})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Job List */}
      <div className="px-4 py-4 space-y-3">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No jobs found</p>
            <Link href="/intake/demo" className="btn btn-primary">
              Create First Job
            </Link>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="bg-white rounded-xl p-4 shadow-sm active:shadow-md transition-shadow border border-gray-200"
            >
              {/* Job Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{productEmoji[job.productType] || '🔧'}</span>
                  <div>
                    <p className="font-bold text-gray-900">{job.jobNumber}</p>
                    <p className="text-sm text-gray-500">{job.customer.suburb}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>

              {/* Customer */}
              <p className="font-semibold text-gray-900 mb-1">{job.customer.name}</p>
              <a 
                href={`tel:${job.customer.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="text-primary-600 text-sm font-medium mb-2 inline-block"
              >
                📞 {job.customer.phone}
              </a>

              {/* Issue */}
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {job.issueDescription}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {job.urgency === 'emergency' && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
                      🚨 Emergency
                    </span>
                  )}
                  {job.urgency === 'urgent' && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                      ⚡ Urgent
                    </span>
                  )}
                  {job.photos.length > 0 && (
                    <span>📷 {job.photos.length}</span>
                  )}
                  {job.assignedTechnician && (
                    <span>👤 {job.assignedTechnician.split(' ')[0]}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(job.createdAt).toLocaleDateString('en-AU', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>

              {/* Scheduled Date */}
              {job.scheduledDate && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <p className="text-sm text-green-800 font-medium">
                    📅 {new Date(job.scheduledDate).toLocaleString('en-AU', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 rounded-t-3xl sm:rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedJob.jobNumber}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {productEmoji[selectedJob.productType]} {selectedJob.productType.replace(/_/g, ' ')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl w-10 h-10 flex items-center justify-center rounded-lg active:bg-gray-100"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Customer */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">Customer</h3>
                <p className="font-bold text-gray-900 text-lg">{selectedJob.customer.name}</p>
                <a href={`tel:${selectedJob.customer.phone}`} className="text-primary-600 hover:underline text-base block mt-1">
                  📞 {selectedJob.customer.phone}
                </a>
                {selectedJob.customer.email && (
                  <a href={`mailto:${selectedJob.customer.email}`} className="text-primary-600 hover:underline text-sm block">
                    ✉️ {selectedJob.customer.email}
                  </a>
                )}
                <p className="text-sm text-gray-600 mt-1">📍 {selectedJob.customer.suburb}</p>
              </div>

              {/* Issue */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Issue</h3>
                <p className="text-base text-gray-800 bg-gray-50 rounded-lg p-3 leading-relaxed">
                  {selectedJob.issueDescription}
                </p>
              </div>

              {/* Edit Fields */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Job Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editFields.status}
                      onChange={(e) => setEditFields({ ...editFields, status: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="new">New</option>
                      <option value="quoted">Quoted</option>
                      <option value="waiting_parts">Waiting Parts</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="complete">Complete</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                    <input
                      type="text"
                      value={editFields.assignedTechnician}
                      onChange={(e) => setEditFields({ ...editFields, assignedTechnician: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g. Mike Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date & Time</label>
                    <input
                      type="datetime-local"
                      value={editFields.scheduledDate}
                      onChange={(e) => setEditFields({ ...editFields, scheduledDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Photos */}
              {selectedJob.photos.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Photos ({selectedJob.photos.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedJob.photos.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => setLightboxPhoto(photo.url)}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 active:opacity-80 transition-opacity"
                      >
                        <img src={photo.url} alt="Job photo" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Created {new Date(selectedJob.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3 rounded-b-3xl sm:rounded-b-2xl">
              <button
                onClick={() => setSelectedJob(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium text-base active:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveJobEdits}
                disabled={saving}
                className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium text-base active:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '⏳ Saving...' : '✅ Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60] p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="max-w-3xl w-full">
            <img src={lightboxPhoto} alt="Full size" className="w-full rounded-xl" />
            <button
              onClick={() => setLightboxPhoto(null)}
              className="mt-4 w-full py-3 bg-white bg-opacity-20 text-white rounded-lg text-base font-medium active:bg-opacity-30 transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}


