import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'
import { hashSenha } from '../lib/password.js'
import { setGoogleApiParaTestes, limparGoogleApiParaTestes } from '../lib/google/api.js'
import { cifrar } from '../lib/google/cripto.js'

let app
const sufixo = Date.now()

let celulaId, liderId, membroId, adminId, outraCelulaId, outroLiderId
let adminToken, liderToken, membroToken, membroSemCelulaToken, outroLiderToken
let encontroId

beforeAll(async () => {
  app = buildApp()
  await app.ready()

  // ── Célula principal para testes de encontros ────────────────────────────────
  // dataPrimeiroEncontro dentro de 365 dias para o teste de estender
  const celula = await prisma.celula.create({
    data: {
      nome: `Célula Encontros ${sufixo}`,
      qrToken: `qr-encontros-${sufixo}`,
      diaSemana: 6,
      frequenciaDias: 7,
      dataPrimeiroEncontro: new Date('2026-07-05T19:30:00.000Z')
    }
  })
  celulaId = celula.id

  // ── Líder da célula ─────────────────────────────────────────────────────────
  const lider = await prisma.user.create({
    data: {
      nome: 'Lider Encontros Test',
      email: `lider-enc-${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'LIDER',
      celulaId
    }
  })
  liderId = lider.id
  await prisma.celula.update({ where: { id: celulaId }, data: { liderId } })

  // ── Membro pertencente à célula ─────────────────────────────────────────────
  const membro = await prisma.user.create({
    data: {
      nome: 'Membro Encontros Test',
      email: `membro-enc-${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'MEMBRO',
      celulaId
    }
  })
  membroId = membro.id

  // ── Admin ────────────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      nome: 'Admin Encontros Test',
      email: `admin-enc-${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'ADMIN'
    }
  })
  adminId = admin.id

  // ── Outra célula + outro líder (isolamento de escopo) ───────────────────────
  const outraCelula = await prisma.celula.create({
    data: {
      nome: `Outra Célula Encontros ${sufixo}`,
      qrToken: `qr-outra-enc-${sufixo}`,
      diaSemana: 2,
      frequenciaDias: 14,
      dataPrimeiroEncontro: new Date('2026-07-14T19:30:00.000Z')
    }
  })
  outraCelulaId = outraCelula.id

  const outroLider = await prisma.user.create({
    data: {
      nome: 'Outro Lider Encontros Test',
      email: `outro-lider-enc-${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'LIDER',
      celulaId: outraCelulaId
    }
  })
  outroLiderId = outroLider.id
  await prisma.celula.update({ where: { id: outraCelulaId }, data: { liderId: outroLiderId } })

  // ── Encontro pré-semeado para testes de PUT ──────────────────────────────────
  // Data fixa longe dos encontros gerados por estender (2026–2027), sem conflito
  const encontro = await prisma.encontro.create({
    data: {
      celulaId,
      data: new Date('2030-06-15T19:30:00.000Z'),
      status: 'AGENDADO'
    }
  })
  encontroId = encontro.id

  // ── Tokens JWT ────────────────────────────────────────────────────────────────
  adminToken = app.jwt.sign({ id: adminId, papel: 'ADMIN', celulaId: null })
  liderToken = app.jwt.sign({ id: liderId, papel: 'LIDER', celulaId })
  membroToken = app.jwt.sign({ id: membroId, papel: 'MEMBRO', celulaId })
  membroSemCelulaToken = app.jwt.sign({ id: membroId, papel: 'MEMBRO', celulaId: null })
  outroLiderToken = app.jwt.sign({ id: outroLiderId, papel: 'LIDER', celulaId: outraCelulaId })
})

