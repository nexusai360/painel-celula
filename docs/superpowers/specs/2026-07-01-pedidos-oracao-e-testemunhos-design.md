# Fatia 1 — Pedidos de Oração + Testemunhos (+ navegação drawer)

**Data:** 2026-07-01
**Status:** aprovado no brainstorm, pronto para plano de implementação

## 1. Contexto e objetivo

O projeto Hineni (iCélula) tem hoje células, encontros, presença, frequência e
integração Google Calendar. Esta fatia entrega a primeira parte do bloco social:
**Pedidos de Oração** (para Membro e Líder) e **Testemunhos** (para o Líder),
mais o ajuste de **navegação** que o crescimento de itens de menu exige.

O schema já contém scaffold parcial (`PedidoOracao` com campo `texto` único;
`Testemunho` com status/`concluidoEm`). Esta fatia **evolui** esses models — não
cria do zero.

## 2. Escopo

**Entra nesta fatia:**
- Tela "Meus Pedidos" (lista expansível) — Membro e Líder.
- Card Novo/Editar Pedido (tela própria) — reproduz a imagem de referência.
- Tela "Testemunhos" — só Líder.
- Backend: evolução de `PedidoOracao` e `Testemunho` + rotas.
- Navegação: novo padrão **drawer** no mobile; logo clicável → Início.

**NÃO entra (fatias seguintes):**
- Fatia 2 — Membros (abas Informações/Membros, inativar/reativar, cards de aviso de exclusão de célula/membro).
- Fatia 3 — Vidas (painel de fotos flutuantes).

## 3. Decisões de produto (do brainstorm)

1. **Pedidos são privados ao autor.** Só o autor vê os próprios pedidos ("Meus Pedidos"). Ninguém mais vê conteúdo do pedido.
2. **Título do testemunho = título do pedido** (cópia/snapshot no momento de testemunhar).
3. **No card de novo pedido, "Dar Testemunho" salva o pedido e cria o testemunho** num só clique (transação).
4. **1 testemunho por pedido**, e o testemunho **sobrevive à exclusão do pedido** (guarda cópia do título; `pedidoId` vira null).
5. **Dar testemunho marca o pedido como ATENDIDO** (usa o enum existente); o pedido segue em "Meus Pedidos" com um selo discreto "Atendido".
6. **O líder vê só título + autor + data** do testemunho. Os detalhes do pedido continuam privados do autor.
7. **Título obrigatório (≤100), Detalhes opcional (≤500).**
8. **O líder vê também os próprios testemunhos** na tela de Testemunhos (é membro da própria célula).
9. **Excluir pedido pede confirmação** (card de aviso reutilizável).
10. **Pendentes em fila (mais antigo primeiro); concluídos por realização mais recente primeiro.**
11. **Citação bíblica fixa** (Salmos 37:5) no card, por ora.
12. **Navegação mobile:** drawer lateral (☰); BottomNav removido. Desktop mantém TopBar horizontal. Logo clicável → Início.

## 4. Modelo de dados + migration

Arquivo: `apps/api/prisma/schema.prisma`. Enums `PedidoStatus (ATIVO|ATENDIDO)` e
`TestemunhoStatus (PENDENTE|CONCLUIDO)` já existem.

### PedidoOracao (evolui)
```prisma
model PedidoOracao {
  id           String       @id @default(cuid())
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  celula       Celula?      @relation(fields: [celulaId], references: [id], onDelete: SetNull)
  celulaId     String?
  titulo       String       // NOVO — obrigatório, ≤100 (validado por zod)
  detalhes     String?      // renomeia `texto`; agora opcional, ≤500 (validado por zod)
  status       PedidoStatus @default(ATIVO)
  criadoEm     DateTime     @default(now())
  atualizadoEm DateTime     @updatedAt
  testemunho   Testemunho?  // relação 1-1 opcional
}
```

### Testemunho (evolui)
```prisma
model Testemunho {
  id          String           @id @default(cuid())
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  celula      Celula?          @relation(fields: [celulaId], references: [id], onDelete: SetNull)
  celulaId    String?
  pedido      PedidoOracao?    @relation(fields: [pedidoId], references: [id], onDelete: SetNull)
  pedidoId    String?          @unique // NOVO — 1 por pedido; SetNull preserva o testemunho na exclusão do pedido
  titulo      String           // NOVO — snapshot do título do pedido (o que o líder vê)
  status      TestemunhoStatus @default(PENDENTE)
  criadoEm    DateTime         @default(now())
  concluidoEm DateTime?
}
```

### Migration
- Gerar com `npx prisma migrate dev`.
- Como `PedidoOracao`/`Testemunho` ainda **não têm dados reais** (feature nova), a
  recriação de colunas pela migration é aceitável (não há perda). Revisar o SQL
  gerado antes de aplicar, garantindo `titulo` NOT NULL nos dois models e
  `pedidoId` UNIQUE com FK `ON DELETE SET NULL`.

