import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { generateJobNumber } from '@/lib/utils'
import { addJob, JobType } from '@/lib/queue'


export const dynamic = 'force-dynamic'  // ← ADD THIS LINE

const photoSchema = z.object({
  // ... rest stays the same

  data: z.string(), // base64
  filename: z.string(),
  contentType: z.string(),
  filesize: z.number(),
})

const createJobSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^04\d{8}$/, 'Must be valid Australian mobile'),
  email: z.string().email().optional().or(z.literal('')),
  suburb: z.string().min(2),
  productType: z.enum(['pool', 'spa', 'solar', 'gas_hot_water', 'other']),
  issueDescription: z.string().min(10),
  urgency: z.enum(['routine', 'urgent', 'emergency']).default('routine'),
  photos: z.array(photoSchema).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('Received job creation request:', {
      name: body.name,
      phone: body.phone,
      suburb: body.suburb,
      productType: body.productType,
      photoCount: body.photos?.length || 0,
    })

    const data = createJobSchema.parse(body)

    // Find or create customer
    let customer = await prisma.customer.findUnique({
      where: { phone: data.phone },
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          suburb: data.suburb,
        },
      })

      await addJob(JobType.SYNC_CUSTOMER_TO_MYOB, { customerId: customer.id })
    }

    // Generate job number
    const jobNumber = await generateJobNumber()

    // Create the job
    const job = await prisma.job.create({
      data: {
        jobNumber,
        customerId: customer.id,
        productType: data.productType,
        issueDescription: data.issueDescription,
        urgency: data.urgency,
        status: 'new',
      },
    })

    // Save photos if provided
    if (data.photos && data.photos.length > 0) {
      await prisma.jobPhoto.createMany({
        data: data.photos.map((photo) => ({
          jobId: job.id,
          // Store base64 as URL for now
          // In production, upload to S3/R2 and store the URL
          url: photo.data,
          filename: photo.filename,
          contentType: photo.contentType,
          filesize: photo.filesize,
        })),
      })

      console.log(`Saved ${data.photos.length} photos for job ${jobNumber}`)
    }

    // Create status history
    await prisma.jobStatusHistory.create({
      data: {
        jobId: job.id,
        toStatus: 'new',
        changedBy: 'system',
        notes: `Job created from intake form with ${data.photos?.length || 0} photos`,
      },
    })

    // Queue notifications
    await addJob(JobType.SEND_CUSTOMER_CONFIRMATION, {
      jobId: job.id,
      jobNumber,
      customerPhone: data.phone,
    })

    await addJob(JobType.SEND_OFFICE_NOTIFICATION, { jobId: job.id })

    return NextResponse.json(
      { success: true, jobNumber, jobId: job.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating job:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}4