import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    prompt: 'consent',
  })
}

export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function createCalendarEvent({
  refreshToken,
  summary,
  description,
  location,
  startTime,
  endTime,
}: {
  refreshToken: string
  summary: string
  description: string
  location?: string
  startTime: Date
  endTime: Date
}) {
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary,
      description,
      location,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Australia/Perth',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Australia/Perth',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    },
  })

  return event.data
}

export async function updateCalendarEvent({
  refreshToken,
  eventId,
  summary,
  description,
  startTime,
  endTime,
}: {
  refreshToken: string
  eventId: string
  summary?: string
  description?: string
  startTime?: Date
  endTime?: Date
}) {
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const updateData: any = {}
  if (summary) updateData.summary = summary
  if (description) updateData.description = description
  if (startTime) updateData.start = { dateTime: startTime.toISOString(), timeZone: 'Australia/Perth' }
  if (endTime) updateData.end = { dateTime: endTime.toISOString(), timeZone: 'Australia/Perth' }

  const event = await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: updateData,
  })

  return event.data
}

export async function deleteCalendarEvent({
  refreshToken,
  eventId,
}: {
  refreshToken: string
  eventId: string
}) {
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  })
}

export async function getAvailability({
  refreshToken,
  date,
}: {
  refreshToken: string
  date: Date
}) {
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const events = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  return events.data.items || []
}