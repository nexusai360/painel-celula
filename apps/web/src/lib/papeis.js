export const ROTULO_PAPEL = {
  MEMBRO: 'Membro',
  LIDER: 'Líder',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Admin'
}

export const PAPEL_RANK = { MEMBRO: 1, LIDER: 2, ADMIN: 3, SUPER_ADMIN: 4 }

// Admin ou acima (inclui o dono/super admin) — usar para liberar a área admin.
export function ehAdmin(papel) {
  return (PAPEL_RANK[papel] || 0) >= PAPEL_RANK.ADMIN
}

export function ehSuperAdmin(papel) {
  return papel === 'SUPER_ADMIN'
}
