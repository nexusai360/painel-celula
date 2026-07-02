import { googleHabilitado } from '../lib/google/config.js'

export async function configRoutes(app) {
  app.get('/config', async () => ({ googleHabilitado: googleHabilitado() }))
}
