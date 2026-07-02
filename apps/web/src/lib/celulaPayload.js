/**
 * Monta o payload de criação de célula.
 * - diaSemana/frequenciaDias como Number (o backend usa z.coerce, mas mandamos limpo).
 * - dataPrimeiroEncontro como wall-clock ingênuo "YYYY-MM-DDTHH:mm" (SEM toISOString,
 *   para o backend interpretar o weekday de forma TZ-independente e não deslocar o dia).
 * - "Sem número" grava 'S/N'.
 */
/** Dia da semana (0=dom..6=sáb) derivado do wall-clock "YYYY-MM-DDTHH:mm", em UTC
 *  (mesma interpretação do backend — nunca desloca por fuso). Vazio → null. */
export function weekdayDaData(s) {
  if (!s || s.length < 10) return null
  const [y, mo, d] = s.slice(0, 10).split('-').map(Number)
  if (!y || !mo || !d) return null
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay()
}

export function montarPayloadCelula(form) {
  const numero = form.semNumero ? 'S/N' : form.numero || undefined
  return {
    nome: form.nome,
    descricao: form.descricao || undefined,
    diaSemana: Number(form.diaSemana),
    frequenciaDias: Number(form.frequenciaDias),
    dataPrimeiroEncontro: form.dataPrimeiroEncontro,
    cidade: form.cidade || undefined,
    bairro: form.bairro || undefined,
    endereco: form.endereco || undefined,
    numero,
    complemento: form.complemento || undefined,
    pontoReferencia: form.pontoReferencia || undefined,
    cep: form.cep || undefined,
  }
}
