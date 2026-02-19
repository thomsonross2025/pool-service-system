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
  googleCalendarEventId: string | null
  customer: {
    name: string
    phone: string
    suburb: string
    email: string | null
  }
  photos: Photo[]
}

const COLUMNS = [
  { id: 'new',           label: 'New',          color: 'bg-blue-50 border-blue-200',     header: 'bg-blue-500'    },
  { id: 'quoted',        label: 'Quoted',        color: 'bg-purple-50 border-purple-200', header: 'bg-purple-500'  },
  { id: 'waiting_parts', label: 'Waiting Parts', color: 'bg-yellow-50 border-yellow-200', header: 'bg-yellow-500'  },
  { id: 'scheduled',     label: 'Scheduled',     color: 'bg-green-50 border-green-200',   header: 'bg-green-500'   },
  { id: 'in_progress',   label: 'In Progress',   color: 'bg-orange-50 border-orange-200', header: 'bg-orange-500'  },
  { id: 'complete',      label: 'Complete',      color: 'bg-gray-50 border-gray-200',     header: 'bg-gray-500'    },
]

const productEmoji: Record<string, string> = {
  pool: '🏊', spa: '🛁', solar: '☀️', gas_hot_water: '🔥', other: '🔧',
}

const urgencyBorder: Record<string, string> = {
  routine: '',
  urgent: 'border-l-4 border-l-orange-400',
  emergency: 'border-l-4 border-l-red-500',
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    scheduledDate: '',
    durationMinutes: 60,
    assignedTechnician: '',
  })
  const [editFields, setEditFields] = useState({
    assignedTechnician: '',
    scheduledDate: '',
    status: '',
  })

  useEffect(() => {
    fetchJobs()
    checkCalendarStatus()
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
      setScheduleForm({
        scheduledDate: selectedJob.scheduledDate
          ? new Date(selectedJob.scheduledDate).toISOString().slice(0, 16)
          : '',
        durationMinutes: 60,
        assignedTechnician: selectedJob.assignedTechnician || '',
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

  const checkCalendarStatus = async () => {
    try {
      const response = await fetch('/api/settings/calendar-status')
      const data = await response.json()
      setCalendarConnected(data.connected)
    } catch (error) {
      console.error('Failed to check calendar:', error)
    }
  }

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)))
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch (error) {
      fetchJobs()
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

  const scheduleJob = async () => {
    if (!selectedJob || !scheduleForm.scheduledDate) return
    setScheduling(true)
    try {
      const response = await fetch(`/api/jobs/${selectedJob.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: new Date(scheduleForm.scheduledDate).toISOString(),
          durationMinutes: scheduleForm.durationMinutes,
          assignedTechnician: scheduleForm.assignedTechnician || undefined,
        }),
      })
      const data = await response.json()
      await fetchJobs()
      setSelectedJob(null)

      if (data.calendarEventId) {
        alert(`✅ Job scheduled & added to Google Calendar!`)
      } else if (data.calendarConnected === false) {
        alert(`✅ Job scheduled! Connect Google Calendar in Settings to sync appointments.`)
      }
    } catch (error) {
      console.error('Failed to schedule:', error)
    } finally {
      setScheduling(false)
    }
  }

  const cancelSchedule = async () => {
    if (!selectedJob) return
    if (!confirm('Cancel this appointment?')) return
    try {
      await fetch(`/api/jobs/${selectedJob.id}/schedule`, { method: 'DELETE' })
      await fetchJobs()
      setSelectedJob(null)
    } catch (error) {
      console.error('Failed to cancel schedule:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    setDraggedJobId(jobId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDragOverColumn(columnId)
  }

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (draggedJobId) updateJobStatus(draggedJobId, columnId)
    setDraggedJobId(null)
    setDragOverColumn(null)
  }

  const filteredJobs = jobs.filter((job) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      job.jobNumber.toLowerCase().includes(s) ||
      job.customer.name.toLowerCase().includes(s) ||
      job.customer.suburb.toLowerCase().includes(s) ||
      job.issueDescription.toLowerCase().includes(s)
    )
  })

  const getColumnJobs = (columnId: string) =>
    filteredJobs.filter((job) => job.status === columnId)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center py-4 gap-4">
            <Link href="/" className="text-xl font-bold text-primary-600 flex-shrink-0">
              🏊 Pool Service
            </Link>
            <input
              type="text"
              placeholder="🔍 Search jobs, customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              {!calendarConnected && (
                <Link
                  href="/settings"
                  className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg hover:bg-orange-100 transition-colors hidden sm:block"
                >
                  📅 Connect Calendar
                </Link>
              )}
              {calendarConnected && (
                <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-lg hidden sm:block">
                  📅 Calendar ✅
                </span>
              )}
              <Link href="/settings" className="text-gray-400 hover:text-gray-600 text-xl" title="Settings">⚙️</Link>
              <Link href="/intake/demo" className="btn btn-primary text-sm whitespace-nowrap">
                + New Job
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto p-4 pb-8">
        <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
          {COLUMNS.map((column) => {
            const columnJobs = getColumnJobs(column.id)
            const isDragOver = dragOverColumn === column.id

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                onDragLeave={() => setDragOverColumn(null)}
                className={`w-64 flex-shrink-0 rounded-xl border-2 transition-all duration-200 ${column.color} ${
                  isDragOver ? 'ring-4 ring-primary-400 ring-offset-2 scale-[1.02]' : ''
                }`}
              >
                <div className={`${column.header} text-white rounded-t-xl px-4 py-3 flex justify-between items-center`}>
                  <span className="font-bold text-sm">{column.label}</span>
                  <span className="bg-white bg-opacity-25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {columnJobs.length}
                  </span>
                </div>

                <div className="p-2 space-y-2 min-h-24">
                  {columnJobs.length === 0 && (
                    <div className={`h-20 flex items-center justify-center text-xs rounded-lg border-2 border-dashed transition-all ${
                      isDragOver ? 'border-primary-400 bg-primary-50 text-primary-500 font-medium' : 'border-gray-300 text-gray-400'
                    }`}>
                      {isDragOver ? '📥 Drop here' : 'Empty'}
                    </div>
                  )}

                  {columnJobs.map((job) => (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      onDragEnd={() => { setDraggedJobId(null); setDragOverColumn(null) }}
                      onClick={() => setSelectedJob(job)}
                      className={`bg-white rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none ${
                        urgencyBorder[job.urgency]
                      } ${draggedJobId === job.id ? 'opacity-40 scale-95' : 'hover:-translate-y-0.5'}`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-xs font-bold text-gray-400">{job.jobNumber}</span>
                        <div className="flex items-center gap-1">
                          {job.googleCalendarEventId && <span title="In Google Calendar">📅</span>}
                          <span className="text-base">{productEmoji[job.productType] || '🔧'}</span>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm truncate">{job.customer.name}</p>
                      <p className="text-xs text-gray-400 mb-1.5">📍 {job.customer.suburb}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">{job.issueDescription}</p>

                      <div className="flex items-center justify-between">
                        <div>
                          {job.urgency === 'emergency' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">🚨 Emergency</span>
                          )}
                          {job.urgency === 'urgent' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">⚡ Urgent</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          {job.photos.length > 0 && <span>📷{job.photos.length}</span>}
                          {job.assignedTechnician && <span>👤{job.assignedTechnician.split(' ')[0]}</span>}
                        </div>
                      </div>

                      {job.scheduledDate && (
                        <div className="mt-2 text-xs bg-green-50 text-green-700 rounded px-2 py-1 font-medium">
                          📅 {new Date(job.scheduledDate).toLocaleDateString('en-AU', {
                            weekday: 'short', day: 'numeric', month: 'short',
                          })} {new Date(job.scheduledDate).toLocaleTimeString('en-AU', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start p-5 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedJob.jobNumber}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {productEmoji[selectedJob.productType]} {selectedJob.productType.replace(/_/g, ' ')}
                  {selectedJob.urgency !== 'routine' && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                      selectedJob.urgency === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {selectedJob.urgency === 'emergency' ? '🚨 Emergency' : '⚡ Urgent'}
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Customer */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">Customer</h3>
                <p className="font-bold text-gray-900">{selectedJob.customer.name}</p>
                <a href={`tel:${selectedJob.customer.phone}`} className="text-primary-600 hover:underline text-sm block mt-1">
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
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Issue</h3>
                <p className="text-sm text-gray-800 leading-relaxed">{selectedJob.issueDescription}</p>
              </div>

              {/* Schedule Appointment */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-green-700 uppercase tracking-wide">
                    📅 Schedule Appointment
                  </h3>
                  {calendarConnected ? (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      📅 Calendar sync ON
                    </span>
                  ) : (
                    <Link href="/settings" className="text-xs text-orange-600 hover:underline">
                      + Connect calendar
                    </Link>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="label text-green-800">Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={scheduleForm.scheduledDate}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-green-800">Duration</label>
                      <select
                        value={scheduleForm.durationMinutes}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: Number(e.target.value) })}
                        className="input"
                      >
                        <option value={30}>30 min</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2 hours</option>
                        <option value={180}>3 hours</option>
                        <option value={240}>4 hours</option>
                      </select>
                    </div>
                    <div>
                      <label className="label text-green-800">Technician</label>
                      <input
                        type="text"
                        value={scheduleForm.assignedTechnician}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, assignedTechnician: e.target.value })}
                        className="input"
                        placeholder="e.g. Mike"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={scheduleJob}
                      disabled={scheduling || !scheduleForm.scheduledDate}
                      className="flex-1 btn btn-primary disabled:opacity-50 text-sm"
                    >
                      {scheduling ? '⏳ Scheduling...' : calendarConnected ? '📅 Schedule + Add to Calendar' : '📅 Schedule Appointment'}
                    </button>

                    {selectedJob.scheduledDate && (
                      <button
                        onClick={cancelSchedule}
                        className="btn btn-secondary text-red-600 hover:bg-red-50 text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Status</h3>
                <select
                  value={editFields.status}
                  onChange={(e) => setEditFields({ ...editFields, status: e.target.value })}
                  className="input"
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
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
                      >
                        <img src={photo.url} alt="Job photo" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Created {new Date(selectedJob.createdAt).toLocaleString()}
                {selectedJob.googleCalendarEventId && ' • 📅 In Google Calendar'}
              </p>
            </div>

            <div className="flex gap-3 p-5 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setSelectedJob(null)} className="flex-1 btn btn-secondary">Cancel</button>
              <button onClick={saveJobEdits} disabled={saving} className="flex-1 btn btn-primary disabled:opacity-50">
                {saving ? '⏳ Saving...' : '✅ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="max-w-3xl w-full">
            <img src={lightboxPhoto} alt="Full size" className="w-full rounded-xl" />
            <button onClick={() => setLightboxPhoto(null)} className="mt-4 w-full py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors text-sm">
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

