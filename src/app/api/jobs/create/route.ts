import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { generateJobNumber } from '@/lib/utils'
import { addJob, JobType } from '@/lib/queue'

const photoSchema = z.object({
  data: z.string(),
  filename: z.string(),
  contentType: z.string(),
  filesize: z.number(),
})

const createJobSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^04\d{8}$/),
  email: z.string().email().optional().or(z.literal('')),
  suburb: z.string().min(2),
  productType: z.enum(['pool', 'spa', 'solar', 'gas_hot_water', 'other']),
  issueDescription: z.string().min(10),
  urgency: z.enum(['routine', 'urgent', 'emergency']).default('routine'),
  photos: z.array(photoSchema).optional().default([]),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('=== NEW JOB REQUEST ===')
    console.log('Name:', body.name)
    console.log('Phone:', body.phone)
    console.log('Photos received:', body.photos?.length ?? 0)

    const data = createJobSchema.parse(body)

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

    const jobNumber = await generateJobNumber()

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

    console.log('Job created:', jobNumber)

    // Save photos
    if (data.photos && data.photos.length > 0) {
      console.log('Saving', data.photos.length, 'photos...')

      for (const photo of data.photos) {
        await prisma.jobPhoto.create({
          data: {
            jobId: job.id,
            url: photo.data,
            filename: photo.filename,
            contentType: photo.contentType,
            filesize: photo.filesize,
          },
        })
      }

      console.log('Photos saved successfully!')
    } else {
      console.log('No photos to save')
    }

    await prisma.jobStatusHistory.create({
      data: {
        jobId: job.id,
        toStatus: 'new',
        changedBy: 'system',
        notes: `Job created with ${data.photos?.length ?? 0} photos`,
      },
    })

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
    console.error('=== JOB CREATION ERROR ===', error)

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
}
