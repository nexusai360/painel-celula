import {
  Eye, Shield, ShieldCheck, Crown, Clock, UserCheck, UserX, Ban, User, UserPlus, Music, Users, BookOpen,
} from 'lucide-react'

// RBAC e rótulos vêm da fonte única (@icelula/shared).
export {
  // legado (até a Task 9)
  ROTULO_PAPEL, PAPEL_RANK, temNivel, ehLider, ehGestor, podeEditarPapel, opcoesDePapel, podeAgirSobre,
  // eixo nível de acesso
  ROTULO_NIVEL, NIVEL_RANK, TODOS_NIVEIS, temNivelAcesso, ehAdmin, ehSuperAdmin, podeEditarNivel,
  opcoesDeNivel, podeAgirSobreNivel,
  // eixo qualificação
  ROTULO_QUALIFICACAO, QUALIFICACAO_RANK, TODAS_QUALIFICACOES, qualificacaoMinima, ehGestorQualificacao,
  podeCriarCelulaQualificacao, opcoesDeQualificacao, podeEditarQualificacao,
} from '@icelula/shared'

// Chips: bg translúcido + borda + texto -700 (light, AA) / -400 (dark). Sempre com ícone.
export const CORES_PAPEL = {
  MEMBRO: { chip: 'bg-zinc-500/10 border border-zinc-500/30 text-zinc-700 dark:text-zinc-300', icon: Eye, label: 'Membro' },
  LIDER: { chip: 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400', icon: Shield, label: 'Líder' },
  ADMIN: { chip: 'bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400', icon: ShieldCheck, label: 'Administrador' },
  SUPER_ADMIN: { chip: 'chrome border border-white/20', icon: Crown, label: 'Super Admin' },
}

// Nível de acesso (plataforma). USUARIO normalmente não recebe badge visível.
export const CORES_NIVEL = {
  USUARIO: { chip: 'bg-zinc-500/10 border border-zinc-500/30 text-zinc-700 dark:text-zinc-300', icon: User, label: 'Usuário' },
  ADMIN: { chip: 'bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400', icon: ShieldCheck, label: 'Administrador' },
  SUPER_ADMIN: { chip: 'chrome border border-white/20', icon: Crown, label: 'Super Admin' },
}

// Qualificação (função). Cores distintas, mantendo a marca prata/grafite como base.
export const CORES_QUALIFICACAO = {
  CONVIDADO: { chip: 'bg-zinc-500/10 border border-zinc-500/30 text-zinc-600 dark:text-zinc-400', icon: UserPlus, label: 'Convidado' },
  MEMBRO: { chip: 'bg-slate-500/10 border border-slate-500/30 text-slate-700 dark:text-slate-300', icon: User, label: 'Membro' },
  LOUVOR: { chip: 'bg-violet-500/10 border border-violet-500/30 text-violet-700 dark:text-violet-400', icon: Music, label: 'Louvor' },
  COLIDER: { chip: 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-400', icon: Users, label: 'Co-líder' },
  LIDER: { chip: 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400', icon: Shield, label: 'Líder' },
  PASTOR: { chip: 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400', icon: BookOpen, label: 'Pastor' },
}

export const CORES_STATUS = {
  PENDENTE: { chip: 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400', icon: Clock, label: 'Em aprovação' },
  ATIVO: { chip: 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400', icon: UserCheck, label: 'Ativo' },
  INATIVO: { chip: 'bg-zinc-500/10 border border-zinc-500/30 text-zinc-600 dark:text-zinc-400', icon: UserX, label: 'Inativo' },
  REPROVADO: { chip: 'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400', icon: Ban, label: 'Reprovado' },
}

/** Deriva o status visível: pendente=aprovado:false+ativo; reprovado=aprovado:false+inativo. */
export function statusDeUsuario(u) {
  if (!u) return 'INATIVO'
  if (u.aprovado === false) return u.ativo === false ? 'REPROVADO' : 'PENDENTE'
  return u.ativo === false ? 'INATIVO' : 'ATIVO'
}