## 5. API

Novos arquivos `apps/api/src/routes/pedidos.js` e `apps/api/src/routes/testemunhos.js`,
registrados em `app.js` via `app.register(...)`. Padrão existente: `requireRole` +
`safeParse` (zod) + resposta `{ ... }` ou `{ erro, detalhes? }`.

### Pedidos — `requireRole('MEMBRO')`, sempre escopados ao autor logado
| Rota | Faz |
|---|---|
| `GET /pedidos` | Lista pedidos de `req.usuario.id`, `criadoEm desc`. Inclui `testemunhado: boolean` (existe testemunho vinculado). |
| `POST /pedidos` | Body `{ titulo, detalhes?, testemunhar? }`. Cria o pedido. Se `testemunhar:true`: transação que cria pedido + testemunho (título snapshot, `celulaId` do autor, `PENDENTE`) e seta pedido `ATENDIDO`. |
| `PUT /pedidos/:id` | Só o autor (404 caso contrário). Atualiza `titulo`/`detalhes`. |
| `DELETE /pedidos/:id` | Só o autor. Testemunho vinculado sobrevive (`SetNull`). |
| `POST /pedidos/:id/testemunho` | Só o autor. **Idempotente**: se já há testemunho, retorna o existente sem duplicar. Cria testemunho + marca pedido `ATENDIDO`. |

### Testemunhos — `requireRole('LIDER')`, escopados à célula liderada
| Rota | Faz |
|---|---|
| `GET /testemunhos` | Escopo: célula onde `liderId = req.usuario.id`. Se não lidera nenhuma → `[]`. Retorna cada testemunho com `{ id, titulo, criadoEm, status, concluidoEm, autor: { nome, avatar } }`. |
| `POST /testemunhos/:id/concluir` | Valida que o testemunho pertence à célula liderada. Marca `CONCLUIDO` + `concluidoEm = now()`. |

### Schemas compartilhados (`packages/shared`)
```js
// pedido.schemas.js
const pedidoCreateSchema = z.object({
  titulo: z.string().min(1, 'Informe um título').max(100),
  detalhes: z.string().max(500).optional(),
  testemunhar: z.boolean().optional()
})
const pedidoUpdateSchema = z.object({
  titulo: z.string().min(1).max(100),
  detalhes: z.string().max(500).optional()
})
```

## 6. Frontend

### Rotas (`apps/web/src/App.jsx`, dentro de `AppLayout`)
- `/app/pedidos` → `MeusPedidos` (MEMBRO+)
- `/app/pedidos/novo` → `PedidoForm` (criar)
- `/app/pedidos/:id/editar` → `PedidoForm` (editar)
- `/app/testemunhos` → `Testemunhos` (só LIDER; redireciona os demais)

### Cliente HTTP (`apps/web/src/lib/api.js`)
`apiListarPedidos`, `apiCriarPedido`, `apiAtualizarPedido`, `apiExcluirPedido`,
`apiTestemunhar(pedidoId)`, `apiListarTestemunhos`, `apiConcluirTestemunho(id)`.

### Tela "Meus Pedidos" (`pages/MeusPedidos.jsx` + `components/PedidoCard.jsx`)
- Lista `criadoEm desc`. Botão "Novo pedido" no topo. Empty state.
- **Card compacto:** título (branco) + data à direita (cinza-claro) + menu ⋮.
  - Menu ⋮: **✏️ Editar** · **🙏 Dar Testemunho** · **🗑️ Excluir** (vermelho).
  - "Dar Testemunho" **some** quando o pedido já foi testemunhado.
  - Selo discreto **"Atendido"** quando `status = ATENDIDO`.
- **"Ver detalhes ⌄/⌃"**: expande/recolhe (framer-motion, altura), área um tom mais
  escura; oculto se o pedido não tem detalhes.
- **Excluir** → `ConfirmDialog` ("Excluir este pedido? Não dá para desfazer.").

### Card Novo/Editar (`pages/PedidoForm.jsx`)
Reproduz a imagem de referência: título da tela, citação fixa em itálico, campo
Título (contador `x/100`), textarea Detalhes (contador `x/500`), botões
**Salvar** (outline) e **Dar Testemunho** (degradê `--brand-grad`), data automática
(criação, imutável, `dd/mm/aaaa`) no canto inferior direito.
- **Criar:** Salvar cria e volta; Dar Testemunho = `POST /pedidos {testemunhar:true}` e volta.
- **Editar:** pré-preenchido; data = criação original; se já testemunhado, botão "Dar Testemunho" oculto.
- Contadores ao vivo (`watch`); validação via `pedidoCreateSchema`/`pedidoUpdateSchema`.

