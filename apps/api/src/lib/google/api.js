import { google } from 'googleapis'
import { googleConfig } from './config.js'

const ESCOPOS = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar']

function oauthClient() {
  const { clientId, clientSecret, redirectUri } = googleConfig()
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

const googleApiReal = {
  async montarAuthUrl({ state }) {
    return oauthClient().generateAuthUrl({
      access_type: 'offline', prompt: 'consent', scope: ESCOPOS, state
    })
  },
  async trocarCode(code) {
    const cli = oauthClient()
    const { tokens } = await cli.getToken(code)
    cli.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: cli })
    const { data } = await oauth2.userinfo.get()
    return { sub: data.id, email: data.email, nome: data.name, refreshToken: tokens.refresh_token, emailVerificado: data.verified_email }
  },
  async accessTokenDe(refreshToken) {
    const cli = oauthClient()
    cli.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await cli.refreshAccessToken()
    return credentials.access_token
  },
  async garantirCalendario(accessToken, calendarIdExistente) {
    if (calendarIdExistente) return calendarIdExistente
    const cli = oauthClient(); cli.setCredentials({ access_token: accessToken })
    const cal = google.calendar({ version: 'v3', auth: cli })
    const { data } = await cal.calendars.insert({
      requestBody: { summary: 'Hineni', timeZone: 'America/Sao_Paulo' }
    })
    return data.id
  },
  async criarEvento(accessToken, calendarId, evento) {
    const cli = oauthClient(); cli.setCredentials({ access_token: accessToken })
    const cal = google.calendar({ version: 'v3', auth: cli })
    const { data } = await cal.events.insert({ calendarId, requestBody: evento })
    return data.id
  },
  async atualizarEvento(accessToken, calendarId, googleEventId, evento) {
    const cli = oauthClient(); cli.setCredentials({ access_token: accessToken })
    const cal = google.calendar({ version: 'v3', auth: cli })
    await cal.events.update({ calendarId, eventId: googleEventId, requestBody: evento })
  },
  async removerEvento(accessToken, calendarId, googleEventId) {
    const cli = oauthClient(); cli.setCredentials({ access_token: accessToken })
    const cal = google.calendar({ version: 'v3', auth: cli })
    await cal.events.delete({ calendarId, eventId: googleEventId }).catch(() => {})
  }
}

let apiInjetada = null
export function getGoogleApi() { return apiInjetada || googleApiReal }
export function setGoogleApiParaTestes(fake) { apiInjetada = fake }
export function limparGoogleApiParaTestes() { apiInjetada = null }
