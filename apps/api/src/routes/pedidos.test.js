import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../prisma.js'
import { hashSenha } from '../lib/password.js'

let app
const sufixo = Date.now()
let autorId, outroId, autorToken, outroToken

beforeAll(async () => {
  app = buildApp(); await app.ready()
  const autor = await prisma.user.create({
    data: { nome: 'Autor', email: `autor-${sufixo}@test.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO' }
  })
  const outro = await prisma.user.create({
    data: { nome: 'Outro', email: `outro-${sufixo}@test.com`, senhaHash: await hashSenha('x'), papel: 'MEMBRO' }
  })
  autorId = autor.id; outroId = outro.id
  autorToken = app.jwt.sign({ id: autorId, papel: 'MEMBRO', celulaId: null })
  outroToken = app.jwt.sign({ id: outroId, papel: 'MEMBRO', celulaId: null })
})

afterAll(async () => {
  await prisma.testemunho.deleteMany({ where: { userId: { in: [autorId, outroId] } } })
  await prisma.pedidoOracao.deleteMany({ where: { userId: { in: [autorId, outroId] } } })
  await prisma.user.deleteMany({ where: { id: { in: [autorId, outroId] } } })
  await app.close()
})

function criar(token, payload) {
  return app.inject({ method: 'POST', url: '/pedidos', headers: { authorization: `Bearer ${token}` }, payload })
}

describe('POST /pedidos', () => {
  it('cria pedido do autor logado', async () => {
    const res = await criar(autorToken, { titulo: 'Cura', detalhes: 'saúde' })
    expect(res.statusCode).toBe(201)
    expect(res.json().pedido.titulo).toBe('Cura')
    expect(res.json().pedido.status).toBe('ATIVO')
  })
  it('rejeita título vazio → 400', async () => {
    const res = await criar(autorToken, { titulo: '' })
    expect(res.statusCode).toBe(400)
  })
  it('testemunhar:true cria testemunho e marca pedido ATENDIDO', async () => {
    const res = await criar(autorToken, { titulo: 'Emprego', testemunhar: true })
    expect(res.statusCode).toBe(201)
    const pedidoId = res.json().pedido.id
    expect(res.json().pedido.status).toBe('ATENDIDO')
    const t = await prisma.testemunho.findUnique({ where: { pedidoId } })
    expect(t).not.toBeNull()
    expect(t.titulo).toBe('Emprego')
    expect(t.status).toBe('PENDENTE')
  })
})

describe('GET /pedidos', () => {
  it('lista apenas os pedidos do autor (privacidade)', async () => {
    await criar(outroToken, { titulo: 'Do outro' })
    const res = await app.inject({ method: 'GET', url: '/pedidos', headers: { authorization: `Bearer ${autorToken}` } })
    expect(res.statusCode).toBe(200)
    const titulos = res.json().pedidos.map((p) => p.titulo)
    expect(titulos).toContain('Cura')
    expect(titulos).not.toContain('Do outro')
    const comTestemunho = res.json().pedidos.find((p) => p.titulo === 'Emprego')
    expect(comTestemunho.testemunhado).toBe(true)
  })
})

describe('PUT /pedidos/:id', () => {
  it('autor edita o próprio pedido', async () => {
    const criado = (await criar(autorToken, { titulo: 'Antigo' })).json().pedido
    const res = await app.inject({
      method: 'PUT', url: `/pedidos/${criado.id}`,
      headers: { authorization: `Bearer ${autorToken}` }, payload: { titulo: 'Novo' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().pedido.titulo).toBe('Novo')
  })
  it('não-autor recebe 404', async () => {
    const criado = (await criar(autorToken, { titulo: 'Privado' })).json().pedido
    const res = await app.inject({
      method: 'PUT', url: `/pedidos/${criado.id}`,
      headers: { authorization: `Bearer ${outroToken}` }, payload: { titulo: 'Hack' }
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /pedidos/:id/testemunho', () => {
  it('duas requisições concorrentes não duplicam testemunho (corrida P2002)', async () => {
    const criado = (await criar(autorToken, { titulo: 'Concorrência' })).json().pedido
    const chamar = () => app.inject({
      method: 'POST', url: `/pedidos/${criado.id}/testemunho`, headers: { authorization: `Bearer ${autorToken}` }
    })
    const [r1, r2] = await Promise.all([chamar(), chamar()])
    expect([r1.statusCode, r2.statusCode]).toEqual([expect.any(Number), expect.any(Number)])
    expect(r1.statusCode).not.toBe(500)
    expect(r2.statusCode).not.toBe(500)
    expect(r1.json().testemunho.id).toBe(r2.json().testemunho.id)
    const total = await prisma.testemunho.count({ where: { pedidoId: criado.id } })
    expect(total).toBe(1)
  })

  it('é idempotente e o testemunho sobrevive à exclusão do pedido', async () => {
    const criado = (await criar(autorToken, { titulo: 'Milagre' })).json().pedido
    const r1 = await app.inject({ method: 'POST', url: `/pedidos/${criado.id}/testemunho`, headers: { authorization: `Bearer ${autorToken}` } })
    expect(r1.statusCode).toBe(201)
    const r2 = await app.inject({ method: 'POST', url: `/pedidos/${criado.id}/testemunho`, headers: { authorization: `Bearer ${autorToken}` } })
    expect(r2.json().testemunho.id).toBe(r1.json().testemunho.id) // não duplica

    await app.inject({ method: 'DELETE', url: `/pedidos/${criado.id}`, headers: { authorization: `Bearer ${autorToken}` } })
    const t = await prisma.testemunho.findUnique({ where: { id: r1.json().testemunho.id } })
    expect(t).not.toBeNull()          // sobreviveu
    expect(t.pedidoId).toBeNull()     // vínculo virou null
    expect(t.titulo).toBe('Milagre')  // título mantido
  })
})

describe('DELETE /pedidos/:id', () => {
  it('autor exclui o próprio pedido', async () => {
    const criado = (await criar(autorToken, { titulo: 'Excluir' })).json().pedido
    const res = await app.inject({ method: 'DELETE', url: `/pedidos/${criado.id}`, headers: { authorization: `Bearer ${autorToken}` } })
    expect(res.statusCode).toBe(204)
  })
})