afterAll(async () => {
  // Quebra referências circulares antes de deletar
  const celulaIds = [celulaId, outraCelulaId].filter(Boolean)
  if (celulaIds.length > 0) {
    await prisma.celula
      .updateMany({ where: { id: { in: celulaIds } }, data: { liderId: null } })
      .catch(() => {})
  }

  const userIds = [liderId, membroId, adminId, outroLiderId].filter(Boolean)
  if (userIds.length > 0) {
    await prisma.user
      .updateMany({ where: { id: { in: userIds } }, data: { celulaId: null, papel: 'MEMBRO' } })
      .catch(() => {})
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
  }

  // Células em cascade: apaga encontros e presenças
  if (celulaIds.length > 0) {
    await prisma.celula.deleteMany({ where: { id: { in: celulaIds } } }).catch(() => {})
  }

  await app.close()
  await prisma.$disconnect()
})

// ────────────────────────────────────────────────────────────────────────────────
// GET /celulas/:id/encontros
// ────────────────────────────────────────────────────────────────────────────────
describe('GET /celulas/:id/encontros', () => {
  it('membro da célula lista encontros (200, _count.presencas visível)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaId}/encontros`,
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { encontros } = res.json()
    expect(Array.isArray(encontros)).toBe(true)
    expect(encontros.length).toBeGreaterThan(0)
    expect(encontros[0]._count).toBeDefined()
    expect(typeof encontros[0]._count.presencas).toBe('number')
  })

  it('membro sem celulaId (não pertence à célula) recebe 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaId}/encontros`,
      headers: { authorization: `Bearer ${membroSemCelulaToken}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('líder da célula lista encontros (200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaId}/encontros`,
      headers: { authorization: `Bearer ${liderToken}` }
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json().encontros)).toBe(true)
  })

  it('líder de outra célula recebe 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaId}/encontros`,
      headers: { authorization: `Bearer ${outroLiderToken}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('admin acessa qualquer célula (200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaId}/encontros`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
  })

  it('filtra por ?desde&ate retorna apenas o encontro pré-semeado', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaId}/encontros?desde=2030-06-01&ate=2030-06-30`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { encontros } = res.json()
    expect(encontros).toHaveLength(1)
    expect(encontros[0].id).toBe(encontroId)
  })

  it('encontros retornados ordenados por data asc', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaId}/encontros`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { encontros } = res.json()
    for (let i = 1; i < encontros.length; i++) {
      expect(new Date(encontros[i].data).getTime()).toBeGreaterThanOrEqual(
        new Date(encontros[i - 1].data).getTime()
      )
    }
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// PUT /encontros/:id
// ────────────────────────────────────────────────────────────────────────────────
describe('PUT /encontros/:id', () => {
  it('líder da célula atualiza status → REALIZADO (200, persiste no banco)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/encontros/${encontroId}`,
      headers: { authorization: `Bearer ${liderToken}` },
      payload: { status: 'REALIZADO' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().encontro.status).toBe('REALIZADO')

    const enc = await prisma.encontro.findUnique({ where: { id: encontroId } })
    expect(enc.status).toBe('REALIZADO')
  })

  it('membro não pode editar encontro → 403', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/encontros/${encontroId}`,
      headers: { authorization: `Bearer ${membroToken}` },
      payload: { status: 'CANCELADO' }
    })
    expect(res.statusCode).toBe(403)
  })

  it('líder de outra célula não pode editar → 403', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/encontros/${encontroId}`,
      headers: { authorization: `Bearer ${outroLiderToken}` },
      payload: { observacao: 'Tentativa indevida' }
    })
    expect(res.statusCode).toBe(403)
  })

  it('encontro inexistente retorna 404', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/encontros/id-inexistente-xyz',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'CANCELADO' }
    })
    expect(res.statusCode).toBe(404)
  })

  it('status inválido retorna 400', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/encontros/${encontroId}`,
      headers: { authorization: `Bearer ${liderToken}` },
      payload: { status: 'STATUS_INVALIDO' }
    })
    expect(res.statusCode).toBe(400)
  })

  it('admin atualiza observação → 200', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/encontros/${encontroId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { observacao: 'Observação do admin' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().encontro.observacao).toBe('Observação do admin')
  })

  // Fix 2: editar data para colidir com outro encontro da mesma célula → 409
  it('editar data para colisão com outro encontro da mesma célula → 409', async () => {
    // Cria um segundo encontro com data diferente da de encontroId (2030-06-15)
    const enc2 = await prisma.encontro.create({
      data: {
        celulaId,
        data: new Date('2030-07-15T19:30:00.000Z'),
        status: 'AGENDADO'
      }
    })

    // Tenta mover enc2 para a mesma data que encontroId
    const res = await app.inject({
      method: 'PUT',
      url: `/encontros/${enc2.id}`,
      headers: { authorization: `Bearer ${liderToken}` },
      payload: { data: '2030-06-15T19:30:00.000Z' }
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().erro).toBe('Já existe um encontro nessa data')

    // Cleanup
    await prisma.encontro.delete({ where: { id: enc2.id } }).catch(() => {})
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// POST /celulas/:id/encontros (avulso)
// ────────────────────────────────────────────────────────────────────────────────
describe('POST /celulas/:id/encontros', () => {
  const dataAvulso = new Date(Date.UTC(2099, 0, 1, 19, 30, 0)).toISOString()

  it('líder cria encontro avulso → 201, status AGENDADO', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celulaId}/encontros`,
      headers: { authorization: `Bearer ${liderToken}` },
      payload: { data: dataAvulso, observacao: 'Encontro especial avulso' }
    })
    expect(res.statusCode).toBe(201)
    const { encontro } = res.json()
    expect(encontro).toBeDefined()
    expect(encontro.celulaId).toBe(celulaId)
    expect(encontro.status).toBe('AGENDADO')
    expect(encontro.observacao).toBe('Encontro especial avulso')
  })

  it('duplicata de data → 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celulaId}/encontros`,
      headers: { authorization: `Bearer ${liderToken}` },
      payload: { data: dataAvulso }
    })
    expect(res.statusCode).toBe(409)
  })

  it('membro não pode criar encontro avulso → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celulaId}/encontros`,
      headers: { authorization: `Bearer ${membroToken}` },
      payload: { data: '2099-02-01T19:30:00.000Z' }
    })
    expect(res.statusCode).toBe(403)
  })

  it('líder de outra célula não pode criar avulso → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celulaId}/encontros`,
      headers: { authorization: `Bearer ${outroLiderToken}` },
      payload: { data: '2099-03-01T19:30:00.000Z' }
    })
    expect(res.statusCode).toBe(403)
  })

  it('body sem data retorna 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celulaId}/encontros`,
      headers: { authorization: `Bearer ${liderToken}` },
      payload: { observacao: 'Sem data' }
    })
    expect(res.statusCode).toBe(400)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// POST /celulas/:id/encontros/estender
