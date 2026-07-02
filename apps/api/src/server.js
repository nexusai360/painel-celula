import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildApp } from './app.js'

const app = buildApp()
const port = Number(process.env.API_PORT) || 3000
// Em container/produção use 0.0.0.0 para aceitar conexões externas (padrão).
const host = process.env.HOST || '0.0.0.0'

// Topologia opcional "serviço único": se o build do front existir
// (apps/web/dist), a própria API serve os arquivos estáticos e faz o
// fallback para index.html nas rotas de navegação (SPA). Se a pasta não
// existir (deploy com front separado), a API serve apenas as rotas de API.
const webDist = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'dist')

if (existsSync(join(webDist, 'index.html'))) {
  const fastifyStatic = (await import('@fastify/static')).default
  await app.register(fastifyStatic, { root: webDist })
  // Requisições de navegação (GET que aceita HTML) caem no index.html;
  // qualquer outra rota inexistente continua respondendo 404 JSON (API).
  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && request.headers.accept?.includes('text/html')) {
      return reply.sendFile('index.html')
    }
    return reply.code(404).send({ erro: 'Not Found' })
  })
  console.log(`Servindo o front estático de ${webDist}`)
}

app
  .listen({ port, host })
  .then(() => console.log(`Hineni API ouvindo em http://${host}:${port}`))
  .catch((err) => { console.error(err); process.exit(1) })
