import { prisma } from '../prisma.js'
import { gerarDatasEncontros } from './cronograma.js'

const MS_POR_DIA = 24 * 60 * 60 * 1000

export function diferencaEmDiasDeCalendario(a, b) {
  const meiaNoite = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.floor((meiaNoite(a) - meiaNoite(b)) / MS_POR_DIA)
}

export function podeMarcarPresenca(encontro, agora = new Date()) {
  if (encontro.status === 'CANCELADO') return { ok: false, motivo: 'Reunião cancelada' }
  if (agora.getTime() < new Date(encontro.data).getTime()) {
    return { ok: false, motivo: 'Disponível a partir do horário da reunião' }
  }
  return { ok: true }
}

export function podeDesmarcarPresenca() {
  return { ok: true }
}

export async function materializarEncontros(celulaId, { horizonteDias = 90, agora = new Date() } = {}) {
  const celula = await prisma.celula.findUnique({ where: { id: celulaId } })
  if (!celula) throw new Error('Célula não encontrada')
  const ateData = new Date(agora.getTime() + horizonteDias * MS_POR_DIA)
  const datas = gerarDatasEncontros({
    dataPrimeiroEncontro: celula.dataPrimeiroEncontro,
    frequenciaDias: celula.frequenciaDias,
    ateData
  })
  if (datas.length === 0) return 0
  const res = await prisma.encontro.createMany({
    data: datas.map((data) => ({ celulaId, data })),
    skipDuplicates: true
  })
  return res.count
}
