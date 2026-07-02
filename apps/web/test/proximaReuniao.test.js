import { describe, it, expect } from 'vitest'
import { proximaReuniao, minhaFrequencia } from '../src/lib/proximaReuniao.js'

const mk = (iso, extra={}) => ({ id:iso, data:iso, status:'AGENDADO', marcadoPorMim:false, _count:{presencas:0}, ...extra })

describe('proximaReuniao', () => {
  const agora = new Date('2026-07-09T21:00:00')
  it('no dia da reunião, retorna a de hoje mesmo após o horário', () => {
    const enc = [mk('2026-07-02T19:00:00'), mk('2026-07-09T19:00:00'), mk('2026-07-16T19:00:00')]
    expect(proximaReuniao(enc, agora).id).toBe('2026-07-09T19:00:00')
  })
  it('pula a próxima cancelada', () => {
    const enc = [mk('2026-07-09T19:00:00',{status:'CANCELADO'}), mk('2026-07-16T19:00:00')]
    expect(proximaReuniao(enc, agora).id).toBe('2026-07-16T19:00:00')
  })
  it('retorna null se não há hoje/futuro', () => {
    expect(proximaReuniao([mk('2026-07-02T19:00:00')], agora)).toBeNull()
  })
})
describe('minhaFrequencia', () => {
  it('conta presentes/total em passados não-cancelados e streak do mais recente', () => {
    const agora = new Date('2026-07-20T10:00:00')
    const enc = [
      mk('2026-07-02T19:00:00',{marcadoPorMim:true}),
      mk('2026-07-09T19:00:00',{marcadoPorMim:false}),
      mk('2026-07-16T19:00:00',{marcadoPorMim:true}),
      mk('2026-07-23T19:00:00',{marcadoPorMim:false}) // futuro, ignora
    ]
    const r = minhaFrequencia(enc, agora)
    expect(r.total).toBe(3); expect(r.presentes).toBe(2); expect(r.streak).toBe(1)
  })
})
