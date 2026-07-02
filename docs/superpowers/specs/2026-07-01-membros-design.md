# Fatia 2 — Membros (gestão de membros da célula)

**Data:** 2026-07-01
**Status:** aprovado no brainstorm, pronto para plano de implementação

## 1. Contexto e objetivo

Segunda fatia do bloco social do Hineni (após a Fatia 1 — Pedidos + Testemunhos).
Entrega a **gestão de membros de uma célula**: uma lista de membros acessível a
Admin e Líder, com o Admin podendo editar e inativar/reativar membros. Reorganiza a
tela da célula em abas (Informações | Membros) e troca o `window.confirm` de exclusão
de célula por um card de aviso.

O campo `User.ativo` **já existe** e o **login já bloqueia usuário inativo** (`403`
em `routes/auth.js`). Esta fatia adiciona a rota de listagem de membros, a rota de
edição/inativação pelo admin, e a UI.

## 2. Escopo

**Entra nesta fatia:**
- Backend: `GET /celulas/:id/membros` e `PUT /usuarios/:id`.
- Frontend: abas Informações | Membros em `CelulaDetalhe`; lista de membros; modal de
  edição; inativar/reativar; item de menu "Membros" para o líder.
- Cards de aviso (`ConfirmDialog`) para excluir célula e inativar membro.

**NÃO entra (fatia seguinte):**
- Fatia 3 — Vidas (painel de fotos flutuantes dos membros).

## 3. Decisões de produto (do brainstorm)

1. **Admin edita:** Nome, WhatsApp e E-mail de um membro (papel e célula NÃO mudam por aqui).
2. **Inativação minimalista:** o inativo some **só da lista de membros do líder**; continua no painel do Admin (escurecido, com "Ativar"). Login já bloqueado. Dados históricos (presença/frequência passada) preservados.
3. **Abas reusadas:** `CelulaDetalhe` ganha abas Informações | Membros para admin e líder (query param). O item de menu "Membros" do líder abre a célula dele já na aba Membros.
4. **Líder tem dois itens de menu:** "Minha Célula" (aba Informações) e "Membros" (aba Membros) — ambos apontam para `CelulaDetalhe`.
5. **Soft-delete:** "Excluir" um membro apenas **inativa** (`ativo=false`); não há delete real. "Ativar" reativa.
6. **Proteções:** admin **não pode inativar a si mesmo** (`400`); **não pode inativar o líder atual da célula** (`409` — defina outro líder antes).
7. **Ordenação da lista:** ativos em cima, inativos embaixo (ambos por nome).
8. **Edição em modal** (não tela nova).
9. **Reativar é ação direta** (sem card de aviso); só inativar/excluir pede confirmação.

## 4. Backend

### 4.1 `GET /celulas/:id/membros` — `requireRole('LIDER')`
Arquivo: `apps/api/src/routes/celulas.js` (nova rota, junto às demais de célula).
- **Escopo:** `podeGerenciarCelula(request.usuario, celula)` (admin sempre; líder só a
  própria célula). Célula inexistente → `404`; sem escopo → `403`.
- **Filtro por papel do solicitante:** se o solicitante for **LIDER** (não admin),
  retorna apenas `ativo: true`; se **ADMIN**, retorna **todos** (ativos e inativos).
- Membros = `prisma.user.findMany({ where: { celulaId: id, ...(ativoFilter) }, orderBy: { nome: 'asc' }, select: { id, nome, email, avatar, papel, ativo } })`.
  (Usa `select` explícito com `avatar` — a lista mostra a foto; NÃO usar `publicoLeve`, que remove avatar.)
- Resposta: `{ membros: [{ id, nome, email, avatar, papel, ativo }] }`.

### 4.2 `PUT /usuarios/:id` — `requireRole('ADMIN')`
Arquivo: `apps/api/src/routes/usuarios.js`.
- Body validado por `usuarioAdminUpdateSchema` (novo, em `packages/shared`): campos
  todos opcionais — `nome` (1–120), `email` (formato válido), `whatsapp` (string; será
  normalizada), `ativo` (boolean).
- **E-mail único:** se `email` mudou e já existe em outro usuário → `409` `{ erro: 'E-mail já em uso' }`.
- **WhatsApp:** normalizar via `normalizarWhatsapp` (shared); se inválido → `400`; string vazia/null → `null`.
- **Proteções de `ativo`:**
  - Se `ativo === false` e `id === request.usuario.id` → `400` `{ erro: 'Você não pode inativar a si mesmo' }`.
  - Se `ativo === false` e o usuário-alvo é o **líder atual** de alguma célula
    (`prisma.celula.findFirst({ where: { liderId: id } })` existe) → `409`
    `{ erro: 'Defina outro líder antes de inativar este membro' }`.
- Usuário-alvo inexistente → `404`.
- Atualiza os campos presentes; retorna `{ usuario: publico(user) }`.

### 4.3 Schema compartilhado (`packages/shared`)
```js
// usuario.schemas.js
const usuarioAdminUpdateSchema = z.object({
  nome: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email('E-mail inválido').optional(),
  whatsapp: z.string().optional(),
  ativo: z.boolean().optional()
})
```

