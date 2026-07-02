import { useEffect, useRef, useState } from 'react'
import { Megaphone } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { apiBanners } from '../lib/api.js'

const INTERVALO = 10000 // 10s

/**
 * BannerBar — carrossel dos avisos do topo que atingem o usuário.
 * Troca automática a cada 10s (pausa no hover), avança no clique, indicador quando há vários.
 * Respeita prefers-reduced-motion (sem auto-rotate; navegação manual).
 */
export function BannerBar() {
  const { usuario } = useAuth()
  const [banners, setBanners] = useState([])
  const [idx, setIdx] = useState(0)
  const [pausado, setPausado] = useState(false)
  const reduz = useRef(false)

  useEffect(() => {
    reduz.current = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (usuario?.aprovado === false) return
    apiBanners().then((b) => { setBanners(Array.isArray(b) ? b : []); setIdx(0) }).catch(() => {})
  }, [usuario])

  const total = banners.length
  useEffect(() => {
    if (total <= 1 || pausado || reduz.current) return
    const t = setInterval(() => setIdx((i) => (i + 1) % total), INTERVALO)
    return () => clearInterval(t)
  }, [total, pausado])

  if (usuario?.aprovado === false || total === 0) return null
  const atual = banners[Math.min(idx, total - 1)]
  const avancar = () => setIdx((i) => (i + 1) % total)

  return (
    <div
      className="border-b border-brand/20 bg-brand/10"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-2 text-sm text-text">
        <Megaphone className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={atual.id}
              initial={{ opacity: 0, y: reduz.current ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduz.current ? 0 : -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`min-w-0 truncate ${total > 1 ? 'cursor-pointer' : ''}`}
              onClick={total > 1 ? avancar : undefined}
              title={total > 1 ? 'Clique para o próximo aviso' : undefined}
            >
              {atual.mensagem}
            </motion.p>
          </AnimatePresence>
        </div>
        {total > 1 && (
          <div className="flex shrink-0 items-center gap-1.5" aria-label={`Aviso ${idx + 1} de ${total}`}>
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Ir para o aviso ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-brand' : 'w-1.5 bg-brand/30 hover:bg-brand/50'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
