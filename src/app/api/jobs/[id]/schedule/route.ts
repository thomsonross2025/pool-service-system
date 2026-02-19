import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'

const scheduleSchema = z.object({
  scheduledDate: z.string(),
  durationMinutes: z.number().default(60),
  assignedTechnician: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = scheduleSchema.parse(body)

    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: { customer: true },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const tokenConfig = await prisma.systemConfig.findUnique({
      where: { key: 'google_refresh_token' },
    })

    let calendarEventId = null

    if (tokenConfig?.value) {
      try {
        const calendarEvent = await createCalendarEvent({
          refreshToken: tokenConfig.value,
          summary: `Job #${job.jobNumber} - ${job.customer.name}`,
          description: `Product: ${job.productType}\nIssue: ${job.issueDescription}\nPhone: ${job.customer.phone}${data.assignedTechnician ? `\nTechnician: ${data.assignedTechnician}` : ''}`,
          location: job.customer.suburb || undefined,
          startTime: new Date(data.scheduledDate),
          endTime: new Date(new Date(data.scheduledDate).getTime() + data.durationMinutes * 60000),
        })
        calendarEventId = calendarEvent.id ?? null
        console.log('✅ Calendar event created:', calendarEventId)
      } catch (calError) {
        console.error('Calendar error (non-fatal):', calError)
      }
    }

    const updatedJob = await prisma.job.update({
      where: { id: params.id },
      data: {
        status: 'scheduled',
        scheduledDate: new Date(data.scheduledDate),
        assignedTechnician: data.assignedTechnician || null,
        googleCalendarEventId: calendarEventId,
      },
      include: { customer: true },
    })

    await prisma.jobStatusHistory.create({
      data: {
        jobId: params.id,
        fromStatus: job.status,
        toStatus: 'scheduled',
        changedBy: 'user',
        notes: `Scheduled for ${new Date(data.scheduledDate).toLocaleString()}${
          data.assignedTechnician ? ` with ${data.assignedTechnician}` : ''
        }${calendarEventId ? ' - Calendar event created' : ''}`,
      },
    })

    return NextResponse.json({
      success: true,
      job: updatedJob,
      calendarEventId,
      calendarConnected: !!tokenConfig?.value,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error scheduling job:', error)
    return NextResponse.json({ error: 'Failed to schedule job' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.googleCalendarEventId) {
      const tokenConfig = await prisma.systemConfig.findUnique({
        where: { key: 'google_refresh_token' },
      })

      if (tokenConfig?.value) {
        try {
          await deleteCalendarEvent({
            refreshToken: tokenConfig.value,
            eventId: job.googleCalendarEventId,
          })
          console.log('✅ Calendar event deleted')
        } catch (calError) {
          console.error('Calendar delete error (non-fatal):', calError)
        }
      }
    }

    await prisma.job.update({
      where: { id: params.id },
      data: {
        status: 'new',
        scheduledDate: null,
        assignedTechnician: null,
        googleCalendarEventId: null,
      },
    })

    await prisma.jobStatusHistory.create({
      data: {
        jobId: params.id,
        fromStatus: 'scheduled',
        toStatus: 'new',
        changedBy: 'user',
        notes: 'Appointment cancelled',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling schedule:', error)
    return NextResponse.json({ error: 'Failed to cancel schedule' }, { status: 500 })
  }
}