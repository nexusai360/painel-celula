import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'
import { hashSenha } from '../lib/password.js'

let app
const sufixo = Date.now()
let celulaId, liderId, membroId, liderToken, membroToken
let outraCelulaId, outroLiderId, outroLiderToken

beforeAll(async () => {
  app = buildApp(); await app.ready()
  const celula = await prisma.celula.create({
    data: { nome: `Célula T ${sufixo}`, qrToken: `qr-t-${sufixo}`, diaSemana: 3, frequenciaDias: 7, dataPrimeiroEncontro: new Date('2026-08-01T19:30:00') }
  })
  celulaId = celula.id
  const lider = await prisma.user.create({
    data: { nome: 'Líder T', email: `liderT-${sufixo}@test.com`, senhaHash: await hashSenha('x'), papel: 'LIDER', celulaId }
  })
  liderId = lider.id
  await prisma.celula.update({ where: { id: celulaId }, data: { liderId } })
  const membro = await prisma.user.create({
    data: { nome: 'Membro T', email: `membroT-${sufixo}@test.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO', celulaId }
  })
  membroId = membro.id
  liderToken = app.jwt.sign({ id: liderId, papel: 'LIDER', celulaId })
  membroToken = app.jwt.sign({ id: membroId, papel: 'MEMBRO', celulaId })

  // Outra célula + líder (escopo isolado)
  const outra = await prisma.celula.create({
    data: { nome: `Outra ${sufixo}`, qrToken: `qr-o-${sufixo}`, diaSemana: 4, frequenciaDias: 7, dataPrimeiroEncontro: new Date('2026-08-02T19:30:00') }
  })
  outraCelulaId = outra.id
  const outroLider = await prisma.user.create({
    data: { nome: 'Outro Líder', email: `outroL-${sufixo}@test.com`, senhaHash: await hashSenha('x'), papel: 'LIDER', celulaId: outraCelulaId }
  })
  outroLiderId = outroLider.id
  await prisma.celula.update({ where: { id: outraCelulaId }, data: { liderId: outroLiderId } })
  outroLiderToken = app.jwt.sign({ id: outroLiderId, papel: 'LIDER', celulaId: outraCelulaId })

  // Testemunhos: um do membro, um do próprio líder
  await prisma.testemunho.create({ data: { userId: membroId, celulaId, titulo: 'Do membro', status: 'PENDENTE' } })
  await prisma.testemunho.create({ data: { userId: liderId, celulaId, titulo: 'Do líder', status: 'PENDENTE' } })
})

afterAll(async () => {
  await prisma.testemunho.deleteMany({ where: { celulaId: { in: [celulaId, outraCelulaId] } } })
  await prisma.user.deleteMany({ where: { id: { in: [liderId, membroId, outroLiderId] } } })
  await prisma.celula.deleteMany({ where: { id: { in: [celulaId, outraCelulaId] } } })
  await app.close()
})

describe('GET /testemunhos', () => {
  it('líder vê os testemunhos da própria célula, incluindo o próprio', async () => {
    const res = await app.inject({ method: 'GET', url: '/testemunhos', headers: { authorization: `Bearer ${liderToken}` } })
    expect(res.statusCode).toBe(200)
    const titulos = res.json().testemunhos.map((t) => t.titulo)
    expect(titulos).toContain('Do membro')
    expect(titulos).toContain('Do líder')
    const doMembro = res.json().testemunhos.find((t) => t.titulo === 'Do membro')
    expect(doMembro.autor.nome).toBe('Membro T')
  })
  it('membro (não-líder) recebe 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/testemunhos', headers: { authorization: `Bearer ${membroToken}` } })
    expect(res.statusCode).toBe(403)
  })
  it('líder de outra célula não vê estes testemunhos', async () => {
    const res = await app.inject({ method: 'GET', url: '/testemunhos', headers: { authorization: `Bearer ${outroLiderToken}` } })
    expect(res.json().testemunhos).toHaveLength(0)
  })
})

describe('POST /testemunhos/:id/concluir', () => {
  it('marca CONCLUIDO com concluidoEm', async () => {
    const lista = (await app.inject({ method: 'GET', url: '/testemunhos', headers: { authorization: `Bearer ${liderToken}` } })).json().testemunhos
    const alvo = lista[0]
    const res = await app.inject({ method: 'POST', url: `/testemunhos/${alvo.id}/concluir`, headers: { authorization: `Bearer ${liderToken}` } })
    expect(res.statusCode).toBe(200)
    expect(res.json().testemunho.status).toBe('CONCLUIDO')
    expect(res.json().testemunho.concluidoEm).not.toBeNull()
  })
  it('líder de outra célula não conclui → 404', async () => {
    const lista = (await app.inject({ method: 'GET', url: '/testemunhos', headers: { authorization: `Bearer ${liderToken}` } })).json().testemunhos
    const alvo = lista.find((t) => t.status === 'PENDENTE') || lista[0]
    const res = await app.inject({ method: 'POST', url: `/testemunhos/${alvo.id}/concluir`, headers: { authorization: `Bearer ${outroLiderToken}` } })
    expect(res.statusCode).toBe(404)
  })
})
