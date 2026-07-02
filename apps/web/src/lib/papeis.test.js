import { describe, it, expect } from 'vitest'
import { CORES_PAPEL, CORES_STATUS, statusDeUsuario, ehGestor, opcoesDePapel } from './papeis.js'

describe('papeis (web)', () => {
  it('CORES_PAPEL tem chip AA e ícone', () => {
    expect(CORES_PAPEL.ADMIN.chip).toContain('text-blue-700')
    expect(CORES_PAPEL.ADMIN.chip).toContain('dark:text-blue-400')
    expect(CORES_PAPEL.SUPER_ADMIN.chip).toContain('chrome')
    expect(typeof CORES_PAPEL.MEMBRO.icon).toBe('object') // componente lucide (forwardRef)
  })
  it('CORES_STATUS cobre os 3 estados', () => {
    expect(CORES_STATUS.PENDENTE.label).toBe('Em aprovação')
    expect(CORES_STATUS.ATIVO.chip).toContain('emerald')
    expect(CORES_STATUS.INATIVO.chip).toContain('red')
  })
  it('statusDeUsuario deriva corretamente', () => {
    expect(statusDeUsuario({ ativo: false, aprovado: true })).toBe('INATIVO')
    expect(statusDeUsuario({ ativo: true, aprovado: false })).toBe('PENDENTE')
    expect(statusDeUsuario({ ativo: true, aprovado: true })).toBe('ATIVO')
  })
  it('re-exporta RBAC do shared', () => {
    expect(ehGestor('LIDER')).toBe(true)
    expect(opcoesDePapel('ADMIN', 'MEMBRO')).toEqual(['MEMBRO', 'LIDER', 'ADMIN'])
  })
})
