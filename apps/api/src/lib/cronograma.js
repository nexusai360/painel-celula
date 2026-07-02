const MS_POR_DIA = 24 * 60 * 60 * 1000

export function gerarDatasEncontros({ dataPrimeiroEncontro, frequenciaDias, ateData }) {
  if (!(frequenciaDias > 0)) throw new Error('frequenciaDias deve ser > 0')
  const datas = []
  let atual = new Date(dataPrimeiroEncontro)
  while (atual.getTime() <= ateData.getTime()) {
    datas.push(new Date(atual))
    atual = new Date(atual.getTime() + frequenciaDias * MS_POR_DIA)
  }
  return datas
}
