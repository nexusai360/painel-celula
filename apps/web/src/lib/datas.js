const pad2 = (n) => String(n).padStart(2, '0')
export function chaveDiaLocal(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad2(x.getMonth()+1)}-${pad2(x.getDate())}`
}

const DIAS_SEMANA = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
]

export function nomeDiaSemana(n) {
  return DIAS_SEMANA[n] ?? '—'
}

export function formatarData(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export function formatarDataHora(iso) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

export function formatarHora(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatarDataCurta(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Para inputs type="date" (yyyy-mm-dd) e datetime-local
export function paraInputDate(iso) {
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export function paraInputDateTime(iso) {
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

const MESES_EXT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

// "Terça-feira, 30 de junho"
export function dataPorExtenso(iso) {
  const d = new Date(iso)
  const sem = d.toLocaleDateString('pt-BR', { weekday: 'long' })
  return `${sem.charAt(0).toUpperCase() + sem.slice(1)}, ${d.getDate()} de ${MESES_EXT[d.getMonth()]}`
}

// Rótulo relativo do dia — passado e futuro (compara dias de calendário local)
export function diaRelativo(iso, agora = new Date()) {
  const dAlvo = new Date(`${chaveDiaLocal(iso)}T00:00:00`)
  const dHoje = new Date(`${chaveDiaLocal(agora)}T00:00:00`)
  const dias = Math.round((dAlvo - dHoje) / 86400000)
  if (dias === 0) return 'Hoje'
  if (dias === 1) return 'Amanhã'
  if (dias === -1) return 'Ontem'
  if (dias === -2) return 'Anteontem'
  if (dias >= 2 && dias <= 6) return `Em ${dias} dias`
  if (dias <= -3) return `Há ${Math.abs(dias)} dias`
  return dataPorExtenso(iso) // mais de 6 dias no futuro
}
