export function agruparTestemunhos(lista) {
  const pendentes = lista
    .filter((t) => t.status === 'PENDENTE')
    .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm))
  const concluidos = lista
    .filter((t) => t.status === 'CONCLUIDO')
    .sort((a, b) => new Date(b.concluidoEm) - new Date(a.concluidoEm))
  return { pendentes, concluidos }
}