// ────────────────────────────────────────────────────────────────────────────────
describe('POST /celulas/:id/encontros/estender', () => {
  it('líder estende com horizonte de 365 dias → criados > 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celulaId}/encontros/estender`,
      headers: { authorization: `Bearer ${liderToken}` },
      payload: { horizonteDias: 365 }
    })
    expect(res.statusCode).toBe(200)
    const { criados } = res.json()
    expect(typeof criados).toBe('number')
    expect(criados).toBeGreaterThan(0)
  })

  it('chamar estender novamente no mesmo horizonte não duplica (criados = 0)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celulaId}/encontros/estender`,
      headers: { authorization: `Bearer ${liderToken}` },
      payload: { horizonteDias: 365 }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().criados).toBe(0)
  })

  it('líder de outra célula não pode estender → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celulaId}/encontros/estender`,
      headers: { authorization: `Bearer ${outroLiderToken}` },
      payload: { horizonteDias: 90 }
    })
    expect(res.statusCode).toBe(403)
  })

  it('horizonteDias inválido (negativo) retorna 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celulaId}/encontros/estender`,
      headers: { authorization: `Bearer ${liderToken}` },
      payload: { horizonteDias: -10 }
    })
    expect(res.statusCode).toBe(400)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// Sync Google Calendar — disparo nas mutações
