'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface PhotoPreview {
  file: File
  preview: string
  id: string
}

export default function IntakeFormPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    suburb: '',
    productType: 'pool',
    issueDescription: '',
    urgency: 'routine',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    const newPhotos: PhotoPreview[] = []

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is too large. Max 10MB.`)
        return
      }
      if (photos.length + newPhotos.length >= 5) {
        setError('Maximum 5 photos allowed.')
        return
      }
      newPhotos.push({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substring(7),
      })
    })

    setPhotos((prev) => [...prev, ...newPhotos])
    setError(null)
  }

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo) URL.revokeObjectURL(photo.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const cleanPhone = formData.phone.replace(/\D/g, '')
    let finalPhone = cleanPhone

    if (cleanPhone.length === 10 && cleanPhone.startsWith('04')) {
      finalPhone = cleanPhone
    } else if (cleanPhone.length === 9 && cleanPhone.startsWith('4')) {
      finalPhone = '0' + cleanPhone
    } else {
      setError('Phone must be Australian mobile: 04XX XXX XXX')
      setSubmitting(false)
      return
    }

    try {
      // Convert photos to base64
      const photoData = await Promise.all(
        photos.map(async (p) => {
          const base64 = await convertToBase64(p.file)
          console.log('Photo converted:', p.file.name, 'size:', p.file.size)
          return {
            data: base64,
            filename: p.file.name,
            contentType: p.file.type,
            filesize: p.file.size,
          }
        })
      )

      console.log('Submitting with', photoData.length, 'photos')

      const response = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: finalPhone,
          photos: photoData,
        }),
      })

      const data = await response.json()
      console.log('API Response:', data)

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.details)
            ? data.details.join(', ')
            : data.error || 'Failed to submit'
        )
      }

      router.push(`/intake/success?jobNumber=${data.jobNumber}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">Service Request Form</h1>
          <p className="text-gray-600">Tell us about your issue</p>
        </div>

        <form onSubmit={handleSubmit} className="card">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="label">Full Name *</label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="input" placeholder="John Smith" />
              </div>
              <div>
                <label htmlFor="phone" className="label">Mobile Number *</label>
                <input type="text" id="phone" name="phone" value={formData.phone} onChange={handleChange} required className="input" placeholder="0412 345 678" />
                <p className="text-xs text-gray-500 mt-1">Australian mobile: 04XX XXX XXX</p>
              </div>
              <div>
                <label htmlFor="email" className="label">Email (Optional)</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="input" placeholder="john@example.com" />
              </div>
              <div>
                <label htmlFor="suburb" className="label">Suburb *</label>
                <input type="text" id="suburb" name="suburb" value={formData.suburb} onChange={handleChange} required className="input" placeholder="Perth" />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Details</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="productType" className="label">Service Type *</label>
                <select id="productType" name="productType" value={formData.productType} onChange={handleChange} required className="input">
                  <option value="pool">🏊 Pool Service/Repair</option>
                  <option value="spa">🛁 Spa/Hot Tub</option>
                  <option value="solar">☀️ Solar Heating</option>
                  <option value="gas_hot_water">🔥 Gas Hot Water</option>
                  <option value="other">🔧 Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="urgency" className="label">Urgency *</label>
                <select id="urgency" name="urgency" value={formData.urgency} onChange={handleChange} required className="input">
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent (24-48hrs)</option>
                  <option value="emergency">Emergency (ASAP)</option>
                </select>
              </div>
              <div>
                <label htmlFor="issueDescription" className="label">Describe the issue *</label>
                <textarea id="issueDescription" name="issueDescription" value={formData.issueDescription} onChange={handleChange} required minLength={10} rows={4} className="input" placeholder="Describe the problem in detail..." />
                <p className="text-xs text-gray-500 mt-1">Minimum 10 characters</p>
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Photos <span className="text-gray-400 font-normal text-base">(Optional)</span>
            </h2>

            <div
              onDrop={(e) => { e.preventDefault(); setDragging(false); addPhotos(e.dataTransfer.files) }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }`}
            >
              <div className="text-4xl mb-3">📷</div>
              <p className="text-gray-700 font-medium mb-1">Drag & drop photos here</p>
              <p className="text-gray-500 text-sm mb-3">or click to browse</p>
              <p className="text-gray-400 text-xs">Max 5 photos • Max 10MB each • JPG, PNG, HEIC</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => addPhotos(e.target.files)}
                className="hidden"
              />
            </div>

            {photos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-3">
                  {photos.length} photo{photos.length !== 1 ? 's' : ''} selected ✅
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100">
                      <img src={photo.preview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto(photo.id) }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-400 transition-colors text-3xl"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? photos.length > 0
                ? '⏳ Uploading & submitting...'
                : '⏳ Submitting...'
              : 'Submit Request'}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            We'll contact you within 2 hours
          </p>
        </form>
      </div>
    </div>
  )
}
