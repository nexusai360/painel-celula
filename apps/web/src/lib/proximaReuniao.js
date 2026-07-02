import { chaveDiaLocal } from './datas.js'

export function proximaReuniao(encontros, agora = new Date()) {
  const hoje = chaveDiaLocal(agora)
  return [...encontros]
    .sort((a,b) => new Date(a.data) - new Date(b.data))
    .find(e => e.status !== 'CANCELADO' && chaveDiaLocal(e.data) >= hoje) ?? null
}

export function minhaFrequencia(encontros, agora = new Date()) {
  const hoje = chaveDiaLocal(agora)
  const passados = encontros
    .filter(e => e.status !== 'CANCELADO' && chaveDiaLocal(e.data) < hoje)
    .sort((a,b) => new Date(b.data) - new Date(a.data)) // mais recente primeiro
  const presentes = passados.filter(e => e.marcadoPorMim).length
  let streak = 0
  for (const e of passados) { if (e.marcadoPorMim) streak++; else break }
  return { presentes, total: passados.length, streak }
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

/**
 * Frequência do MÊS vigente como timeline: uma "bolinha" por reunião do mês,
 * na ordem cronológica, com o estado de cada uma.
 *   estado ∈ 'presente' | 'falta' | 'futuro' | 'cancelado'
 * Retorna { mesLabel, ano, itens:[{id,dia,estado}], presentes, total }.
 * `total` conta apenas reuniões não-canceladas do mês.
 */
export function frequenciaDoMes(encontros, agora = new Date()) {
  const ano = agora.getFullYear()
  const mes = agora.getMonth()
  const hoje = chaveDiaLocal(agora)
  const doMes = encontros
    .filter(e => { const d = new Date(e.data); return d.getFullYear() === ano && d.getMonth() === mes })
    .sort((a, b) => new Date(a.data) - new Date(b.data))
  const itens = doMes.map(e => {
    const chave = chaveDiaLocal(e.data)
    const dia = new Date(e.data).getDate()
    let estado
    if (e.status === 'CANCELADO') estado = 'cancelado'
    else if (chave <= hoje && e.marcadoPorMim) estado = 'presente'
    else if (chave < hoje && !e.marcadoPorMim) estado = 'falta'
    else estado = 'futuro' // hoje ainda não marcado, ou reunião futura
    return { id: e.id, dia, estado }
  })
  const total = itens.filter(i => i.estado !== 'cancelado').length
  const presentes = itens.filter(i => i.estado === 'presente').length
  return { mesLabel: MESES[mes], ano, itens, presentes, total }
}