// ────────────────────────────────────────────────────────────────────────────────
describe('Sincronização Google Calendar nas mutações', () => {
  it('editar encontro dispara sincronização para membros vinculados', async () => {
    const origKey = process.env.TOKEN_ENC_KEY
    process.env.TOKEN_ENC_KEY = '0'.repeat(64)

    let criados = 0
    setGoogleApiParaTestes({
      async accessTokenDe() { return 'at' },
      async criarEvento() { criados++; return 'gev' },
      async atualizarEvento() {},
      async removerEvento() {},
      async garantirCalendario() { return 'cal' },
      async montarAuthUrl() { return '' },
      async trocarCode() { return {} }
    })

    const sufixoSync = Date.now()
    let celulaSync, liderSync, membroSync, encSync

    try {
      celulaSync = await prisma.celula.create({
        data: {
          nome: `Celula Sync ${sufixoSync}`,
          qrToken: `qr-sync-${sufixoSync}`,
          diaSemana: 5,
          frequenciaDias: 7,
          dataPrimeiroEncontro: new Date('2040-01-01T19:30:00.000Z')
        }
      })

      liderSync = await prisma.user.create({
        data: {
          nome: 'Lider Sync Test',
          email: `lider-sync-${sufixoSync}@test.com`,
          senhaHash: await hashSenha('senha123'),
          papel: 'LIDER',
          celulaId: celulaSync.id
        }
      })
      await prisma.celula.update({ where: { id: celulaSync.id }, data: { liderId: liderSync.id } })

      membroSync = await prisma.user.create({
        data: {
          nome: 'Membro Sync Google',
          email: `membro-sync-${sufixoSync}@test.com`,
          senhaHash: await hashSenha('senha123'),
          papel: 'MEMBRO',
          celulaId: celulaSync.id,
          googleConectado: true,
          googleCalendarId: 'cal-id-test',
          googleRefreshTokenEnc: cifrar('rt', '0'.repeat(64))
        }
      })

      encSync = await prisma.encontro.create({
        data: {
          celulaId: celulaSync.id,
          data: new Date('2040-06-15T19:30:00.000Z'),
          status: 'AGENDADO'
        }
      })

      const liderSyncToken = app.jwt.sign({ id: liderSync.id, papel: 'LIDER', celulaId: celulaSync.id })

      const res = await app.inject({
        method: 'PUT',
        url: `/encontros/${encSync.id}`,
        headers: { authorization: `Bearer ${liderSyncToken}` },
        payload: { observacao: 'Teste sync' }
      })

      expect(res.statusCode).toBe(200)
      expect(criados).toBeGreaterThan(0)
    } finally {
      // Cleanup FK-safe: googleEventoSync → encontro → users → célula
      if (encSync?.id) {
        await prisma.googleEventoSync.deleteMany({ where: { encontroId: encSync.id } }).catch(() => {})
      }
      if (celulaSync?.id) {
        await prisma.encontro.deleteMany({ where: { celulaId: celulaSync.id } }).catch(() => {})
        await prisma.celula.update({ where: { id: celulaSync.id }, data: { liderId: null } }).catch(() => {})
      }
      const syncUserIds = [liderSync?.id, membroSync?.id].filter(Boolean)
      if (syncUserIds.length > 0) {
        await prisma.user.updateMany({ where: { id: { in: syncUserIds } }, data: { celulaId: null } }).catch(() => {})
        await prisma.user.deleteMany({ where: { id: { in: syncUserIds } } }).catch(() => {})
      }
      if (celulaSync?.id) {
        await prisma.celula.delete({ where: { id: celulaSync.id } }).catch(() => {})
      }

      limparGoogleApiParaTestes()
      if (origKey !== undefined) {
        process.env.TOKEN_ENC_KEY = origKey
      } else {
        delete process.env.TOKEN_ENC_KEY
      }
    }
  })
})
