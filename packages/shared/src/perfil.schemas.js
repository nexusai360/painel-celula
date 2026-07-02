import { z } from 'zod'

export function normalizarWhatsapp(valor) {
  if (valor == null || valor === '') return null
  const d = String(valor).replace(/\D/g, '')
  if (d.length >= 12 && d.length <= 13) return d           // já tem país
  if (d.length === 10 || d.length === 11) return '55' + d  // BR sem país
  return null // inválido → schema rejeita
}

const AVATAR_PREFIXO = /^data:image\/jpeg;base64,/
const AVATAR_MAX = 400 * 1024

export const ESTADOS_CIVIS = ['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL']

export const perfilUpdateSchema = z.object({
  nome: z.string().trim().min(1).max(80).optional(),
  whatsapp: z.union([z.string(), z.null()]).optional(),
  avatar: z.union([
    z.string().regex(AVATAR_PREFIXO, 'Avatar deve ser JPEG base64').max(AVATAR_MAX, 'Imagem muito grande'),
    z.null()
  ]).optional(),
  // Aceita 'YYYY-MM-DD' (input date) ou null para limpar.
  dataNascimento: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'), z.null()]).optional(),
  estadoCivil: z.union([z.enum(ESTADOS_CIVIS), z.null()]).optional()
})
