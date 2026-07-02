// Cria (ou promove) um usuário ADMIN a partir de variáveis de ambiente.
// Use em produção para criar o primeiro administrador — em vez do seed de demo.
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
  update: { papel: 'ADMIN', ativo: true, aprovado: true, senhaHash },
  create: { nome, email, senhaHash, papel: 'ADMIN', aprovado: true }
})
console.log(`Admin pronto: ${admin.email} (papel ${admin.papel})`)
await prisma.$disconnect()
