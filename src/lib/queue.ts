import { Queue, QueueOptions } from 'bullmq'

const connectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_HOST?.includes('upstash') ? {} : undefined,
  maxRetriesPerRequest: null,
}

const defaultQueueOptions: QueueOptions = {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
}

export const jobQueue = new Queue('jobs', defaultQueueOptions)
export const notificationQueue = new Queue('notifications', defaultQueueOptions)
export const syncQueue = new Queue('sync', defaultQueueOptions)

export enum JobType {
  SYNC_CUSTOMER_TO_MYOB = 'sync-customer-to-myob',
  SEND_CUSTOMER_CONFIRMATION = 'send-customer-confirmation',
  SEND_OFFICE_NOTIFICATION = 'send-office-notification',
  SEND_APPOINTMENT_REMINDER = 'send-appointment-reminder',
  CREATE_CALENDAR_EVENT = 'create-calendar-event',
}

export async function addJob(type: JobType, data: any, options?: { delay?: number; priority?: number }) {
  return jobQueue.add(type, data, options)
}

export { connectionOptions as connection }
