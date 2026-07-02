import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { prisma } from '../../prisma.js'
import { setGoogleApiParaTestes, limparGoogleApiParaTestes } from '../google/api.js'
import { sincronizarMembro, sincronizarEncontro, removerEncontro, removerMembro } from './calendarSync.js'
import { cifrar } from '../google/cripto.js'

const CHAVE = '0'.repeat(64)
let chamadas
let celulaId, membroId, encontroId

function fakeApi() {
  return {
    async accessTokenDe() { return 'access-fake' },
    async criarEvento() { chamadas.criar++; return `gev-${chamadas.criar}` },
    async atualizarEvento() { chamadas.atualizar++ },
    async removerEvento() { chamadas.remover++ }
  }
}

beforeEach(async () => {
  process.env.TOKEN_ENC_KEY = CHAVE
  chamadas = { criar: 0, atualizar: 0, remover: 0 }
  setGoogleApiParaTestes(fakeApi())
  const uid = randomUUID()
  const celula = await prisma.celula.create({
    data: { nome: 'Cél Sync', qrToken: `qr-${uid}`,
      diaSemana: 4, frequenciaDias: 7, dataPrimeiroEncontro: new Date() }
  })
  celulaId = celula.id
  const membro = await prisma.user.create({
    data: { nome: 'M', email: `m-${uid}@ex.com`, senhaHash: 'x',
      papel: 'MEMBRO', celulaId, googleConectado: true, googleCalendarId: 'cal-icelula',
      googleRefreshTokenEnc: cifrar('refresh', CHAVE) }
  })
  membroId = membro.id
  const enc = await prisma.encontro.create({ data: { celulaId, data: new Date() } })
  encontroId = enc.id
})

afterEach(async () => {
  await prisma.googleEventoSync.deleteMany({ where: { userId: membroId } }).catch(() => {})
  await prisma.googleEventoSync.deleteMany({ where: { encontroId } }).catch(() => {})
  await prisma.encontro.deleteMany({ where: { celulaId } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: membroId } }).catch(() => {})
  await prisma.celula.deleteMany({ where: { id: celulaId } }).catch(() => {})
  limparGoogleApiParaTestes()
})

describe('calendarSync', () => {
  it('sincronizarMembro cria evento e grava GoogleEventoSync (idempotente)', async () => {
    await sincronizarMembro(membroId)
    expect(chamadas.criar).toBe(1)
    const map = await prisma.googleEventoSync.findFirst({ where: { userId: membroId, encontroId } })
    expect(map.googleEventId).toBe('gev-1')
    await sincronizarMembro(membroId) // não recria
    expect(chamadas.criar).toBe(1)
  })

  it('sincronizarEncontro atualiza quando já existe mapeamento', async () => {
    await sincronizarMembro(membroId)
    await sincronizarEncontro(encontroId)
    expect(chamadas.atualizar).toBe(1)
  })

  it('removerEncontro apaga evento e mapeamento', async () => {
    await sincronizarMembro(membroId)
    await removerEncontro(encontroId)
    expect(chamadas.remover).toBe(1)
    const map = await prisma.googleEventoSync.findFirst({ where: { encontroId } })
    expect(map).toBeNull()
  })

  it('removerMembro chama removerEvento e limpa GoogleEventoSync', async () => {
    await sincronizarMembro(membroId)
    await removerMembro(membroId)
    expect(chamadas.remover).toBe(1)
    const maps = await prisma.googleEventoSync.findMany({ where: { userId: membroId } })
    expect(maps).toHaveLength(0)
  })

  it('sincronizarEncontro CANCELADO delega para removerEncontro', async () => {
    await sincronizarMembro(membroId)
    await prisma.encontro.update({ where: { id: encontroId }, data: { status: 'CANCELADO' } })
    await sincronizarEncontro(encontroId)
    expect(chamadas.remover).toBe(1)
    const map = await prisma.googleEventoSync.findFirst({ where: { encontroId } })
    expect(map).toBeNull()
  })

  it('sincronizarEncontro cria mapeamento quando não há registro prévio', async () => {
    await sincronizarEncontro(encontroId)
    expect(chamadas.criar).toBe(1)
    const map = await prisma.googleEventoSync.findFirst({ where: { userId: membroId, encontroId } })
    expect(map).not.toBeNull()
  })

  it('token revogado: não cria evento e marca googleConectado false', async () => {
    setGoogleApiParaTestes({
      async accessTokenDe() { throw new Error('Token revoked') },
      async criarEvento() { chamadas.criar++ },
      async atualizarEvento() { chamadas.atualizar++ },
      async removerEvento() { chamadas.remover++ }
    })
    await sincronizarMembro(membroId)
    expect(chamadas.criar).toBe(0)
    const user = await prisma.user.findUnique({ where: { id: membroId } })
    expect(user.googleConectado).toBe(false)
  })
})
