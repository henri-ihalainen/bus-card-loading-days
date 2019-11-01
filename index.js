const parse = require('date-fns/parse')
const addDays = require('date-fns/addDays')
const ics = require('ics')
const Hapi = require('@hapi/hapi')

const DEFAULT_START_DATE = '1.1.2019'
const DEFAULT_EVENT_COUNT = 5

const parseDate = (dateString) => parse(dateString, 'dd.MM.yyyy', new Date())

const generateICalJson = (startDate, eventCount) => {
  const dates = [...Array(eventCount).keys()].map(i => addDays(startDate, 365 / (300 / 60) * i))

  return dates.map(date => ({
    title: 'Lataa bussikortti',
    start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()],
    duration: { days: 1 },
    alarms: [
      {
        action: 'display',
        trigger: [date.getFullYear(), date.getMonth() + 1, date.getDate(), 9, 0]
      }
    ]
  }))
}

const generateICalEvents = (startDate, eventCount) => {
  const { error, value } = ics.createEvents(generateICalJson(startDate, eventCount))

  if (error) {
    console.error(error)
    throw error
  }

  return value
}

const init = async () => {
  const server = Hapi.server({
    port: 8080
  })

  server.route({
    method: 'POST',
    path: '/generate/json',
    handler: (request, h) => {
      const startDate = request.payload.startDate || DEFAULT_START_DATE
      const eventCount = request.payload.eventCount || DEFAULT_EVENT_COUNT
      return generateICalJson(parseDate(startDate), eventCount)
    }
  })

  server.route({
    method: 'POST',
    path: '/generate/ical',
    handler: (request, h) => {
      const startDate = request.payload.startDate || DEFAULT_START_DATE
      const eventCount = request.payload.eventCount || DEFAULT_EVENT_COUNT
      const response = h.response(generateICalEvents(parseDate(startDate), eventCount))
      response.header('Content-Disposition', 'attachment;filename="events.ics"')
      return response
    }
  })

  await server.start()
  console.log('Server running on %s', server.info.uri);
}

process.on('unhandledRejection', (err) => {
  console.error(err)
  process.exit(1)
})

init()