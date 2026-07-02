/** Remove campos sensíveis antes de expor o usuário ao cliente. */
export function publico(user) {
  if (!user) return null
  const { senhaHash, googleRefreshTokenEnc, googleSub, ...resto } = user
  return resto
}

/** Como `publico`, mas sem `avatar` — usado em listas para evitar inflação de payload. */
export function publicoLeve(user) {
  if (!user) return null
  const { avatar, ...resto } = publico(user)
  return resto
}

// Inclui a célula onde o usuário é MEMBRO (celulaId), as que ele LIDERA (junção
// N:N) e as que ele CRIOU. A união alimenta o gate/navegação de "Minha célula" —
// resolve o caso do líder/criador que tem celulaId nulo e antes ficava bloqueado.
export const COM_CELULA = {
  include: {
    celula: { select: { nome: true } },
    celulasLideradas: { orderBy: { nome: 'asc' }, select: { id: true, nome: true, status: true } },
    celulasCriadas: { orderBy: { nome: 'asc' }, select: { id: true, nome: true, status: true } },
  },
}

export function comCelula(user) {
  const { celula, celulasLideradas, celulasCriadas, ...rest } = publico(user)
  const mapa = new Map()
  for (const c of [...(celulasLideradas ?? []), ...(celulasCriadas ?? [])]) {
    mapa.set(c.id, { id: c.id, nome: c.nome, status: c.status })
  }
  const minhasCelulas = [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome))
  return {
    ...rest,
    celulaNome: celula?.nome ?? null,
    minhasCelulas,
  }
}
