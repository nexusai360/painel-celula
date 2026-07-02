#!/usr/bin/env node
/**
 * deploy.mjs — força o redeploy do Painel de Célula em produção AGORA.
 *
 * Uso normal do dia a dia é só `git push` na main: o Shepherd (na VPS) atualiza
 * sozinho em ~10 min. Este script é o FALLBACK para "forçar na hora" (ou se o
 * Shepherd estiver fora). Faz o mesmo que o Shepherd, sob demanda:
 *   1. lê PORTAINER_URL/TOKEN de .env.deploy (gitignored);
 *   2. obtém credencial de pull do GHCR via `gh auth token` (imagem é privada);
 *   3. força `docker service update` do painel-celula_app (ForceUpdate++), que
 *      re-puxa a :latest; o entrypoint aplica migrations e recria o admin;
 *   4. acompanha a convergência e valida https://celula.nexusai360.com/health.
 *
 * Requisitos: Node 24 (fetch nativo), `gh` logado (para o pull da imagem privada).
 * Pré-requisito: a imagem nova já publicada no GHCR (workflow "Build and Push" ok).
 *
 *   node scripts/deploy.mjs            # força o redeploy e verifica
 *   node scripts/deploy.mjs --status   # só mostra o estado atual (não mexe)
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const SERVICO = 'painel-celula_app'
const HOST = 'https://celula.nexusai360.com'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function lerEnvDeploy() {
  let txt
  try {
    txt = readFileSync(join(RAIZ, '.env.deploy'), 'utf8')
  } catch {
    sair('.env.deploy não encontrado. Ele guarda PORTAINER_URL/PORTAINER_TOKEN (gitignored).')
  }
  const env = {}
  for (const linha of txt.split('\n')) {
    if (!linha || linha.startsWith('#')) continue
    const i = linha.indexOf('=')
    if (i > 0) env[linha.slice(0, i).trim()] = linha.slice(i + 1).trim()
  }
  if (!env.PORTAINER_URL || !env.PORTAINER_TOKEN) sair('PORTAINER_URL/PORTAINER_TOKEN ausentes no .env.deploy.')
  return env
}

function sair(msg) { console.error('[deploy] ERRO:', msg); process.exit(1) }

const IMAGE_REPO = 'ghcr.io/nexusai360/painel-celula'

function ghToken() {
  try { return execSync('gh auth token', { encoding: 'utf8' }).trim() } catch { return null }
}

function pullAuthGHCR(token) {
  // A imagem é privada (org nexusai360). Passamos X-Registry-Auth para o pull.
  if (!token) {
    console.warn('[deploy] aviso: `gh auth token` falhou; seguindo sem X-Registry-Auth (usa a credencial do nó).')
    return null
  }
  return Buffer.from(JSON.stringify({ username: 'jvzanini', password: token, serveraddress: 'ghcr.io' })).toString('base64')
}

/**
 * Resolve o digest atual da :latest no GHCR. O Swarm FIXA o digest no spec, então
 * um ForceUpdate sozinho não puxa a imagem nova — é preciso apontar o serviço para
 * o digest novo (é o que o Shepherd faz). Retorna `repo@sha256:...` ou null.
 */
async function resolverImagemNova(token) {
  if (!token) return null
  try {
    const b = Buffer.from('jvzanini:' + token).toString('base64')
    const tr = await fetch(`https://ghcr.io/token?scope=repository:nexusai360/painel-celula:pull&service=ghcr.io`, { headers: { Authorization: 'Basic ' + b } })
    const jt = (await tr.json()).token
    const accept = 'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json'
    const m = await fetch(`https://ghcr.io/v2/nexusai360/painel-celula/manifests/latest`, { method: 'HEAD', headers: { Authorization: 'Bearer ' + jt, Accept: accept } })
    const digest = m.headers.get('docker-content-digest')
    return digest ? `${IMAGE_REPO}@${digest}` : null
  } catch {
    return null
  }
}

async function main() {
  const env = lerEnvDeploy()
  const BASE = env.PORTAINER_URL.replace(/\/$/, '')
  const EP = env.PORTAINER_ENDPOINT_ID || '1'
  const H = { 'X-API-Key': env.PORTAINER_TOKEN }
  const api = (p, opts = {}) => fetch(BASE + p, { ...opts, headers: { ...H, ...(opts.headers || {}) } })

  const servicos = await (await api(`/api/endpoints/${EP}/docker/services`)).json()
  const app = servicos.find((s) => s?.Spec?.Name === SERVICO)
  if (!app) sair(`serviço ${SERVICO} não encontrado no Swarm.`)

  if (process.argv.includes('--status')) {
    console.log(`[deploy] ${SERVICO} imagem=${app.Spec.TaskTemplate.ContainerSpec.Image.split('@')[0]} versão=${app.Version.Index}`)
    await verificar(true)
    return
  }

  console.log(`[deploy] resolvendo o digest atual da :latest no GHCR...`)
  const token = ghToken()
  const auth = pullAuthGHCR(token)
  const imagemNova = await resolverImagemNova(token)
  const spec = app.Spec
  spec.TaskTemplate.ForceUpdate = (spec.TaskTemplate.ForceUpdate || 0) + 1
  if (imagemNova) {
    console.log(`[deploy] apontando serviço para ${imagemNova.slice(0, 60)}...`)
    spec.TaskTemplate.ContainerSpec.Image = imagemNova
  } else {
    // Fallback: usa a tag (Swarm re-resolve com a auth); menos garantido que o digest.
    console.warn('[deploy] não resolvi o digest; usando a tag :latest (pode não puxar a nova).')
    spec.TaskTemplate.ContainerSpec.Image = `${IMAGE_REPO}:latest`
  }
  const res = await api(`/api/endpoints/${EP}/docker/services/${app.ID}/update?version=${app.Version.Index}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { 'X-Registry-Auth': auth } : {}) },
    body: JSON.stringify(spec)
  })
  if (res.status !== 200) sair(`update retornou HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  console.log('[deploy] update aceito. Aguardando convergência...')

  // Convergência
  let ok = false
  for (let i = 0; i < 18; i++) {
    const tasks = await (await api(`/api/endpoints/${EP}/docker/tasks?filters=${encodeURIComponent(JSON.stringify({ label: ['com.docker.stack.namespace=painel-celula'] }))}`)).json()
    const rec = tasks.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))
    const running = rec.find((t) => t.DesiredState === 'running' && t.Status.State === 'running')
    const erro = rec.slice(0, 2).find((t) => t.Status.Err)
    process.stdout.write(`\r[deploy] t+${i * 10}s  ${rec.slice(0, 2).map((t) => t.Status.State).join(', ')}${erro ? '  err: ' + erro.Status.Err.slice(0, 40) : ''}        `)
    if (running) { ok = true; break }
    await sleep(10000)
  }
  console.log(ok ? '\n[deploy] serviço RUNNING ✓' : '\n[deploy] não convergiu no tempo esperado — ver Portainer.')
  await verificar()
}

async function verificar(silencioso = false) {
  for (let i = 0; i < 10; i++) {
    try {
      const r = await fetch(HOST + '/health')
      if (r.status === 200) {
        console.log(`[deploy] health ${HOST} -> 200 ${await r.text()}`)
        return
      }
    } catch { /* ainda subindo */ }
    if (!silencioso) process.stdout.write(`\r[deploy] aguardando health... (${i * 6}s)   `)
    await sleep(6000)
  }
  console.log(`\n[deploy] health não respondeu 200 a tempo — verifique ${HOST} e o Traefik.`)
}

main().catch((e) => sair(e.message))
