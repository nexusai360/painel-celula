// Cria (ou promove) o usuário DONO (SUPER_ADMIN) a partir de variáveis de ambiente.
// Use em produção para garantir o super admin — em vez do seed de demo.
// O super admin é o dono da plataforma (único a conceder ADMIN/SUPER_ADMIN).
//
//   ADMIN_EMAIL=voce@dominio.com ADMIN_SENHA='umaSenhaForte' \
//   ADMIN_NOME='Seu Nome' npm run admin --workspace apps/api
import { prisma } from '../src/prisma.js'
import { hashSenha } from '../src/lib/password.js'

const email = process.env.ADMIN_EMAIL
const senha = process.env.ADMIN_SENHA
const nome = process.env.ADMIN_NOME || 'Administrador'

if (!email || !senha) {
  console.error('Defina ADMIN_EMAIL e ADMIN_SENHA no ambiente.')
  process.exit(1)
}

const senhaHash = await hashSenha(senha)
const admin = await prisma.user.upsert({
  where: { email },
  update: { papel: 'SUPER_ADMIN', nivelAcesso: 'SUPER_ADMIN', ativo: true, aprovado: true, senhaHash },
  create: { nome, email, senhaHash, papel: 'SUPER_ADMIN', nivelAcesso: 'SUPER_ADMIN', qualificacao: 'MEMBRO', aprovado: true }
})
console.log(`Super admin pronto: ${admin.email} (nível ${admin.nivelAcesso})`)
await prisma.$disconnect()
