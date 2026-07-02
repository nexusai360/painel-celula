import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { buildApp } from '../app.js'

let app
beforeAll(async () => { app = buildApp() })
afterAll(async () => { await app.close() })

describe('GET /health', () => {
  it('responde ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })
})
