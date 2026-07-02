import { prisma } from '../src/prisma.js'
import { hashSenha } from '../src/lib/password.js'
import { materializarEncontros } from '../src/lib/encontros.service.js'

const SENHA = '123456'

async function upsertUsuario(nome, email, papel, celulaId = null) {
  return prisma.user.upsert({
    where: { email },
    update: { papel, celulaId },
    create: { nome, email, senhaHash: await hashSenha(SENHA), papel, celulaId }
  })
}

// Encontra ou cria um encontro hoje 19:30 (para permitir marcar presença na demo)
async function ensureEncontroHoje(celulaId) {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)
  const existente = await prisma.encontro.findFirst({
    where: { celulaId, data: { gte: inicio, lte: fim } }
  })
  if (existente) return existente
  const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 19, 30, 0)
  return prisma.encontro.create({ data: { celulaId, data, status: 'REALIZADO' } })
}

async function main() {
  // Admin global
  const admin = await prisma.user.upsert({
    where: { email: 'admin@icelula.app' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@icelula.app',
      senhaHash: await hashSenha('admin123'),
      papel: 'ADMIN'
    }
  })

  // Célula de exemplo — primeiro encontro há 3 semanas (gera passado + futuro)
  const hoje = new Date()
  const tresSemanasAtras = new Date(hoje.getTime() - 21 * 86400000)
  tresSemanasAtras.setHours(19, 30, 0, 0)

  const dadosCelula = {
    nome: 'Célula Esperança',
    descricao: 'Célula de exemplo criada pelo seed',
    diaSemana: tresSemanasAtras.getDay(),
    frequenciaDias: 7,
    dataPrimeiroEncontro: tresSemanasAtras
  }
  const celula = await prisma.celula.upsert({
    where: { qrToken: 'celula-exemplo' },
    update: dadosCelula,
    create: { qrToken: 'celula-exemplo', ...dadosCelula }
  })

  // Líder + membros
  const lider = await upsertUsuario('Líder Exemplo', 'lider@icelula.app', 'LIDER', celula.id)
  if (celula.liderId !== lider.id) {
    await prisma.celula.update({ where: { id: celula.id }, data: { liderId: lider.id } })
  }
  const membros = await Promise.all([
    upsertUsuario('Ana Souza', 'ana@icelula.app', 'MEMBRO', celula.id),
    upsertUsuario('Bruno Lima', 'bruno@icelula.app', 'MEMBRO', celula.id),
    upsertUsuario('Carla Dias', 'carla@icelula.app', 'MEMBRO', celula.id)
  ])

  // Materializa encontros do cronograma + garante um encontro hoje
  await materializarEncontros(celula.id, { horizonteDias: 90 })
  const encontroHoje = await ensureEncontroHoje(celula.id)

  // Algumas presenças para popular a frequência
  const passados = await prisma.encontro.findMany({
    where: { celulaId: celula.id, data: { lte: hoje } },
    orderBy: { data: 'asc' }
  })
  for (const enc of passados) {
    for (const m of membros.slice(0, 2)) {
      await prisma.presenca.upsert({
        where: { encontroId_userId: { encontroId: enc.id, userId: m.id } },
        update: {},
        create: { encontroId: enc.id, userId: m.id }
      })
    }
  }
  // Líder também presente no encontro de hoje
  await prisma.presenca.upsert({
    where: { encontroId_userId: { encontroId: encontroHoje.id, userId: lider.id } },
    update: {},
    create: { encontroId: encontroHoje.id, userId: lider.id }
  })

  console.log('Seed concluído.')
  console.log(`  Admin:  ${admin.email} / admin123`)
  console.log(`  Líder:  ${lider.email} / ${SENHA}`)
  console.log(`  Membros: ana@ / bruno@ / carla@icelula.app / ${SENHA}`)
  console.log(`  Célula: ${celula.nome} (QR: /c/celula-exemplo)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
