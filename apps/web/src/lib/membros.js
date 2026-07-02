export function agruparMembros(lista) {
  const ativos = lista.filter((m) => m.ativo)
  const inativos = lista.filter((m) => !m.ativo)
  return { ativos, inativos }
}
