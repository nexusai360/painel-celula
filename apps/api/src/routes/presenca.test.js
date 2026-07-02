import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'
import { hashSenha } from '../lib/password.js'

let app
const sufixo = Date.now()

// ── IDs principais ────────────────────────────────────────────────────────────
let celulaId, outraCelulaId, celulaFreqId
let liderId, membroId, outroCelulaMembroId, adminId
let liderFreqId, membro1FreqId, membro2FreqId

// ── Encontros ─────────────────────────────────────────────────────────────────
let encontroPostId    // hoje → dentro da janela (POST tests)
let encontroDeleteId  // hoje (− 1 min) → dentro da janela (DELETE tests)
let encontroFuturoId  // + 5 dias → fora da janela
let encontroExpiradoId // − 5 dias → fora da janela
let encontroRealizadoFreqId // para testes de frequência

// ── Tokens ────────────────────────────────────────────────────────────────────
let liderToken, membroToken, outroCelulaMembroToken, adminToken, liderFreqToken, outroLiderToken

beforeAll(async () => {
  app = buildApp()
  await app.ready()

  const now = Date.now()

  // ── Célula principal ───────────────────────────────────────────────────────
  const celula = await prisma.celula.create({
    data: {
      nome: `Célula Presença ${sufixo}`,
      qrToken: `qr-pres-${sufixo}`,
      diaSemana: 3,
      frequenciaDias: 7,
      dataPrimeiroEncontro: new Date('2099-01-01T19:00:00.000Z')
    }
  })
  celulaId = celula.id

  // ── Líder da célula principal ──────────────────────────────────────────────
  const lider = await prisma.user.create({
    data: {
      nome: 'Lider Pres Test',
      email: `lider-pres-${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'LIDER',
      celulaId
    }
  })
  liderId = lider.id
  await prisma.celula.update({ where: { id: celulaId }, data: { liderId } })

  // ── Membro da célula principal ─────────────────────────────────────────────
  const membro = await prisma.user.create({
    data: {
      nome: 'Membro Pres Test',
      email: `membro-pres-${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'MEMBRO',
      celulaId
    }
  })
  membroId = membro.id

  // ── Outra célula + membro dela (para teste de escopo) ─────────────────────
  const outraCelula = await prisma.celula.create({
    data: {
      nome: `Outra Célula Pres ${sufixo}`,
      qrToken: `qr-outra-pres-${sufixo}`,
      diaSemana: 1,
      frequenciaDias: 14,
      dataPrimeiroEncontro: new Date('2099-02-01T19:00:00.000Z')
    }
  })
  outraCelulaId = outraCelula.id

  // Líder da outra célula (para teste de escopo em GET /presencas)
  const outroLider = await prisma.user.create({
    data: {
      nome: 'Outro Lider Pres Test',
      email: `outro-lider-pres-${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'LIDER',
      celulaId: outraCelulaId
    }
  })
  await prisma.celula.update({ where: { id: outraCelulaId }, data: { liderId: outroLider.id } })
  outroLiderToken = app.jwt.sign({ id: outroLider.id, papel: 'LIDER', celulaId: outraCelulaId })

  const outroMembro = await prisma.user.create({
    data: {
      nome: 'Outro Membro Pres Test',
      email: `outro-membro-pres-${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'MEMBRO',
      celulaId: outraCelulaId
    }
  })
  outroCelulaMembroId = outroMembro.id

  // ── Admin ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      nome: 'Admin Pres Test',
      email: `admin-pres-${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'ADMIN'
    }
  })
  adminId = admin.id

  // ── Encontros da célula principal ──────────────────────────────────────────
  // encontroPost: hoje (dentro da janela)
  const enc1 = await prisma.encontro.create({
    data: { celulaId, data: new Date(now), status: 'AGENDADO' }
  })
  encontroPostId = enc1.id

  // encontroDelete: 1 minuto atrás (mesmo dia, dentro da janela)
  const enc2 = await prisma.encontro.create({
    data: { celulaId, data: new Date(now - 60 * 1000), status: 'AGENDADO' }
  })
  encontroDeleteId = enc2.id

  // encontroFuturo: 5 dias à frente (fora da janela)
  const enc3 = await prisma.encontro.create({
    data: { celulaId, data: new Date(now + 5 * 24 * 60 * 60 * 1000), status: 'AGENDADO' }
  })
  encontroFuturoId = enc3.id

  // encontroExpirado: 5 dias atrás (fora da janela)
  const enc4 = await prisma.encontro.create({
    data: { celulaId, data: new Date(now - 5 * 24 * 60 * 60 * 1000), status: 'AGENDADO' }
  })
  encontroExpiradoId = enc4.id

  // ── Célula de frequência ───────────────────────────────────────────────────
  const celulaFreq = await prisma.celula.create({
    data: {
      nome: `Célula Frequência ${sufixo}`,
      qrToken: `qr-freq-${sufixo}`,
      diaSemana: 5,
      frequenciaDias: 7,
      dataPrimeiroEncontro: new Date('2099-03-01T19:00:00.000Z')
    }
  })
  celulaFreqId = celulaFreq.id

  const liderFreq = await prisma.user.create({
    data: {
      nome: 'Lider Freq Test',
      email: `lider-freq-${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'LIDER',
      celulaId: celulaFreqId
    }
  })
  liderFreqId = liderFreq.id
  await prisma.celula.update({ where: { id: celulaFreqId }, data: { liderId: liderFreqId } })

  const membro1Freq = await prisma.user.create({
    data: {
      nome: 'Membro1 Freq Test',
      email: `membro1-freq-${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'MEMBRO',
      celulaId: celulaFreqId
    }
  })
  membro1FreqId = membro1Freq.id

  const membro2Freq = await prisma.user.create({
    data: {
      nome: 'Membro2 Freq Test',
      email: `membro2-freq-${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'MEMBRO',
      celulaId: celulaFreqId
    }
  })
  membro2FreqId = membro2Freq.id

  // Encontro realizado para frequência (status REALIZADO)
  const encFreq = await prisma.encontro.create({
    data: {
      celulaId: celulaFreqId,
      data: new Date(now - 7 * 24 * 60 * 60 * 1000),
      status: 'REALIZADO'
    }
  })
  encontroRealizadoFreqId = encFreq.id

  // membro1 marcou presença nesse encontro realizado
  await prisma.presenca.create({
    data: { encontroId: encontroRealizadoFreqId, userId: membro1FreqId }
  })

  // ── Tokens JWT ─────────────────────────────────────────────────────────────
  liderToken = app.jwt.sign({ id: liderId, papel: 'LIDER', celulaId })
  membroToken = app.jwt.sign({ id: membroId, papel: 'MEMBRO', celulaId })
  outroCelulaMembroToken = app.jwt.sign({ id: outroCelulaMembroId, papel: 'MEMBRO', celulaId: outraCelulaId })
  adminToken = app.jwt.sign({ id: adminId, papel: 'ADMIN', celulaId: null })
  liderFreqToken = app.jwt.sign({ id: liderFreqId, papel: 'LIDER', celulaId: celulaFreqId })
})

afterAll(async () => {
  // 1. Remover presenças explicitamente (FK segura antes de deletar users)
  const todosEncontroIds = [
    encontroPostId, encontroDeleteId, encontroFuturoId,
    encontroExpiradoId, encontroRealizadoFreqId
  ].filter(Boolean)
  if (todosEncontroIds.length > 0) {
    await prisma.presenca.deleteMany({ where: { encontroId: { in: todosEncontroIds } } }).catch(() => {})
  }

  // 2. Quebrar referências circulares liderId nas células
  const todasCelulaIds = [celulaId, outraCelulaId, celulaFreqId].filter(Boolean)
  if (todasCelulaIds.length > 0) {
    await prisma.celula.updateMany({ where: { id: { in: todasCelulaIds } }, data: { liderId: null } }).catch(() => {})
  }

  // 3. Desassociar e deletar users
  const todosUserIds = [liderId, membroId, outroCelulaMembroId, adminId, liderFreqId, membro1FreqId, membro2FreqId].filter(Boolean)
  // Também buscar o outroLider (criado inline sem variável global separada)
  if (todosUserIds.length > 0) {
    await prisma.user.updateMany({ where: { id: { in: todosUserIds } }, data: { celulaId: null, papel: 'MEMBRO' } }).catch(() => {})
    await prisma.user.deleteMany({ where: { id: { in: todosUserIds } } }).catch(() => {})
  }
  // Deletar outroLider pelo email (criado sem variável de ID exposta)
  await prisma.user.deleteMany({ where: { email: `outro-lider-pres-${sufixo}@test.com` } }).catch(() => {})

  // 4. Deletar células (cascade: encontros → presenças)
  if (todasCelulaIds.length > 0) {
    await prisma.celula.deleteMany({ where: { id: { in: todasCelulaIds } } }).catch(() => {})
  }

  await app.close()
  await prisma.$disconnect()
})

// ────────────────────────────────────────────────────────────────────────────────
// POST /encontros/:id/presenca
// ────────────────────────────────────────────────────────────────────────────────
describe('POST /encontros/:id/presenca', () => {
  it('membro marca presença no encontro de hoje → 201 com { presenca, totalPresencas }', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/encontros/${encontroPostId}/presenca`,
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(201)
    const { presenca, totalPresencas } = res.json()
    expect(presenca).toBeDefined()
    expect(presenca.encontroId).toBe(encontroPostId)
    expect(presenca.userId).toBe(membroId)
    expect(typeof totalPresencas).toBe('number')
  })

  it('repetir a marcação é idempotente → 200 com { presenca, totalPresencas }', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/encontros/${encontroPostId}/presenca`,
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { presenca, totalPresencas } = res.json()
    expect(presenca).toBeDefined()
    expect(presenca.encontroId).toBe(encontroPostId)
    expect(presenca.userId).toBe(membroId)
    expect(typeof totalPresencas).toBe('number')
  })

  it('marcar encontro futuro → 403 com { erro: motivo }', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/encontros/${encontroFuturoId}/presenca`,
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(403)
    const body = res.json()
    expect(body.erro).toBeDefined()
    expect(typeof body.erro).toBe('string')
  })

  it('marcar encontro retroativo (5 dias atrás) → 201 (permitido)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/encontros/${encontroExpiradoId}/presenca`,
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(201)
    const { presenca, totalPresencas } = res.json()
    expect(presenca).toBeDefined()
    expect(typeof totalPresencas).toBe('number')
  })

  it('membro de outra célula tentando marcar → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/encontros/${encontroPostId}/presenca`,
      headers: { authorization: `Bearer ${outroCelulaMembroToken}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('sem token → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/encontros/${encontroPostId}/presenca`
    })
    expect(res.statusCode).toBe(401)
  })

  it('encontro inexistente → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/encontros/id-inexistente-xyz/presenca',
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(404)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// DELETE /encontros/:id/presenca
// ────────────────────────────────────────────────────────────────────────────────
describe('DELETE /encontros/:id/presenca', () => {
  beforeAll(async () => {
    // Garantir que existe uma presença para deletar
    await prisma.presenca.upsert({
      where: { encontroId_userId: { encontroId: encontroDeleteId, userId: membroId } },
      create: { encontroId: encontroDeleteId, userId: membroId },
      update: {}
    })
  })

  it('membro remove presença → 200 com { totalPresencas }', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/encontros/${encontroDeleteId}/presenca`,
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { totalPresencas } = res.json()
    expect(typeof totalPresencas).toBe('number')
    // Confirma que foi removida do banco
    const presenca = await prisma.presenca.findUnique({
      where: { encontroId_userId: { encontroId: encontroDeleteId, userId: membroId } }
    })
    expect(presenca).toBeNull()
  })

  it('DELETE idempotente (presença já inexistente) → 200 com { totalPresencas }', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/encontros/${encontroDeleteId}/presenca`,
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(200)
    expect(typeof res.json().totalPresencas).toBe('number')
  })

  it('DELETE retroativo (encontro de dias atrás) → 200 (permitido)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/encontros/${encontroExpiradoId}/presenca`,
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(200)
    expect(typeof res.json().totalPresencas).toBe('number')
  })

  it('encontro inexistente → 404', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/encontros/nao-existe-xyz/presenca',
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  // Fix 4: membership guard no DELETE — simetria com POST
  it('membro de outra célula tenta remover presença → 403', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/encontros/${encontroDeleteId}/presenca`,
      headers: { authorization: `Bearer ${outroCelulaMembroToken}` }
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().erro).toBe('Você não participa desta célula')
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// GET /encontros/:id/presencas
// ────────────────────────────────────────────────────────────────────────────────
describe('GET /encontros/:id/presencas', () => {
  beforeAll(async () => {
    // Garantir que existe ao menos uma presença para o encontroPost
    await prisma.presenca.upsert({
      where: { encontroId_userId: { encontroId: encontroPostId, userId: membroId } },
      create: { encontroId: encontroPostId, userId: membroId },
      update: {}
    })
  })

  it('líder lista presenças do seu encontro → 200 com { presencas, total }', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/encontros/${encontroPostId}/presencas`,
      headers: { authorization: `Bearer ${liderToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { presencas, total } = res.json()
    expect(Array.isArray(presencas)).toBe(true)
    expect(presencas.length).toBeGreaterThan(0)
    expect(typeof total).toBe('number')
    expect(total).toBe(presencas.length)
  })

  it('cada presença inclui nome do usuário mas NUNCA senhaHash', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/encontros/${encontroPostId}/presencas`,
      headers: { authorization: `Bearer ${liderToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { presencas } = res.json()
    for (const p of presencas) {
      expect(p.user).toBeDefined()
      expect(p.user.nome).toBeDefined()
      expect(p.user.id).toBeDefined()
      expect(p.user.senhaHash).toBeUndefined()
    }
  })

  it('líder de outra célula não pode listar → 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/encontros/${encontroPostId}/presencas`,
      headers: { authorization: `Bearer ${outroLiderToken}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('membro não pode listar → 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/encontros/${encontroPostId}/presencas`,
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('admin lista qualquer encontro → 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/encontros/${encontroPostId}/presencas`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
  })

  it('encontro inexistente → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/encontros/nao-existe-xyz/presencas',
      headers: { authorization: `Bearer ${liderToken}` }
    })
    expect(res.statusCode).toBe(404)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// GET /celulas/:id/frequencia
// ────────────────────────────────────────────────────────────────────────────────
describe('GET /celulas/:id/frequencia', () => {
  it('líder obtém relatório de frequência coerente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaFreqId}/frequencia`,
      headers: { authorization: `Bearer ${liderFreqToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { totalEncontrosRealizados, porPessoa, ranking, ausentes } = res.json()

    // 1 encontro realizado semeado no beforeAll
    expect(totalEncontrosRealizados).toBe(1)

    // Célula tem: lider + membro1 + membro2 = 3 membros com celulaId = celulaFreqId
    expect(Array.isArray(porPessoa)).toBe(true)
    expect(porPessoa.length).toBe(3)

    // membro1 tem 1 presença → percentual 100%
    const entradaMembro1 = porPessoa.find(p => p.userId === membro1FreqId)
    expect(entradaMembro1).toBeDefined()
    expect(entradaMembro1.presencas).toBe(1)
    expect(entradaMembro1.percentual).toBe(100)
    expect(entradaMembro1.nome).toBe('Membro1 Freq Test')
    expect(entradaMembro1.senhaHash).toBeUndefined()

    // membro2 tem 0 presenças
    const entradaMembro2 = porPessoa.find(p => p.userId === membro2FreqId)
    expect(entradaMembro2).toBeDefined()
    expect(entradaMembro2.presencas).toBe(0)
    expect(entradaMembro2.percentual).toBe(0)
  })

  it('ranking ordenado descrescente por presenças', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaFreqId}/frequencia`,
      headers: { authorization: `Bearer ${liderFreqToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { ranking } = res.json()
    expect(Array.isArray(ranking)).toBe(true)
    // ranking[0] é quem tem mais presenças
    expect(ranking[0].userId).toBe(membro1FreqId)
    expect(ranking[0].presencas).toBe(1)
    // demais têm <= presencas do primeiro
    for (let i = 1; i < ranking.length; i++) {
      expect(ranking[i].presencas).toBeLessThanOrEqual(ranking[i - 1].presencas)
    }
  })

  it('ausentes: membros com 0 presenças nos encontros realizados', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaFreqId}/frequencia`,
      headers: { authorization: `Bearer ${liderFreqToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { ausentes } = res.json()
    expect(Array.isArray(ausentes)).toBe(true)
    // membro2 e lider têm 0 presenças → ausentes tem 2
    expect(ausentes.length).toBe(2)
    const ausenteIds = ausentes.map(a => a.userId)
    expect(ausenteIds).toContain(membro2FreqId)
    expect(ausenteIds).toContain(liderFreqId)
    // ausentes não expõe senhaHash
    for (const a of ausentes) {
      expect(a.senhaHash).toBeUndefined()
    }
  })

  it('admin acessa frequência de qualquer célula → 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaFreqId}/frequencia`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
  })

  it('líder de outra célula não pode acessar frequência → 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaFreqId}/frequencia`,
      headers: { authorization: `Bearer ${outroLiderToken}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('célula inexistente → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/celulas/nao-existe-xyz/frequencia',
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('porPessoa não vaza senhaHash', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaFreqId}/frequencia`,
      headers: { authorization: `Bearer ${liderFreqToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { porPessoa } = res.json()
    for (const p of porPessoa) {
      expect(p.senhaHash).toBeUndefined()
    }
  })

  // Fix 6: MEMBRO não pode acessar frequência (requireRole('LIDER')) → 403
  it('membro não pode acessar frequência → 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaFreqId}/frequencia`,
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(403)
  })
})
