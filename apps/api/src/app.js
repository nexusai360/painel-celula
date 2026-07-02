import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { healthRoutes } from './routes/health.js'
import { configRoutes } from './routes/config.js'
import { authRoutes } from './routes/auth.js'
import { celulaRoutes } from './routes/celulas.js'
import { encontroRoutes } from './routes/encontros.js'
import { presencaRoutes } from './routes/presenca.js'
import { usuarioRoutes } from './routes/usuarios.js'
import { googleAuthRoutes } from './routes/googleAuth.js'
import { perfilRoutes } from './routes/perfil.js'
import { pedidoRoutes } from './routes/pedidos.js'
import { testemunhoRoutes } from './routes/testemunhos.js'
import { bannerRoutes } from './routes/banner.js'
import { notificacaoRoutes } from './routes/notificacoes.js'

export function buildApp() {
  const app = Fastify({ logger: false, trustProxy: true })

  // Headers de segurança (CSP liberando as fontes do Google e avatares data:).
  app.register(helmet, {
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"]
      }
    }
  })

  // Rate limit global (anti força-bruta/abuso). Rotas sensíveis apertam mais.
  app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    hook: 'preHandler',
    allowList: (req) => req.url === '/health'
  })

  // CORS: em produção, restrinja ao(s) domínio(s) do front via CORS_ORIGIN
  // (lista separada por vírgula). Sem a variável, libera qualquer origem (dev).
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true
  app.register(cors, { origin: corsOrigin })

  // JWT: em produção o JWT_SECRET é OBRIGATÓRIO (nunca cai no segredo de dev).
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET é obrigatório em produção (defina a variável de ambiente).')
  }
  app.register(jwt, { secret: jwtSecret || 'dev-secret-troque-em-producao', sign: { expiresIn: '7d' } })

  app.register(healthRoutes)
  app.register(configRoutes)
  app.register(authRoutes)
  app.register(celulaRoutes)
  app.register(encontroRoutes)
  app.register(presencaRoutes)
  app.register(usuarioRoutes)
  app.register(googleAuthRoutes)
  app.register(perfilRoutes)
  app.register(pedidoRoutes)
  app.register(testemunhoRoutes)
  app.register(bannerRoutes)
  app.register(notificacaoRoutes)

  return app
}
