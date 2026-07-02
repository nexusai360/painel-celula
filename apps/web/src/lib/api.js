import axios from 'axios'

// Sem VITE_API_URL → padrão de dev (localhost:3000).
// VITE_API_URL="" (vazio) → caminho relativo (mesma origem), para o modo
// "serviço único" em que a própria API serve o front.
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api = axios.create({ baseURL })

const CHAVE_TOKEN = 'icelula:token'

export function getToken() {
  return localStorage.getItem(CHAVE_TOKEN)
}

export function setToken(token) {
  if (token) localStorage.setItem(CHAVE_TOKEN, token)
  else localStorage.removeItem(CHAVE_TOKEN)
}

// Injeta o JWT em toda requisição quando presente
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ---- Endpoints de autenticação ----
export async function apiRegister({ nome, email, senha, qrToken }) {
  const { data } = await api.post('/auth/register', { nome, email, senha, qrToken })
  return data // { token, usuario }
}

export async function apiLogin({ email, senha }) {
  const { data } = await api.post('/auth/login', { email, senha })
  return data // { token, usuario }
}

export async function apiMe() {
  const { data } = await api.get('/auth/me')
  return data.usuario
}

// ---- Célula pública (para a landing do QR Code) ----
export async function apiCelulaPublica(qrToken) {
  const { data } = await api.get(`/public/celula/${qrToken}`)
  return data // { nome }
}

// ---- Células ----
export async function apiListarCelulas() {
  const { data } = await api.get('/celulas')
  return data.celulas
}

export async function apiObterCelula(id) {
  const { data } = await api.get(`/celulas/${id}`)
  return data.celula
}

export async function apiCriarCelula(dados) {
  const { data } = await api.post('/celulas', dados)
  return data.celula
}

export async function apiAtualizarCelula(id, dados) {
  const { data } = await api.put(`/celulas/${id}`, dados)
  return data.celula
}

export async function apiExcluirCelula(id) {
  await api.delete(`/celulas/${id}`)
}

export async function apiDefinirLider(celulaId, userId) {
  const { data } = await api.post(`/celulas/${celulaId}/lider`, { userId })
  return data.celula
}

// ---- Encontros ----
export async function apiListarEncontros(celulaId, params = {}) {
  const { data } = await api.get(`/celulas/${celulaId}/encontros`, { params })
  return data.encontros
}

export async function apiAtualizarEncontro(id, dados) {
  const { data } = await api.put(`/encontros/${id}`, dados)
  return data.encontro
}

export async function apiCriarEncontro(celulaId, dados) {
  const { data } = await api.post(`/celulas/${celulaId}/encontros`, dados)
  return data.encontro
}

export async function apiEstenderCronograma(celulaId, horizonteDias) {
  const { data } = await api.post(`/celulas/${celulaId}/encontros/estender`, { horizonteDias })
  return data.criados
}

// ---- Presença ----
export async function apiMarcarPresenca(encontroId) {
  const { data } = await api.post(`/encontros/${encontroId}/presenca`)
  return data            // { presenca, totalPresencas }
}

export async function apiDesmarcarPresenca(encontroId) {
  const { data } = await api.delete(`/encontros/${encontroId}/presenca`)
  return data            // { totalPresencas }
}

export async function apiListarPresencas(encontroId) {
  const { data } = await api.get(`/encontros/${encontroId}/presencas`)
  return data // { presencas, total }
}

export async function apiFrequencia(celulaId) {
  const { data } = await api.get(`/celulas/${celulaId}/frequencia`)
  return data
}

// ---- Usuários (admin) ----
export async function apiListarUsuarios(busca) {
  const { data } = await api.get('/usuarios', { params: busca ? { busca } : {} })
  return data.usuarios
}

export async function apiUsuariosPendentes() {
  const { data } = await api.get('/usuarios/pendentes')
  return data.usuarios
}

export async function apiAprovarUsuario(id, qualificacao = 'MEMBRO') {
  const { data } = await api.post(`/usuarios/${id}/aprovar`, { qualificacao })
  return data.usuario
}

export async function apiRecusarUsuario(id) {
  await api.post(`/usuarios/${id}/recusar`)
}

export async function apiAtualizarNivel(id, nivelAcesso) {
  const { data } = await api.patch(`/usuarios/${id}/nivel`, { nivelAcesso })
  return data.usuario
}

