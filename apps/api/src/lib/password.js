import bcrypt from 'bcryptjs'

const CUSTO = 10

export function hashSenha(senha) {
  return bcrypt.hash(senha, CUSTO)
}

export function verificarSenha(senha, hash) {
  return bcrypt.compare(senha, hash)
}
