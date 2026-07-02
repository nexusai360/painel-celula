import { prisma } from '../../prisma.js'
import { getGoogleApi } from '../google/api.js'
import { montarEvento } from '../google/evento.js'
import { decifrar, chaveDeAmbiente } from '../google/cripto.js'

function vinculado(user) {
  return user?.googleConectado && user.googleCalendarId && user.googleRefreshTokenEnc
}

export async function accessTokenDoMembro(user) {
  if (!vinculado(user)) return null
  try {
    const refresh = decifrar(user.googleRefreshTokenEnc, chaveDeAmbiente())
    return await getGoogleApi().accessTokenDe(refresh)
  } catch {
    await prisma.user.update({ where: { id: user.id }, data: { googleConectado: false } }).catch(() => {})
    return null
  }
}

export async function sincronizarMembro(userId) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!vinculado(user) || !user.celulaId) return
    const token = await accessTokenDoMembro(user)
    if (!token) return
    const celula = await prisma.celula.findUnique({ where: { id: user.celulaId } })
    const encontros = await prisma.encontro.findMany({
      where: { celulaId: user.celulaId, status: { not: 'CANCELADO' } }
    })
    const api = getGoogleApi()
    for (const enc of encontros) {
      const existe = await prisma.googleEventoSync.findUnique({
        where: { userId_encontroId: { userId, encontroId: enc.id } }
      })
      if (existe) continue
      try {
        const gid = await api.criarEvento(token, user.googleCalendarId, montarEvento(enc, celula.nome))
        await prisma.googleEventoSync.create({ data: { userId, encontroId: enc.id, googleEventId: gid } })
      } catch (e) { console.error('sync criar falhou', e?.message) }
    }
  } catch (e) { console.error('calendarSync sincronizarMembro falhou', e?.message) }
}

export async function sincronizarEncontro(encontroId) {
  try {
    const enc = await prisma.encontro.findUnique({ where: { id: encontroId }, include: { celula: true } })
    if (!enc) return
    if (enc.status === 'CANCELADO') return await removerEncontro(encontroId)
    const membros = await prisma.user.findMany({
      where: {
        celulaId: enc.celulaId,
        googleConectado: true,
        googleCalendarId: { not: null },
        googleRefreshTokenEnc: { not: null }
      }
    })
    const api = getGoogleApi()
    for (const user of membros) {
      const token = await accessTokenDoMembro(user)
      if (!token) continue
      const map = await prisma.googleEventoSync.findUnique({
        where: { userId_encontroId: { userId: user.id, encontroId } }
      })
      const evento = montarEvento(enc, enc.celula.nome)
      try {
        if (map) {
          await api.atualizarEvento(token, user.googleCalendarId, map.googleEventId, evento)
        } else {
          const gid = await api.criarEvento(token, user.googleCalendarId, evento)
          await prisma.googleEventoSync.create({ data: { userId: user.id, encontroId, googleEventId: gid } })
        }
      } catch (e) { console.error('sync encontro falhou', e?.message) }
    }
  } catch (e) { console.error('calendarSync sincronizarEncontro falhou', e?.message) }
}

export async function removerEncontro(encontroId) {
  try {
    const maps = await prisma.googleEventoSync.findMany({
      where: { encontroId }, include: { user: true }
    })
    const api = getGoogleApi()
    for (const map of maps) {
      const token = await accessTokenDoMembro(map.user)
      if (token) {
        try { await api.removerEvento(token, map.user.googleCalendarId, map.googleEventId) }
        catch (e) { console.error('sync remover falhou', e?.message) }
      }
    }
    await prisma.googleEventoSync.deleteMany({ where: { encontroId } })
  } catch (e) { console.error('calendarSync removerEncontro falhou', e?.message) }
}

export async function removerMembro(userId) {
  try {
    const maps = await prisma.googleEventoSync.findMany({ where: { userId } })
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const token = user ? await accessTokenDoMembro(user) : null
    const api = getGoogleApi()
    if (token) {
      for (const map of maps) {
        try { await api.removerEvento(token, user.googleCalendarId, map.googleEventId) }
        catch (e) { console.error('sync remover membro falhou', e?.message) }
      }
    }
    await prisma.googleEventoSync.deleteMany({ where: { userId } })
  } catch (e) { console.error('calendarSync removerMembro falhou', e?.message) }
}
