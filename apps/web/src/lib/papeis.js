import { Eye, Shield, ShieldCheck, Crown, Clock, UserCheck, UserX, Ban } from 'lucide-react'

// RBAC e rótulos vêm da fonte única (@icelula/shared).
export {
  ROTULO_PAPEL, PAPEL_RANK, temNivel, ehAdmin, ehSuperAdmin, ehLider, ehGestor,
  podeEditarPapel, opcoesDePapel, podeAgirSobre,
} from '@icelula/shared'

// Chips: bg translúcido + borda + texto -700 (light, AA) / -400 (dark). Sempre com ícone.
export const CORES_PAPEL = {
  MEMBRO: { chip: 'bg-zinc-500/10 border border-zinc-500/30 text-zinc-700 dark:text-zinc-300', icon: Eye, label: 'Membro' },
  LIDER: { chip: 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400', icon: Shield, label: 'Líder' },
  ADMIN: { chip: 'bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400', icon: ShieldCheck, label: 'Administrador' },
  SUPER_ADMIN: { chip: 'chrome border border-white/20', icon: Crown, label: 'Super Admin' },
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
