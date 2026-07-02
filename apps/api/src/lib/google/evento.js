const TZ = 'America/Sao_Paulo'
const DURACAO_MS = 90 * 60 * 1000

export function montarEvento(encontro, nomeCelula) {
  const inicio = new Date(encontro.data)
  const fim = new Date(inicio.getTime() + DURACAO_MS)
  return {
    summary: `Encontro — ${nomeCelula}`,
    description: encontro.observacao || '',
    start: { dateTime: inicio.toISOString(), timeZone: TZ },
    end: { dateTime: fim.toISOString(), timeZone: TZ }
  }
}
