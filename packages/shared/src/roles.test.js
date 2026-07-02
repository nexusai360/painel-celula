import { describe, it, expect } from 'vitest'
import {
  podeEditarPapel, opcoesDePapel, podeAgirSobre, temNivel, ehGestor, ehLider, PAPEL_RANK,
  NIVEL_RANK, TODOS_NIVEIS, temNivelAcesso, podeEditarNivel, opcoesDeNivel, podeAgirSobreNivel,
  ehAdmin, ehSuperAdmin,
} from './roles.js'

describe('podeEditarPapel', () => {
  it('ADMIN nomeia LIDER e ADMIN (admin nomeia admin)', () => {
    expect(podeEditarPapel('ADMIN', 'MEMBRO', 'LIDER')).toBe(true)
    expect(podeEditarPapel('ADMIN', 'MEMBRO', 'ADMIN')).toBe(true)
    expect(podeEditarPapel('ADMIN', 'LIDER', 'ADMIN')).toBe(true)
  })
  it('ADMIN NÃO rebaixa outro ADMIN nem concede SUPER', () => {
    expect(podeEditarPapel('ADMIN', 'ADMIN', 'MEMBRO')).toBe(false)
    expect(podeEditarPapel('ADMIN', 'ADMIN', 'LIDER')).toBe(false)
    expect(podeEditarPapel('ADMIN', 'MEMBRO', 'SUPER_ADMIN')).toBe(false)
    expect(podeEditarPapel('ADMIN', 'SUPER_ADMIN', 'ADMIN')).toBe(false)
  })
  it('SUPER faz tudo, incluindo conceder e rebaixar admin/super', () => {
    expect(podeEditarPapel('SUPER_ADMIN', 'MEMBRO', 'SUPER_ADMIN')).toBe(true)
    expect(podeEditarPapel('SUPER_ADMIN', 'ADMIN', 'MEMBRO')).toBe(true)
    expect(podeEditarPapel('SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN')).toBe(true)
  })
  it('LIDER não edita papéis', () => {
    expect(podeEditarPapel('LIDER', 'MEMBRO', 'LIDER')).toBe(false)
  })
})

describe('opcoesDePapel', () => {
  it('ADMIN sobre MEMBRO oferece MEMBRO/LIDER/ADMIN, não SUPER', () => {
    expect(opcoesDePapel('ADMIN', 'MEMBRO')).toEqual(['MEMBRO', 'LIDER', 'ADMIN'])
  })
  it('ADMIN sobre outro ADMIN só pode manter (1 opção → readOnly)', () => {
    expect(opcoesDePapel('ADMIN', 'ADMIN')).toEqual(['ADMIN'])
  })
  it('SUPER sobre MEMBRO oferece todos', () => {
    expect(opcoesDePapel('SUPER_ADMIN', 'MEMBRO')).toEqual(['MEMBRO', 'LIDER', 'ADMIN', 'SUPER_ADMIN'])
  })
})

describe('podeAgirSobre', () => {
  it('ADMIN não age sobre ADMIN nem SUPER', () => {
    expect(podeAgirSobre('ADMIN', { papel: 'ADMIN' })).toBe(false)
    expect(podeAgirSobre('ADMIN', { papel: 'SUPER_ADMIN' })).toBe(false)
    expect(podeAgirSobre('ADMIN', { papel: 'MEMBRO' })).toBe(true)
  })
  it('SUPER age sobre admin', () => {
    expect(podeAgirSobre('SUPER_ADMIN', { papel: 'ADMIN' })).toBe(true)
  })
})

describe('helpers', () => {
  it('ehGestor/ehLider/temNivel/rank', () => {
    expect(ehGestor('LIDER')).toBe(true)
    expect(ehGestor('MEMBRO')).toBe(false)
    expect(ehLider('ADMIN')).toBe(false)
    expect(temNivel('ADMIN', 'LIDER')).toBe(true)
    expect(PAPEL_RANK.SUPER_ADMIN).toBe(4)
  })
})

// ── Eixo NÍVEL DE ACESSO (novo) ─────────────────────────────────────────────
describe('nível de acesso', () => {
  it('rank e ordem', () => {
    expect(TODOS_NIVEIS).toEqual(['USUARIO', 'ADMIN', 'SUPER_ADMIN'])
    expect(NIVEL_RANK.USUARIO).toBe(1)
    expect(NIVEL_RANK.SUPER_ADMIN).toBe(3)
    expect(temNivelAcesso('ADMIN', 'ADMIN')).toBe(true)
    expect(temNivelAcesso('USUARIO', 'ADMIN')).toBe(false)
  })
  it('ehAdmin/ehSuperAdmin servem ao espaço de nível', () => {
    expect(ehAdmin('ADMIN')).toBe(true)
    expect(ehAdmin('SUPER_ADMIN')).toBe(true)
    expect(ehAdmin('USUARIO')).toBe(false)
    expect(ehSuperAdmin('SUPER_ADMIN')).toBe(true)
    expect(ehSuperAdmin('ADMIN')).toBe(false)
  })
  it('podeEditarNivel: admin nomeia admin, não mexe em admin/super; super faz tudo', () => {
    expect(podeEditarNivel('ADMIN', 'USUARIO', 'ADMIN')).toBe(true)
    expect(podeEditarNivel('ADMIN', 'ADMIN', 'USUARIO')).toBe(false)
    expect(podeEditarNivel('ADMIN', 'USUARIO', 'SUPER_ADMIN')).toBe(false)
    expect(podeEditarNivel('SUPER_ADMIN', 'ADMIN', 'USUARIO')).toBe(true)
    expect(podeEditarNivel('SUPER_ADMIN', 'USUARIO', 'SUPER_ADMIN')).toBe(true)
    expect(podeEditarNivel('USUARIO', 'USUARIO', 'ADMIN')).toBe(false)
  })
  it('opcoesDeNivel e podeAgirSobreNivel', () => {
    expect(opcoesDeNivel('ADMIN', 'USUARIO')).toEqual(['USUARIO', 'ADMIN'])
    expect(opcoesDeNivel('SUPER_ADMIN', 'USUARIO')).toEqual(['USUARIO', 'ADMIN', 'SUPER_ADMIN'])
    expect(opcoesDeNivel('ADMIN', 'ADMIN')).toEqual(['ADMIN'])
    expect(podeAgirSobreNivel('ADMIN', { nivelAcesso: 'ADMIN' })).toBe(false)
    expect(podeAgirSobreNivel('ADMIN', { nivelAcesso: 'USUARIO' })).toBe(true)
    expect(podeAgirSobreNivel('SUPER_ADMIN', { nivelAcesso: 'ADMIN' })).toBe(true)
  })
})
