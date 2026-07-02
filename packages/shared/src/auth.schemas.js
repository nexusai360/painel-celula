import { z } from 'zod'

export const registerSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
  qrToken: z.string().min(1).optional()
})

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha')
})
