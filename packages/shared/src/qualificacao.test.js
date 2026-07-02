import { describe, it, expect } from 'vitest'
import {
  QUALIFICACAO_RANK, TODAS_QUALIFICACOES, qualificacaoMinima, ehGestorQualificacao,
  podeCriarCelulaQualificacao, opcoesDeQualificacao, podeEditarQualificacao,
} from './qualificacao.js'

describe('ordem e rank da qualificação', () => {
  it('CONVIDADO < MEMBRO < LOUVOR < COLIDER < LIDER < PASTOR', () => {
    expect(TODAS_QUALIFICACOES).toEqual(['CONVIDADO', 'MEMBRO', 'LOUVOR', 'COLIDER', 'LIDER', 'PASTOR'])
    expect(QUALIFICACAO_RANK.CONVIDADO).toBe(1)
    expect(QUALIFICACAO_RANK.PASTOR).toBe(6)
  })
  it('qualificacaoMinima compara por rank', () => {
    expect(qualificacaoMinima('LIDER', 'MEMBRO')).toBe(true)
    expect(qualificacaoMinima('MEMBRO', 'LIDER')).toBe(false)
    expect(qualificacaoMinima('PASTOR', 'LIDER')).toBe(true)
  })
})

describe('capacidades por qualificação', () => {
  it('ehGestorQualificacao = LÍDER ou PASTOR', () => {
    expect(ehGestorQualificacao('LIDER')).toBe(true)
    expect(ehGestorQualificacao('PASTOR')).toBe(true)
    expect(ehGestorQualificacao('COLIDER')).toBe(false)
    expect(ehGestorQualificacao('MEMBRO')).toBe(false)
  })
  it('só LÍDER e PASTOR criam célula (por qualificação)', () => {
    expect(podeCriarCelulaQualificacao('LIDER')).toBe(true)
    expect(podeCriarCelulaQualificacao('PASTOR')).toBe(true)
    expect(podeCriarCelulaQualificacao('COLIDER')).toBe(false)
    expect(podeCriarCelulaQualificacao('MEMBRO')).toBe(false)
  })
})

describe('quem pode editar qualificação', () => {
  it('ADMIN (nível) atribui todas as qualificações', () => {
    expect(opcoesDeQualificacao('ADMIN', 'MEMBRO')).toEqual(TODAS_QUALIFICACOES)
    expect(podeEditarQualificacao('ADMIN', 'MEMBRO', 'PASTOR')).toBe(true)
  })
  it('SUPER_ADMIN também atribui todas', () => {
    expect(opcoesDeQualificacao('SUPER_ADMIN', 'CONVIDADO')).toEqual(TODAS_QUALIFICACOES)
  })
  it('gestor (LÍDER/PASTOR, nível USUARIO) atribui até LÍDER, não PASTOR', () => {
    expect(opcoesDeQualificacao('USUARIO', 'LIDER')).toEqual(['CONVIDADO', 'MEMBRO', 'LOUVOR', 'COLIDER', 'LIDER'])
    expect(podeEditarQualificacao('USUARIO', 'LIDER', 'PASTOR')).toBe(false)
    expect(podeEditarQualificacao('USUARIO', 'PASTOR', 'LIDER')).toBe(true)
  })
  it('não-gestor sem nível não atribui nada', () => {
    expect(opcoesDeQualificacao('USUARIO', 'MEMBRO')).toEqual([])
    expect(podeEditarQualificacao('USUARIO', 'MEMBRO', 'LIDER')).toBe(false)
  })
})
