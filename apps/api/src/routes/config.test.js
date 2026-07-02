import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'

let app
beforeAll(async () => { app = buildApp(); await app.ready() })
afterAll(async () => { await app.close() })

describe('GET /config', () => {
  it('expõe googleHabilitado como boolean', async () => {
    const res = await app.inject({ method: 'GET', url: '/config' })
    expect(res.statusCode).toBe(200)
    expect(typeof res.json().googleHabilitado).toBe('boolean')
  })
})
