// Promove (idempotente) o usuário do e-mail SUPER_ADMIN_EMAIL a SUPER_ADMIN,
// garantindo ativo+aprovado. NÃO cria conta — apenas promove se já existir.
// Default: nexusai360@gmail.com (o dono). Roda no entrypoint em todo deploy.
import { prisma } from '../src/prisma.js'

const email = process.env.SUPER_ADMIN_EMAIL || 'nexusai360@gmail.com'

// Garante o NÍVEL SUPER_ADMIN (não força a qualificação — o dono pode ajustá-la).
const r = await prisma.user.updateMany({
  where: { email },
  data: { nivelAcesso: 'SUPER_ADMIN', ativo: true, aprovado: true },
})

if (r.count > 0) console.log(`[super-admin] ${email} garantido como SUPER_ADMIN.`)
else console.log(`[super-admin] ${email} ainda não existe — nada a promover.`)

await prisma.$disconnect()
