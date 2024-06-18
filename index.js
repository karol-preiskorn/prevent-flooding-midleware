const express = require("express")
const { rateLimit } = require("express-rate-limit")
const { Request, Response } = require("express")
const morgan = require("morgan")

morgan.token("requester", function getRequester(req) {
  return JSON.stringify(req.requester)
})

morgan.token("input", function getInput(req) {
  let input = {}
  if (req.method === "GET") {
    input = req.query
  } else {
    input = req.body
  }

  // mask any input that should be secret
  input = { ...input }
  if (input.password) {
    input.password = "*"
  }

  return JSON.stringify(input)
})

morgan.token("response-body", (req, res) => {
  const body = { ...JSON.parse(res.responseBody) }  // mask any input that should be secret
  if (body?.data?.accessToken) {
    body.data.accessToken = "*"
  }
  if (body?.data?.refreshToken) {
    body.data.refreshToken = "*"
  }

  return JSON.stringify(body)
})

const port = process.env.PORT || 3000



// initialize an Express server
const app = express()

const limit = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 10, // each IP can make up to 10 requests per `windowsMs` (5 minutes)
  standardHeaders: true, // add the `RateLimit-*` headers to the response
  legacyHeaders: false, // remove the `X-RateLimit-*` headers from the response
}

// define the rate limiting middleware
const limiter = rateLimit(limit)

// apply the rate limiting middleware to all endpoints
app.use(limiter)

const originalSend = app.response.send
app.response.send = function sendOverride(body) {
  this.responseBody = body
  return originalSend.call(this, body)
}; app.use(express.json())
app.use(
  morgan(
    ':requester :remote-addr [:date[clf]] ":method :url HTTP/:http-version" Input :input Response :response-body'
  )
)

// define a sample endpoint
app.get("/rest", (req, res) => {
  res.send({ data: "Hello, World!" })
})

// start the server
const server = app.listen(port, () => {
  console.log(`rateLimit Server listening at http://127.0.0.1:${port}`)
  console.log('limiter: ' + JSON.stringify(limit, null, 2))
})


server.on('error', (err) => {
  if (err instanceof Error && err.message.includes('EADDRINUSE')) {
    logger.error('Error: address already in use')
  } else {
    logger.error(`[listen] ${String(err)}`)
  }
})

process.on('SIGTERM', () => {
  logger.debug('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    logger.debug('HTTP server closed')
  })
})
