// Separa os pedidos em ativos (pendentes) e atendidos (já testemunhados/realizados),
// preservando a ordem de entrada (o backend já envia por criadoEm desc). Os ativos
// ficam em destaque no topo, como uma fila; os atendidos vão para baixo.
export function agruparPedidos(lista) {
  const ativos = lista.filter((p) => p.status !== 'ATENDIDO')
  const atendidos = lista.filter((p) => p.status === 'ATENDIDO')
  return { ativos, atendidos }
}