### Tela "Testemunhos" (`pages/Testemunhos.jsx` + `components/TestemunhoItem.jsx`)
- Item: **Avatar + nome** do autor, **título**, **data** (criação do testemunho),
  botão **"Realizado"** à direita.
- **Realizado** → `POST /testemunhos/:id/concluir`: item escurece (opacidade), botão
  vira selo **"Realizado ✓"** (sem ação), e desce para abaixo dos pendentes com
  animação (framer-motion `layout`), atualização otimista.
- **Ordem:** pendentes em cima em fila (`criadoEm asc`); concluídos embaixo
  (`concluidoEm desc`). Empty state: "Nenhum testemunho ainda".

### Cores (tokens de `index.css`, claro/escuro)
| Elemento | Token |
|---|---|
| Fundo do card (cinza intermediário) | `--card` |
| Área expandida (mais escura) | `--surface` |
| Título | `--text` |
| Data e detalhes (cinza mais claro) | `--text-muted` |
| Excluir / vermelho | `--danger` |
| Botão "Dar Testemunho" | degradê `--brand-grad` |

### Componente reutilizável `components/ui/ConfirmDialog.jsx`
Card de aviso (título, mensagem, botão de confirmação destrutivo + cancelar). Usado
para excluir pedido nesta fatia; reaproveitado na Fatia 2 (excluir célula/membro).

## 7. Navegação (drawer)

**Fonte única:** a função `linksPorPapel` (já existente) passa a alimentar tanto o
drawer quanto a TopBar. Ícones novos: **Pedidos** = `HandHeart`, **Testemunhos** =
`Sparkles` (lucide).

Itens por papel nesta fatia:
- **MEMBRO:** Início · Calendário · Pedidos
- **LIDER:** Início · Calendário · Pedidos · Minha Célula · Testemunhos
- **ADMIN:** Células *(inalterado)*

**Mobile (`< md`):** TopBar fixa com `[ ☰ | Logo→Início | AvatarMenu ]`.
- ☰ abre `components/NavDrawer.jsx` — drawer lateral (desliza da esquerda, overlay
  escurecido, fecha ao tocar fora ou selecionar item; framer-motion, padrão do
  `Sheet`). Itens com ícone + rótulo, ativo destacado.
- Conta (Perfil/Tema/Sair) segue no **AvatarMenu** à direita — não misturar com navegação.
- **BottomNav removido** no mobile (aposentar `BottomNav.jsx`).

**Desktop (`≥ md`):** TopBar horizontal com todos os itens inline (ícone + rótulo),
sem ☰. Logo clicável → Início.

**Refatorações:** `TopBar.jsx` (zonas + logo clicável + ☰ no mobile), novo
`NavDrawer.jsx`, remoção do `BottomNav.jsx`.

## 8. Regras de negócio e segurança

- **Privacidade dos pedidos:** toda rota de pedido filtra por `userId = req.usuario.id`.
  Nunca expor pedido de outro usuário (retornar 404 para id de terceiro).
- **Escopo dos testemunhos:** o líder só lista/conclui testemunhos da célula que
  lidera (`liderId = req.usuario.id`). Concluir testemunho de outra célula → 403/404.
- **Idempotência:** dar testemunho duas vezes no mesmo pedido não cria duplicata
  (garantido também pelo `@unique` em `pedidoId`).
- **Admin:** fora do escopo desta fatia; a tela de Testemunhos é do líder.

## 9. Tratamento de erros

Padrão atual: `400` (validação, com `detalhes` do zod), `403` (sem permissão),
`404` (recurso inexistente ou fora de escopo do usuário). Respostas de erro no
formato `{ erro, detalhes? }`.

## 10. Testes

- **`apps/api/src/routes/pedidos.test.js`:** criar; listar apenas os próprios
  (privacidade — outro usuário não acessa); editar/excluir só o autor; `POST /pedidos
  {testemunhar:true}` cria testemunho + marca `ATENDIDO`; `POST /pedidos/:id/testemunho`
  idempotente; testemunho sobrevive a `DELETE` do pedido (`pedidoId` vira null, título mantido).
- **`apps/api/src/routes/testemunhos.test.js`:** líder vê só os da própria célula
  (inclui os próprios); `concluir` marca `CONCLUIDO` + `concluidoEm`; não-líder → 403;
  líder de outra célula não conclui.
- **Frontend:** teste de componente do `PedidoCard` (expandir/recolher; contadores do form).
- **Meta:** manter suíte verde (hoje 161 API / 7 web).

## 11. Fora de escopo / futuro

- Citação bíblica rotativa (hoje fixa).
- Acesso do admin a testemunhos.
- Notificações (ex.: avisar líder de novo testemunho).
- Fatias 2 (Membros) e 3 (Vidas).
