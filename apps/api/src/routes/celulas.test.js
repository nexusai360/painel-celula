import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'
import { hashSenha } from '../lib/password.js'

let app
const sufixo = Date.now()
const qrToken = `qr-public-${sufixo}`
let celulaId

// Estado compartilhado para testes de CRUD
let adminId, membroId, futuroLiderId, lider2Id
let adminToken, membroToken, futuroLiderToken, lider2Token
let celulaCrudId, celula2Id

// Estado para testes de sincronia de liderId (Fix 4)
let celulaAId, celulaBId, liderAId

beforeAll(async () => {
  app = buildApp()
  await app.ready()

  // ── Célula pública (testes existentes) ──────────────────────────────────────
  const c = await prisma.celula.create({
    data: {
      nome: 'Célula Pública Teste',
      qrToken,
      diaSemana: 4,
      frequenciaDias: 7,
      dataPrimeiroEncontro: new Date('2026-07-02T19:30:00')
    }
  })
  celulaId = c.id

  // ── Usuários para testes de CRUD ─────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      nome: 'Admin Test',
      email: `admin${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'ADMIN'
    }
  })
  adminId = admin.id

  const membro = await prisma.user.create({
    data: {
      nome: 'Membro Test',
      email: `membro${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'MEMBRO'
    }
  })
  membroId = membro.id

  const futuroLider = await prisma.user.create({
    data: {
      nome: 'Futuro Lider Test',
      email: `futlider${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'MEMBRO'
    }
  })
  futuroLiderId = futuroLider.id

  // ── Célula + líder para teste de isolamento de escopo ─────────────────────────
  const celula2 = await prisma.celula.create({
    data: {
      nome: `Célula Escopo ${sufixo}`,
      qrToken: `qr-escopo-${sufixo}`,
      diaSemana: 2,
      frequenciaDias: 14,
      dataPrimeiroEncontro: new Date('2026-07-10T19:30:00')
    }
  })
  celula2Id = celula2.id

  const lider2 = await prisma.user.create({
    data: {
      nome: 'Lider 2 Test',
      email: `lider2_${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'LIDER',
      celulaId: celula2Id
    }
  })
  lider2Id = lider2.id

  await prisma.celula.update({ where: { id: celula2Id }, data: { liderId: lider2Id } })

  // ── Células e líder para teste de sincronia (Fix 4) ──────────────────────────
  const celulaA = await prisma.celula.create({
    data: {
      nome: `Célula A Sincronia ${sufixo}`,
      qrToken: `qr-celula-a-${sufixo}`,
      diaSemana: 1,
      frequenciaDias: 7,
      dataPrimeiroEncontro: new Date('2026-07-07T19:30:00')
    }
  })
  celulaAId = celulaA.id

  const liderA = await prisma.user.create({
    data: {
      nome: 'Lider A Sincronia Test',
      email: `lidera_${sufixo}@test.com`,
      senhaHash: await hashSenha('senha123'),
      papel: 'LIDER',
      celulaId: celulaAId
    }
  })
  liderAId = liderA.id

  await prisma.celula.update({ where: { id: celulaAId }, data: { liderId: liderAId } })

  const celulaB = await prisma.celula.create({
    data: {
      nome: `Célula B Sincronia ${sufixo}`,
      qrToken: `qr-celula-b-${sufixo}`,
      diaSemana: 5,
      frequenciaDias: 7,
      dataPrimeiroEncontro: new Date('2026-07-11T19:30:00')
    }
  })
  celulaBId = celulaB.id

  // ── Tokens JWT ────────────────────────────────────────────────────────────────
  adminToken = app.jwt.sign({ id: adminId, papel: 'ADMIN', celulaId: null })
  membroToken = app.jwt.sign({ id: membroId, papel: 'MEMBRO', celulaId: null })
  // futuroLider recebe papel LIDER no token para poder acessar rotas LIDER+
  futuroLiderToken = app.jwt.sign({ id: futuroLiderId, papel: 'LIDER', celulaId: null })
  lider2Token = app.jwt.sign({ id: lider2Id, papel: 'LIDER', celulaId: celula2Id })
})

