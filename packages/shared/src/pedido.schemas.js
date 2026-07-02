import { z } from 'zod'

export const pedidoCreateSchema = z.object({
  titulo: z.string().trim().min(1, 'Informe um título').max(100, 'Máximo de 100 caracteres'),
  detalhes: z.string().trim().max(500, 'Máximo de 500 caracteres').optional(),
  testemunhar: z.boolean().optional()
})

export const pedidoUpdateSchema = z.object({
  titulo: z.string().trim().min(1, 'Informe um título').max(100, 'Máximo de 100 caracteres'),
  detalhes: z.string().trim().max(500, 'Máximo de 500 caracteres').optional()
})
