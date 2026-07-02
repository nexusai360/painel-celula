import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '../prisma.js'
import {
  materializarEncontros,
  podeMarcarPresenca,
  podeDesmarcarPresenca,
  diferencaEmDiasDeCalendario
} from './encontros.service.js'

const sufixo = Date.now()
const qrToken = `qr-svc-${sufixo}`
let celulaId

afterAll(async () => {
  if (celulaId) {
    await prisma.encontro.deleteMany({ where: { celulaId } })
    await prisma.celula.deleteMany({ where: { id: celulaId } })
  }
  await prisma.$disconnect()
})

const data = new Date('2026-07-09T19:00:00.000Z')
const ag = (iso) => new Date(iso)

describe('podeMarcarPresenca (instante)', () => {
  it('bloqueia futuro (dia seguinte antes)', () => {
    expect(podeMarcarPresenca({ data, status:'AGENDADO' }, ag('2026-07-08T20:00:00Z')).ok).toBe(false)
  })
  it('bloqueia no mesmo dia antes do horário', () => {
    expect(podeMarcarPresenca({ data, status:'AGENDADO' }, ag('2026-07-09T15:00:00Z')).ok).toBe(false)
  })
  it('libera exatamente no horário', () => {
    expect(podeMarcarPresenca({ data, status:'AGENDADO' }, ag('2026-07-09T19:00:00Z')).ok).toBe(true)
  })
  it('libera retroativo (semana seguinte)', () => {
    expect(podeMarcarPresenca({ data, status:'AGENDADO' }, ag('2026-07-16T10:00:00Z')).ok).toBe(true)
  })
  it('bloqueia cancelado', () => {
    expect(podeMarcarPresenca({ data, status:'CANCELADO' }, ag('2026-07-10T10:00:00Z')).ok).toBe(false)
  })
})
describe('podeDesmarcarPresenca', () => {
  it('sempre permite (inclusive cancelado/futuro)', () => {
    expect(podeDesmarcarPresenca().ok).toBe(true)
  })
})

describe('diferencaEmDiasDeCalendario', () => {
  it('mesmo dia = 0; dia seguinte = 1', () => {
    expect(diferencaEmDiasDeCalendario(new Date('2026-07-10T23:00:00'), new Date('2026-07-10T01:00:00'))).toBe(0)
    expect(diferencaEmDiasDeCalendario(new Date('2026-07-11T00:30:00'), new Date('2026-07-10T23:00:00'))).toBe(1)
  })
})

describe('materializarEncontros', () => {
  it('lança erro para célula inexistente', async () => {
    await expect(materializarEncontros('id-que-nao-existe')).rejects.toThrow('Célula não encontrada')
  })

  it('cria encontros idempotentemente e não duplica', async () => {
    const c = await prisma.celula.create({
      data: {
        nome: 'Célula Svc', qrToken, diaSemana: 4, frequenciaDias: 7,
        dataPrimeiroEncontro: new Date('2026-07-02T19:30:00')
      }
    })
    celulaId = c.id
    const agora = new Date('2026-07-20T00:00:00')
    const criados1 = await materializarEncontros(celulaId, { horizonteDias: 90, agora })
    expect(criados1).toBeGreaterThan(0)
    const criados2 = await materializarEncontros(celulaId, { horizonteDias: 90, agora })
    expect(criados2).toBe(0) // idempotente
    const total = await prisma.encontro.count({ where: { celulaId } })
    expect(total).toBe(criados1)
    const algum = await prisma.encontro.findFirst({ where: { celulaId } })
    expect(algum.status).toBe('AGENDADO')
  })

  it('retorna 0 quando nenhuma data cabe no horizonte', async () => {
    const futura = await prisma.celula.create({
      data: { nome: 'Célula Futura', qrToken: `qr-fut-${sufixo}`, diaSemana: 4, frequenciaDias: 7,
        dataPrimeiroEncontro: new Date('2027-01-01T19:30:00') }
    })
    const criados = await materializarEncontros(futura.id, { horizonteDias: 30, agora: new Date('2026-07-20T00:00:00') })
    expect(criados).toBe(0)
    await prisma.celula.deleteMany({ where: { id: futura.id } })
  })
})
