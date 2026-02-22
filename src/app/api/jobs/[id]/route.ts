import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const updateJobSchema = z.object({
  status: z.string().optional(),
  assignedTechnician: z.string().nullable().optional(),
  scheduledDate: z.string().nullable().optional(),
  quotedAmount: z.number().optional(),
  finalAmount: z.number().optional(),
  completionNotes: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        photos: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        notifications: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = updateJobSchema.parse(body)

    const currentJob = await prisma.job.findUnique({
      where: { id: params.id },
    })

    if (!currentJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.status !== undefined) updateData.status = data.status
    if (data.assignedTechnician !== undefined) updateData.assignedTechnician = data.assignedTechnician
    if (data.quotedAmount !== undefined) updateData.quotedAmount = data.quotedAmount
    if (data.finalAmount !== undefined) updateData.finalAmount = data.finalAmount
    if (data.completionNotes !== undefined) updateData.completionNotes = data.completionNotes

    if (data.scheduledDate !== undefined) {
      updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null
    }

    if (data.status === 'complete' && currentJob.status !== 'complete') {
      updateData.completedDate = new Date()
    }

    const updatedJob = await prisma.job.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        photos: true,
      },
    })

    if (data.status && data.status !== currentJob.status) {
      await prisma.jobStatusHistory.create({
        data: {
          jobId: params.id,
          fromStatus: currentJob.status,
          toStatus: data.status,
          changedBy: 'user',
          notes: `Status changed from ${currentJob.status} to ${data.status}`,
        },
      })
    }

    return NextResponse.json(updatedJob)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating job:', error)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
