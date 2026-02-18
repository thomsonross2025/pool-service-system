import prisma from './prisma'

export async function generateJobNumber(): Promise<string> {
  const year = new Date().getFullYear()
  
  const jobCount = await prisma.job.count({
    where: {
      jobNumber: {
        startsWith: `JOB-${year}-`,
      },
    },
  })

  const nextNumber = (jobCount + 1).toString().padStart(4, '0')
  return `JOB-${year}-${nextNumber}`
}
