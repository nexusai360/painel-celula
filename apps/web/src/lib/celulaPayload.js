/**
 * Monta o payload de criação de célula.
 * - diaSemana/frequenciaDias como Number (o backend usa z.coerce, mas mandamos limpo).
 * - dataPrimeiroEncontro como wall-clock ingênuo "YYYY-MM-DDTHH:mm" (SEM toISOString,
 *   para o backend interpretar o weekday de forma TZ-independente e não deslocar o dia).
 * - "Sem número" grava 'S/N'.
 */
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
