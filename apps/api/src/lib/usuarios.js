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

export const COM_CELULA = { include: { celula: { select: { nome: true } } } }

export function comCelula(user) {
  const { celula, ...rest } = publico(user)
  return { ...rest, celulaNome: celula?.nome ?? null }
}
