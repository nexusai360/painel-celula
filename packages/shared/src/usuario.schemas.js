import { z } from 'zod'

export const usuarioAdminUpdateSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(120, 'Máximo de 120 caracteres').optional(),
  email: z.string().trim().email('E-mail inválido').optional(),
  whatsapp: z.string().optional(),
  ativo: z.boolean().optional()
})
