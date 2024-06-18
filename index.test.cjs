const request = require('supertest')
const express = require('express')
const { rateLimit } = require('express-rate-limit')


const app = express()

const limit = {
  windowMs: 60 * 1000, // 1 minutes
  limit: 10, // each IP can make up to 10 requests per `windowsMs` (1 minutes)
  standardHeaders: true, // add the `RateLimit-*` headers to the response
  legacyHeaders: false, // remove the `X-RateLimit-*` headers from the response
}

const limiter = rateLimit(limit)
app.use(limiter)

app.get('/hello-world', (req, res) => {
  res.send('Hello, World!')
})

describe('Rate Limit Middleware', () => {
  it(`should limit requests to ${limit.limit} per ${limit.windowMs / 1000} s`, async () => {
    const agent = request.agent(app)

    // Make 10 requests within the rate limit
    for (let i = 0; i < 10; i++) {
      await agent.get('/hello-world').expect(200)
    }

    // Make an 11th request, which should be rate limited
    await agent.get('/hello-world').expect(429)
  })
})
