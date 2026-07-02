// Provisiona o usuário DONO (SUPER_ADMIN) a partir de variáveis de ambiente.
// Roda no entrypoint em todo deploy quando ADMIN_EMAIL + ADMIN_SENHA existem.
//
//   ADMIN_EMAIL=voce@dominio.com ADMIN_SENHA='umaSenhaForte' \
//   ADMIN_NOME='Seu Nome' npm run admin --workspace apps/api
//
// IMPORTANTE (regra durável do dono): se a conta JÁ existe, este script NÃO
// sobrescreve nada — nem nome, nem qualificação, nem senha. Assim, o que o dono
// personalizar na plataforma (ex.: nome, virar "Pastor", trocar a senha) PERSISTE
// entre deploys. O nível/ativo/aprovado do super admin são garantidos, de forma
// idempotente e sem tocar no resto, por garantir-super-admin.js.
import { prisma } from '../src/prisma.js'
import { hashSenha } from '../src/lib/password.js'

const email = process.env.ADMIN_EMAIL
const senha = process.env.ADMIN_SENHA
const nome = process.env.ADMIN_NOME || 'Administrador'

if (!email || !senha) {
  console.error('Defina ADMIN_EMAIL e ADMIN_SENHA no ambiente.')
  process.exit(1)
}

const existente = await prisma.user.findUnique({ where: { email }, select: { id: true } })

if (!existente) {
  // Primeira vez: cria o dono com a senha inicial do ambiente.
  const admin = await prisma.user.create({
    data: {
      nome, email, senhaHash: await hashSenha(senha),
      nivelAcesso: 'SUPER_ADMIN', qualificacao: 'MEMBRO', aprovado: true, ativo: true,
    },
  })
  console.log(`[admin] Super admin criado: ${admin.email}`)
} else {
  // Já existe: preserva nome/qualificação/senha personalizados pelo dono.
  console.log(`[admin] ${email} já existe — preservando nome/qualificação/senha (acesso garantido à parte).`)
}

await prisma.$disconnect()