afterAll(async () => {
  // Quebra referências circulares antes de deletar
  const celulaIdsToClear = [celulaCrudId, celula2Id, celulaAId, celulaBId].filter(Boolean)
  if (celulaIdsToClear.length > 0) {
    await prisma.celula.updateMany({
      where: { id: { in: celulaIdsToClear } },
      data: { liderId: null }
    }).catch(() => {})
  }

  const userIds = [adminId, membroId, futuroLiderId, lider2Id, liderAId].filter(Boolean)
  if (userIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { celulaId: null, papel: 'MEMBRO' }
    }).catch(() => {})
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
  }

  // Deleta células (cascade apaga encontros e presenças)
  const allCelulaIds = [celulaId, celulaCrudId, celula2Id, celulaAId, celulaBId].filter(Boolean)
  if (allCelulaIds.length > 0) {
    await prisma.celula.deleteMany({ where: { id: { in: allCelulaIds } } }).catch(() => {})
  }

  await app.close()
  await prisma.$disconnect()
})

// ────────────────────────────────────────────────────────────────────────────────
// Testes públicos existentes
// ────────────────────────────────────────────────────────────────────────────────
describe('GET /public/celula/:qrToken', () => {
  it('retorna apenas o nome da célula existente', async () => {
    const res = await app.inject({ method: 'GET', url: `/public/celula/${qrToken}` })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toEqual({ nome: 'Célula Pública Teste' })
    expect(body.qrToken).toBeUndefined()
  })

  it('retorna 404 para qrToken inexistente', async () => {
    const res = await app.inject({ method: 'GET', url: '/public/celula/qr-nao-existe-xyz' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ erro: 'Célula não encontrada' })
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// POST /celulas
// ────────────────────────────────────────────────────────────────────────────────
describe('POST /celulas', () => {
  it('admin cria célula → 201, qrToken presente, encontros materializados', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/celulas',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        nome: `Célula CRUD ${sufixo}`,
        diaSemana: 3,
        frequenciaDias: 7,
        dataPrimeiroEncontro: '2026-07-03T19:30:00'
      }
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.celula).toBeDefined()
    expect(body.celula.qrToken).toBeTypeOf('string')
    expect(body.celula.qrToken.length).toBeGreaterThan(0)
    celulaCrudId = body.celula.id

    // Verifica que encontros foram materializados
    const count = await prisma.encontro.count({ where: { celulaId: celulaCrudId } })
    expect(count).toBeGreaterThan(0)
  })

  it('body inválido retorna 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/celulas',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { nome: 'Sem campos obrigatórios' }
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().erro).toBeDefined()
  })

  it('membro não pode criar célula → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/celulas',
      headers: { authorization: `Bearer ${membroToken}` },
      payload: {
        nome: 'Célula Bloqueada',
        diaSemana: 2,
        frequenciaDias: 7,
        dataPrimeiroEncontro: '2026-07-10T19:30:00'
      }
    })
    expect(res.statusCode).toBe(403)
  })

  it('sem token retorna 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/celulas',
      payload: { nome: 'X', diaSemana: 1, frequenciaDias: 7, dataPrimeiroEncontro: '2026-07-01' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('líder não pode criar célula → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/celulas',
      headers: { authorization: `Bearer ${lider2Token}` },
      payload: {
        nome: 'Célula Bloqueada Lider',
        diaSemana: 2,
        frequenciaDias: 7,
        dataPrimeiroEncontro: '2026-07-10T19:30:00'
      }
    })
    expect(res.statusCode).toBe(403)
  })

  // Fix 1: liderId já é líder de outra célula → 409 (não retenta com novo qrToken)
  it('liderId que já lidera outra célula → 409 com mensagem específica', async () => {
    // lider2Id já lidera celula2Id (criado no beforeAll)
    const res = await app.inject({
      method: 'POST',
      url: '/celulas',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        nome: `Célula Conflito Lider ${sufixo}`,
        diaSemana: 1,
        frequenciaDias: 7,
        dataPrimeiroEncontro: '2026-08-01T19:30:00',
        liderId: lider2Id
      }
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().erro).toBe('Usuário já lidera outra célula')
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// POST /celulas/:id/lider
// ────────────────────────────────────────────────────────────────────────────────
describe('POST /celulas/:id/lider', () => {
  it('admin atribui líder → usuário promovido a LIDER', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celulaCrudId}/lider`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { userId: futuroLiderId }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().celula.liderId).toBe(futuroLiderId)

    // Verifica no banco que o usuário foi promovido
    const user = await prisma.user.findUnique({ where: { id: futuroLiderId } })
    expect(user.papel).toBe('LIDER')
    expect(user.celulaId).toBe(celulaCrudId)
  })

  it('membro não pode atribuir líder → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celulaCrudId}/lider`,
      headers: { authorization: `Bearer ${membroToken}` },
      payload: { userId: futuroLiderId }
    })
    expect(res.statusCode).toBe(403)
  })

  it('célula inexistente retorna 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/celulas/id-inexistente-xyz/lider',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { userId: futuroLiderId }
    })
    expect(res.statusCode).toBe(404)
  })

  it('líder não pode atribuir líder → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celula2Id}/lider`,
      headers: { authorization: `Bearer ${lider2Token}` },
      payload: { userId: futuroLiderId }
    })
    expect(res.statusCode).toBe(403)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// POST /celulas/:id/lider — sincronia de liderId entre células