### 4.4 Não muda
- Login (`auth.js`) já bloqueia inativo. `GET /usuarios` (busca para definir líder)
  permanece como está. `DELETE /celulas/:id` (rebaixa ex-líder) permanece.

## 5. Frontend

### 5.1 Abas em `CelulaDetalhe` (`apps/web/src/pages/CelulaDetalhe.jsx`)
- Duas abas **Informações | Membros** via `useSearchParams` (`?tab=membros`); default = `informacoes`.
- Abas inline (dois botões estilizados; sem componente genérico novo — YAGNI).
- **Informações:** move o conteúdo atual (cronograma, QR, encontros, frequência) para dentro da aba, sem alteração de lógica.
- **Membros:** renderiza a lista (5.2). Carrega via `apiListarMembros(id)`; usa o
  `liderId` já disponível na página para marcar o líder.

### 5.2 Lista e card de membro (`apps/web/src/components/MembroCard.jsx`)
- Card: `Avatar` (src=avatar, nome) + nome + selo **"Líder"** se `membro.id === celula.liderId` + e-mail (`text-text-muted`).
- **Ações (só quando o usuário logado é ADMIN):**
  - Ativo: ✏️ **Editar** (abre modal) + 🗑️ **Excluir** (`text-danger`) → `ConfirmDialog` → inativa.
  - Inativo: card com `opacity` reduzida, tag **"Inativo"** (`bg-danger/15 text-danger`), e botão **"Ativar"** (verde, `text-success`) → reativa direto.
- **Líder logado:** sem ações (só visualização); recebe apenas membros ativos do backend.
- Ordenação via função pura `agruparMembros` (5.4): ativos primeiro, inativos depois.
- Empty state: "Nenhum membro nesta célula."

### 5.3 Modal de edição (`apps/web/src/components/MembroEditModal.jsx`)
- Modal centralizado (mesmo estilo do `ConfirmDialog`), com `Input` de **Nome**,
  **WhatsApp**, **E-mail** (react-hook-form + zod `usuarioAdminUpdateSchema`).
- Salvar → `apiAtualizarMembro(id, dados)` → atualiza a lista e fecha; Cancelar fecha.
- Erros visíveis (ex.: `409` → "E-mail já em uso") em `text-danger`.

### 5.4 Lógica pura (`apps/web/src/lib/membros.js`)
```js
export function agruparMembros(lista) {
  const ativos = lista.filter((m) => m.ativo)
  const inativos = lista.filter((m) => !m.ativo)
  return { ativos, inativos }
}
```

### 5.5 Navegação (`apps/web/src/components/TopBar.jsx`)
- Em `linksPorPapel`, para `papel === 'LIDER'`, adicionar item **Membros** →
  `/app/celula/${celulaId}?tab=membros`, ícone `Contact` (lucide). Fica ao lado de "Minha Célula".

### 5.6 Card de aviso de exclusão de célula (`apps/web/src/pages/Celulas.jsx`)
- Substituir o `window.confirm` atual por `ConfirmDialog`: "Excluir esta célula? Os
  encontros e presenças serão removidos. Não dá para desfazer." → `apiExcluirCelula`.

### 5.7 API (`apps/web/src/lib/api.js`)
- `apiListarMembros(celulaId)` → `GET /celulas/:id/membros` → `data.membros`.
- `apiAtualizarMembro(userId, dados)` → `PUT /usuarios/:id` → `data.usuario`.

## 6. Regras de negócio e segurança
- Listagem de membros escopada por `podeGerenciarCelula`; líder nunca recebe inativos
  (filtro no backend, não confiar no front).
- Edição/inativação só ADMIN (`requireRole('ADMIN')`).
- Proteções de `ativo` (auto-inativação `400`; líder atual `409`) no backend.
- Sem vazamento de campos sensíveis: `GET membros` usa `select` explícito; `PUT` retorna via `publico()`.

## 7. Tratamento de erros
Padrão do projeto: `400` (validação/regra), `403` (sem permissão/escopo), `404`
(inexistente), `409` (e-mail duplicado / líder atual). Respostas `{ erro, detalhes? }`.
No front, estado `erro` com mensagem em português.

## 8. Testes
- **`apps/api/src/routes/celulas.test.js`:** `GET /celulas/:id/membros` — líder vê só
  ativos da própria célula; admin vê todos com `ativo`; líder de outra célula → 403;
  membro → 403; célula inexistente → 404.
- **`apps/api/src/routes/usuarios.test.js`:** `PUT /usuarios/:id` — admin edita
  nome/whatsapp/email; e-mail duplicado → 409; inativar e reativar; auto-inativação →
  400; inativar líder atual → 409; não-admin → 403; alvo inexistente → 404.
- **`packages/shared`:** teste de `usuarioAdminUpdateSchema` (email inválido, nome vazio).
- **Frontend:** teste de `agruparMembros` (ativos/inativos). Componentes por build.
- Meta: manter suítes verdes (API 175 → +novos, web 12 → +1, shared).

## 9. Fora de escopo / futuro
- Fatia 3 — Vidas.
- Mudança de papel/célula pela tela de membros (fora do escopo por decisão).
- Filtragem de inativos além da lista de membros (frequência/ranking) — decisão minimalista.
