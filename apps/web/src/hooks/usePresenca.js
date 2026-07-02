import { useEffect, useRef, useState } from 'react'
import { apiMarcarPresenca, apiDesmarcarPresenca } from '../lib/api.js'
import { useEncontros } from '../context/EncontrosContext.jsx'

export function usePresenca(encontro) {
  const { atualizarPresenca } = useEncontros()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const vivo = useRef(true)
  // IMPORTANTE: reafirmar vivo=true na execução do efeito. Sob React StrictMode
  // (dev), o cleanup roda logo após o mount; sem reatribuir aqui, vivo.current
  // ficaria false para sempre e os updates pós-await seriam descartados
  // (marcação persiste no servidor, mas a UI trava sem animar).
  useEffect(() => {
    vivo.current = true
    return () => { vivo.current = false }
  }, [])

  const marcado = !!encontro?.marcadoPorMim
  const agoraOk = encontro && new Date() >= new Date(encontro.data) && encontro.status !== 'CANCELADO'
  const marcavel = marcado || agoraOk // pode desmarcar sempre; marcar só se aberto
  const motivo = encontro?.status === 'CANCELADO' ? 'Reunião cancelada' : 'Disponível a partir do horário da reunião'

  async function alternar() {
    if (salvando || !encontro) return
    if (!marcado && !agoraOk) { setErro(motivo); return }
    setSalvando(true); setErro('')
    try {
      if (marcado) { const { totalPresencas } = await apiDesmarcarPresenca(encontro.id); if (vivo.current) atualizarPresenca(encontro.id, false, totalPresencas) }
      else { const { totalPresencas } = await apiMarcarPresenca(encontro.id); if (vivo.current) atualizarPresenca(encontro.id, true, totalPresencas) }
    } catch (e) {
      if (vivo.current) setErro(e?.response?.data?.erro || 'Não foi possível atualizar a presença.')
    } finally { if (vivo.current) setSalvando(false) }
  }
  return { marcado, salvando, erro, alternar, marcavel, motivo }
}