export async function apiAtualizarQualificacao(id, qualificacao) {
  const { data } = await api.patch(`/usuarios/${id}/qualificacao`, { qualificacao })
  return data.usuario
}

export async function apiAtualizarUsuario(id, dados) {
  const { data } = await api.put(`/usuarios/${id}`, dados)
  return data.usuario
}

export async function apiAtualizarUsuarioAtivo(id, ativo) {
  const { data } = await api.put(`/usuarios/${id}`, { ativo })
  return data.usuario
}

// ---- Notificações in-app ----
export async function apiNotificacoes() {
  const { data } = await api.get('/notificacoes')
  return data
}
export async function apiLerNotificacoes() {
  await api.post('/notificacoes/ler')
}
export async function apiEnviarNotificacao(payload) {
  const { data } = await api.post('/notificacoes', payload)
  return data
}

// ---- Banner administrativo ----
export async function apiBanner() {
  const { data } = await api.get('/banner')
  return data.banner
}
export async function apiBannerAdmin() {
  const { data } = await api.get('/banner/admin')
  return data.banner
}
export async function apiSalvarBanner(mensagem, ativo) {
  const { data } = await api.put('/banner', { mensagem, ativo })
  return data.banner
}

// ---- Check-in por QR Code (marca presença de hoje, se na janela) ----
export async function apiCheckinQr(qrToken) {
  const { data } = await api.post(`/qr/${qrToken}/checkin`)
  return data
}

// ---- Onboarding: seleção de célula ----
export async function apiCelulasPublicas() {
  const { data } = await api.get('/celulas/publicas')
  return data.celulas
}

export async function apiSelecionarCelula(celulaId) {
  const { data } = await api.post('/perfil/celula', { celulaId })
  return data.usuario
}

// ---- Cônjuge (duplo opt-in) ----
export async function apiConjuge() {
  const { data } = await api.get('/perfil/conjuge')
  return data
}
export async function apiConvidarConjuge(email) {
  const { data } = await api.post('/perfil/conjuge', { email })
  return data
}
export async function apiAceitarConjuge(id) {
  await api.post(`/perfil/conjuge/${id}/aceitar`)
}
export async function apiRecusarConjuge(id) {
  await api.post(`/perfil/conjuge/${id}/recusar`)
}
export async function apiRemoverConjuge() {
  await api.delete('/perfil/conjuge')
}

// ---- Config ----
export async function apiConfig() {
  const { data } = await api.get('/config')
  return data // { googleHabilitado }
}

// ---- Google OAuth ----
export async function apiGoogleAuthUrl(contexto, qrToken) {
  const params = { contexto }
  if (qrToken) params.qrToken = qrToken
  const { data } = await api.get('/auth/google', { params })
  return data // { url }
}

export async function apiDesconectarGoogle() {
  await api.delete('/google')
}

// ---- Perfil ----
export async function apiAtualizarPerfil(payload) {
  const { data } = await api.put('/perfil', payload)
  return data.usuario
}

// ---- Pedidos de Oração ----
export async function apiListarPedidos() {
  const { data } = await api.get('/pedidos')
  return data.pedidos
}
export async function apiCriarPedido(payload) {
  const { data } = await api.post('/pedidos', payload)
  return data.pedido
}
export async function apiAtualizarPedido(id, payload) {
  const { data } = await api.put(`/pedidos/${id}`, payload)
  return data.pedido
}
export async function apiExcluirPedido(id) {
  await api.delete(`/pedidos/${id}`)
}
export async function apiTestemunhar(pedidoId) {
  const { data } = await api.post(`/pedidos/${pedidoId}/testemunho`)
  return data.testemunho
}

// ---- Testemunhos (líder) ----
export async function apiListarTestemunhos() {
  const { data } = await api.get('/testemunhos')
  return data.testemunhos
}
export async function apiConcluirTestemunho(id) {
  const { data } = await api.post(`/testemunhos/${id}/concluir`)
  return data.testemunho
}

// ---- Membros ----
export async function apiListarMembros(celulaId) {
  const { data } = await api.get(`/celulas/${celulaId}/membros`)
  return data.membros
}
export async function apiAtualizarMembro(userId, dados) {
  const { data } = await api.put(`/usuarios/${userId}`, dados)
  return data.usuario
}
