export function googleHabilitado() {
  return (
    process.env.GOOGLE_OAUTH_ENABLED === 'true' &&
    !!process.env.GOOGLE_CLIENT_ID &&
    !!process.env.GOOGLE_CLIENT_SECRET
  )
}

export function googleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
    webUrl: process.env.WEB_URL || 'http://localhost:5173'
  }
}
