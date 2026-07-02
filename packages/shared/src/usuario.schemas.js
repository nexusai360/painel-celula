import { z } from 'zod'
import { normalizarWhatsapp } from './perfil.schemas.js'
import { TODAS_QUALIFICACOES } from './qualificacao.js'
import { TODOS_NIVEIS } from './roles.js'

// WhatsApp opcional: aceita vazio/nulo (limpa) ou um número BR válido (10–13 dígitos).
const whatsappOpcional = z
  .union([z.string(), z.null()])
  .optional()
  .refine((v) => v == null || v === '' || normalizarWhatsapp(v) !== null, 'WhatsApp inválido')

const qualificacaoEnum = z
  .string()
  .refine((v) => TODAS_QUALIFICACOES.includes(v), 'Qualificação inválida')
const nivelEnum = z
  .string()
  .refine((v) => TODOS_NIVEIS.includes(v), 'Nível de acesso inválido')

export const usuarioAdminUpdateSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(120, 'Máximo de 120 caracteres').optional(),
  email: z.string().trim().email('E-mail inválido').optional(),
  whatsapp: whatsappOpcional,
  ativo: z.boolean().optional()
})

// Criação de usuário pelo admin: conta nasce aprovada e ativa, com senha definida.
export const usuarioAdminCreateSchema = z.object({
  nome: z.string().trim().min(2, 'Nome muito curto').max(120, 'Máximo de 120 caracteres'),
  email: z.string().trim().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
  whatsapp: whatsappOpcional,
  qualificacao: qualificacaoEnum.default('MEMBRO'),
  nivelAcesso: nivelEnum.default('USUARIO')
})

// Redefinição de senha pelo admin.
export const senhaResetSchema = z.object({
  senha: z.string().min(6, 'A senha deve ter ao menos 6 caracteres')
})
