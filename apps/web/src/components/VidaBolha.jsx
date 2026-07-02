import { memo } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from './ui/Avatar.jsx'

function prefereMenosMovimento() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const VidaBolha = memo(function VidaBolha({ nome, avatar, x, y, raio, dur, delay }) {
  const reduzido = prefereMenosMovimento()
  const tamanhoFoto = Math.round(raio * 1.4)
  return (
    <motion.div
      className="absolute flex flex-col items-center gap-1 text-center"
      style={{ left: x, top: y, width: raio * 2, transform: 'translate(-50%, -50%)' }}
      initial={{ scale: 0, opacity: 0 }}
      animate={reduzido ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1, y: [0, -7, 0] }}
      exit={{ scale: 0, opacity: 0 }}
      transition={
        reduzido
          ? { duration: 0.3 }
          : {
              scale: { duration: 0.4 },
              opacity: { duration: 0.4 },
              y: { duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }
            }
      }
    >
      <Avatar src={avatar} nome={nome} size={tamanhoFoto} />
      <span className="truncate text-xs text-text-muted" style={{ maxWidth: raio * 2 }}>
        {nome}
      </span>
    </motion.div>
  )
})