// ────────────────────────────────────────────────────────────────────────────────
describe('POST /celulas/:id/lider — sincronia de liderId', () => {
  it('promover líder de outra célula zera liderId da célula anterior', async () => {
    // liderAId currently leads celulaAId; promote them to lead celulaBId
    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celulaBId}/lider`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { userId: liderAId }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().celula.liderId).toBe(liderAId)

    // Cell A must have its liderId cleared to null
    const celulaA = await prisma.celula.findUnique({ where: { id: celulaAId } })
    expect(celulaA.liderId).toBeNull()

    // Cell B must now point to liderAId
    const celulaB = await prisma.celula.findUnique({ where: { id: celulaBId } })
    expect(celulaB.liderId).toBe(liderAId)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// POST /celulas/:id/lider & DELETE — proteção do papel ADMIN
// Um ADMIN é o topo da hierarquia (MEMBRO ⊂ LIDER ⊂ ADMIN) e nunca deve ser
// rebaixado/alterado por operações de gestão de líder.
// ────────────────────────────────────────────────────────────────────────────────
describe('gestão de líder preserva papel ADMIN', () => {
  it('atribuir um ADMIN como líder não rebaixa seu papel para LIDER', async () => {
    const adminLider = await prisma.user.create({
      data: {
        nome: 'Admin Lider Test',
        email: `admin-lider-${sufixo}@test.com`,
        senhaHash: await hashSenha('senha123'),
        papel: 'ADMIN'
      }
    })
    const celula = await prisma.celula.create({
      data: {
        nome: `Célula Admin Lider ${sufixo}`,
        qrToken: `qr-admin-lider-${sufixo}`,
        diaSemana: 1,
        frequenciaDias: 7,
        dataPrimeiroEncontro: new Date('2026-09-01T19:30:00')
      }
    })

    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celula.id}/lider`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { userId: adminLider.id }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().celula.liderId).toBe(adminLider.id)

    const user = await prisma.user.findUnique({ where: { id: adminLider.id } })
    expect(user.papel).toBe('ADMIN')

    await prisma.celula.delete({ where: { id: celula.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: adminLider.id } }).catch(() => {})
  })

  it('substituir um líder ADMIN por outro usuário não rebaixa o ADMIN a MEMBRO', async () => {
    const adminLider = await prisma.user.create({
      data: {
        nome: 'Admin Lider Sub Test',
        email: `admin-lider-sub-${sufixo}@test.com`,
        senhaHash: await hashSenha('senha123'),
        papel: 'ADMIN'
      }
    })
    const novoLider = await prisma.user.create({
      data: {
        nome: 'Novo Lider Test',
        email: `novo-lider-${sufixo}@test.com`,
        senhaHash: await hashSenha('senha123'),
        papel: 'MEMBRO'
      }
    })
    const celula = await prisma.celula.create({
      data: {
        nome: `Célula Sub Lider ${sufixo}`,
        qrToken: `qr-sub-lider-${sufixo}`,
        diaSemana: 2,
        frequenciaDias: 7,
        dataPrimeiroEncontro: new Date('2026-09-02T19:30:00'),
        liderId: adminLider.id
      }
    })

    const res = await app.inject({
      method: 'POST',
      url: `/celulas/${celula.id}/lider`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { userId: novoLider.id }
    })
    expect(res.statusCode).toBe(200)

    const admin = await prisma.user.findUnique({ where: { id: adminLider.id } })
    expect(admin.papel).toBe('ADMIN')
    const novo = await prisma.user.findUnique({ where: { id: novoLider.id } })
    expect(novo.papel).toBe('LIDER')

    await prisma.celula.delete({ where: { id: celula.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: adminLider.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: novoLider.id } }).catch(() => {})
  })

  it('deletar célula liderada por um ADMIN não rebaixa o ADMIN a MEMBRO', async () => {
    const adminLider = await prisma.user.create({
      data: {
        nome: 'Admin Lider Del Test',
        email: `admin-lider-del-${sufixo}@test.com`,
        senhaHash: await hashSenha('senha123'),
        papel: 'ADMIN'
      }
    })
    const celula = await prisma.celula.create({
      data: {
        nome: `Célula Del Admin ${sufixo}`,
        qrToken: `qr-del-admin-${sufixo}`,
        diaSemana: 3,
        frequenciaDias: 7,
        dataPrimeiroEncontro: new Date('2026-09-03T19:30:00'),
        liderId: adminLider.id
      }
    })

    const res = await app.inject({
      method: 'DELETE',
      url: `/celulas/${celula.id}`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(204)

    const admin = await prisma.user.findUnique({ where: { id: adminLider.id } })
    expect(admin.papel).toBe('ADMIN')

    await prisma.user.delete({ where: { id: adminLider.id } }).catch(() => {})
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// GET /celulas
// ────────────────────────────────────────────────────────────────────────────────
describe('GET /celulas', () => {
  it('lider2 vê apenas a própria célula (isolamento de escopo)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/celulas',
      headers: { authorization: `Bearer ${lider2Token}` }
    })
    expect(res.statusCode).toBe(200)
    const { celulas } = res.json()
    expect(celulas).toHaveLength(1)
    expect(celulas[0].id).toBe(celula2Id)
  })

  it('futuroLider vê apenas a célula que lidera', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/celulas',
      headers: { authorization: `Bearer ${futuroLiderToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { celulas } = res.json()
    const ids = celulas.map((c) => c.id)
    expect(ids).toContain(celulaCrudId)
    expect(ids).not.toContain(celula2Id)
  })

  it('admin vê todas as células com contadores de membros e encontros', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/celulas',
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { celulas } = res.json()
    const ids = celulas.map((c) => c.id)
    expect(ids).toContain(celulaCrudId)
    expect(ids).toContain(celula2Id)
    const crud = celulas.find((c) => c.id === celulaCrudId)
    expect(crud._count).toBeDefined()
    expect(typeof crud._count.membros).toBe('number')
    expect(typeof crud._count.encontros).toBe('number')
  })

  it('membro recebe 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/celulas',
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(403)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// GET /celulas/:id
// ────────────────────────────────────────────────────────────────────────────────
describe('GET /celulas/:id', () => {
  it('futuroLider acessa a própria célula com líder (sem senhaHash) e contadores', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaCrudId}`,
      headers: { authorization: `Bearer ${futuroLiderToken}` }
    })
    expect(res.statusCode).toBe(200)
    const { celula } = res.json()
    expect(celula.id).toBe(celulaCrudId)
    expect(celula._count).toBeDefined()
    expect(celula.lider).not.toBeNull()
    expect(celula.lider.senhaHash).toBeUndefined()
  })

  it('lider2 recebe 403 ao acessar célula de outro líder', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celulaCrudId}`,
      headers: { authorization: `Bearer ${lider2Token}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('admin acessa qualquer célula', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/celulas/${celula2Id}`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
  })

  it('célula inexistente retorna 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/celulas/id-que-nao-existe-xyz',
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(404)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// PUT /celulas/:id
// ────────────────────────────────────────────────────────────────────────────────
describe('PUT /celulas/:id', () => {
  it('alterar frequenciaDias re-materializa encontros futuros', async () => {
    const countAntes = await prisma.encontro.count({ where: { celulaId: celulaCrudId } })
    expect(countAntes).toBeGreaterThan(0)

    const res = await app.inject({
      method: 'PUT',
      url: `/celulas/${celulaCrudId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { frequenciaDias: 14 }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().celula.frequenciaDias).toBe(14)

    const countDepois = await prisma.encontro.count({ where: { celulaId: celulaCrudId } })
    expect(countDepois).toBeGreaterThan(0)
    // frequência 14 gera menos encontros em 90 dias do que frequência 7
    expect(countDepois).not.toBe(countAntes)
  })

  it('lider2 não pode editar célula de outro → 403', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/celulas/${celulaCrudId}`,
      headers: { authorization: `Bearer ${lider2Token}` },
      payload: { nome: 'Nome Alterado' }
    })
    expect(res.statusCode).toBe(403)
  })

  it('futuroLider (líder da célula) pode editar o nome', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/celulas/${celulaCrudId}`,
      headers: { authorization: `Bearer ${futuroLiderToken}` },
      payload: { nome: `Célula CRUD Atualizada ${sufixo}` }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().celula.nome).toContain('Atualizada')
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// DELETE /celulas/:id
// ────────────────────────────────────────────────────────────────────────────────
describe('DELETE /celulas/:id', () => {
  it('membro não pode deletar → 403', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/celulas/${celulaCrudId}`,
      headers: { authorization: `Bearer ${membroToken}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('líder não pode deletar → 403', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/celulas/${celula2Id}`,
      headers: { authorization: `Bearer ${lider2Token}` }
    })
    expect(res.statusCode).toBe(403)
  })

  // Fix 3: ex-líder deve ser rebaixado a MEMBRO ao deletar a célula
  it('admin deleta célula com líder → ex-líder rebaixado para MEMBRO', async () => {
    // Cria célula e líder temporários para este teste isolado
    const tmpLider = await prisma.user.create({
      data: {
        nome: 'Lider Tmp Delete Test',
        email: `lider-tmp-del-${sufixo}@test.com`,
        senhaHash: await hashSenha('senha123'),
        papel: 'LIDER'
      }
    })
    const tmpCelula = await prisma.celula.create({
      data: {
        nome: `Célula Tmp Delete ${sufixo}`,
        qrToken: `qr-tmp-del-${sufixo}`,
        diaSemana: 0,
        frequenciaDias: 7,
        dataPrimeiroEncontro: new Date('2026-08-01T19:30:00'),
        liderId: tmpLider.id
      }
    })
    await prisma.user.update({ where: { id: tmpLider.id }, data: { celulaId: tmpCelula.id } })

    const res = await app.inject({
      method: 'DELETE',
      url: `/celulas/${tmpCelula.id}`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(204)

    // Célula foi removida
    const deleted = await prisma.celula.findUnique({ where: { id: tmpCelula.id } })
    expect(deleted).toBeNull()

    // Ex-líder deve ter papel MEMBRO
    const exLider = await prisma.user.findUnique({ where: { id: tmpLider.id } })
    expect(exLider.papel).toBe('MEMBRO')

    // Cleanup do usuário temporário
    await prisma.user.delete({ where: { id: tmpLider.id } }).catch(() => {})
  })

  it('admin deleta célula → 204 e célula não existe mais', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/celulas/${celulaCrudId}`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(204)

    // Confirma que a célula foi removida
    const deleted = await prisma.celula.findUnique({ where: { id: celulaCrudId } })
    expect(deleted).toBeNull()

    // Confirma que encontros foram cascateados
    const encontros = await prisma.encontro.count({ where: { celulaId: celulaCrudId } })
    expect(encontros).toBe(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// GET /celulas/:id/membros
// ────────────────────────────────────────────────────────────────────────────────
describe('GET /celulas/:id/membros', () => {
  let cId, liderTk, adminTk, outroLiderTk, membroAtivoId, membroInativoId

  beforeAll(async () => {
    const suf = `mem-${Date.now()}`
    const cel = await prisma.celula.create({
      data: { nome: `Cel ${suf}`, qrToken: `qr-${suf}`, diaSemana: 2, frequenciaDias: 7, dataPrimeiroEncontro: new Date('2026-09-01T19:30:00') }
    })
    cId = cel.id
    const lider = await prisma.user.create({ data: { nome: 'Lider Mem', email: `lidermem-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'LIDER', celulaId: cId } })
    await prisma.celula.update({ where: { id: cId }, data: { liderId: lider.id } })
    const ativo = await prisma.user.create({ data: { nome: 'Ativo Zé', email: `ativo-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO', celulaId: cId, ativo: true } })
    const inativo = await prisma.user.create({ data: { nome: 'Inativo Bia', email: `inativo-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO', celulaId: cId, ativo: false } })
    membroAtivoId = ativo.id; membroInativoId = inativo.id
    const admin = await prisma.user.create({ data: { nome: 'Adm Mem', email: `admmem-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'ADMIN' } })
    const outroLider = await prisma.user.create({ data: { nome: 'Outro L', email: `outrol-${suf}@t.com`, senhaHash: await hashSenha('x'), papel: 'LIDER' } })
    liderTk = app.jwt.sign({ id: lider.id, papel: 'LIDER', celulaId: cId })
    adminTk = app.jwt.sign({ id: admin.id, papel: 'ADMIN', celulaId: null })
    outroLiderTk = app.jwt.sign({ id: outroLider.id, papel: 'LIDER', celulaId: null })
  })

  it('líder vê só os membros ativos da própria célula', async () => {
    const res = await app.inject({ method: 'GET', url: `/celulas/${cId}/membros`, headers: { authorization: `Bearer ${liderTk}` } })
    expect(res.statusCode).toBe(200)
    const ids = res.json().membros.map((m) => m.id)
    expect(ids).toContain(membroAtivoId)
    expect(ids).not.toContain(membroInativoId)
  })
  it('admin vê todos, inclusive inativos, com o campo ativo', async () => {
    const res = await app.inject({ method: 'GET', url: `/celulas/${cId}/membros`, headers: { authorization: `Bearer ${adminTk}` } })
    expect(res.statusCode).toBe(200)
    const inativo = res.json().membros.find((m) => m.id === membroInativoId)
    expect(inativo).toBeDefined()
    expect(inativo.ativo).toBe(false)
  })
  it('líder de outra célula → 403', async () => {
    const res = await app.inject({ method: 'GET', url: `/celulas/${cId}/membros`, headers: { authorization: `Bearer ${outroLiderTk}` } })
    expect(res.statusCode).toBe(403)
  })
  it('célula inexistente → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/celulas/nao-existe/membros', headers: { authorization: `Bearer ${adminTk}` } })
    expect(res.statusCode).toBe(404)
  })
})
