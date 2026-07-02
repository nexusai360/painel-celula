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

// Inclui a célula onde o usuário é MEMBRO (celulaId) e as células que ele LIDERA
// (junção N:N). Ambas alimentam o gate/navegação de "Minha célula" no cliente.
export const COM_CELULA = {
  include: {
    celula: { select: { nome: true } },
    celulasLideradas: { orderBy: { nome: 'asc' }, select: { id: true, nome: true, status: true } },
  },
}

export function comCelula(user) {
  const { celula, celulasLideradas, ...rest } = publico(user)
  return {
    ...rest,
    celulaNome: celula?.nome ?? null,
    liderancas: (celulasLideradas ?? []).map((c) => ({ id: c.id, nome: c.nome, status: c.status })),
  }
}
