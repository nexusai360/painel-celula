// Cidades do Brasil.
//
// Fonte primária: API pública do IBGE (todos os ~5.570 municípios).
// A lista completa é carregada UMA vez (lazy), processada em opções únicas por
// nome (agregando as UFs na descrição) e cacheada em localStorage por 30 dias.
// Se a rede falhar / estiver offline, cai na lista CURADA abaixo (foco GO + capitais),
// para que o campo nunca fique vazio. O Combobox mantém `allowCustom`, então o
// usuário sempre pode digitar uma cidade fora da lista.

// Lista curada de fallback (offline / falha do IBGE).
export const CIDADES = [
  // Goiás (municípios mais populosos/comuns)
  'Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia',
  'Águas Lindas de Goiás', 'Valparaíso de Goiás', 'Trindade', 'Formosa',
  'Novo Gama', 'Itumbiara', 'Senador Canedo', 'Catalão', 'Jataí', 'Planaltina',
  'Caldas Novas', 'Goianésia', 'Uruaçu', 'Ceres', 'Inhumas', 'Cidade Ocidental',
  'Santo Antônio do Descoberto', 'Mineiros', 'Cristalina', 'Morrinhos', 'Nerópolis',
  'Goiatuba', 'Jaraguá', 'Porangatu', 'Quirinópolis', 'Iporá', 'Bela Vista de Goiás',
  'Pires do Rio', 'Goianira', 'Aparecida do Rio Doce', 'Palmeiras de Goiás',
  'São Luís de Montes Belos', 'Itaberaí', 'Cocalzinho de Goiás', 'Padre Bernardo',
  'Alexânia', 'Silvânia', 'Piracanjuba', 'Rubiataba', 'Itapaci', 'Niquelândia',
  'Minaçu', 'Campos Belos', 'Posse', 'São Miguel do Araguaia', 'Aragarças',
  'Barro Alto', 'Hidrolândia', 'Bom Jesus de Goiás', 'Acreúna', 'Santa Helena de Goiás',
  'Edéia', 'Vianópolis', 'Orizona', 'Ipameri', 'Nova Veneza', 'Terezópolis de Goiás',
  'Abadiânia', 'Corumbá de Goiás', 'Pirenópolis', 'Goiás', 'Uruana', 'Carmo do Rio Verde',
  'Mozarlândia', 'Crixás', 'Uirapuru', 'Mara Rosa', 'Alto Paraíso de Goiás', 'Cavalcante',
  // Capitais e grandes cidades do Brasil
  'Brasília', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador',
  'Fortaleza', 'Curitiba', 'Recife', 'Porto Alegre', 'Manaus', 'Belém',
  'Campo Grande', 'Cuiabá', 'Palmas', 'Uberlândia', 'Uberaba', 'Ribeirão Preto',
  'Campinas', 'Guarulhos', 'Sorocaba', 'Londrina', 'Maringá', 'Joinville',
  'Florianópolis', 'Vitória', 'Natal', 'João Pessoa', 'Maceió', 'Aracaju',
  'Teresina', 'São Luís', 'Macapá', 'Boa Vista', 'Rio Branco', 'Porto Velho',
  'Santos', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'São José dos Campos',
  'Contagem', 'Betim', 'Juiz de Fora', 'Montes Claros', 'Feira de Santana',
  'Niterói', 'Duque de Caxias', 'Nova Iguaçu', 'São Gonçalo', 'Caxias do Sul',
  'Pelotas', 'Ponta Grossa', 'Cascavel', 'Foz do Iguaçu', 'Blumenau', 'Caucaia',
  'Imperatriz', 'Petrolina', 'Vitória da Conquista', 'Camaçari',
]

// Opções da lista curada, no mesmo formato do Combobox ({value,label}).
export const CIDADES_OPCOES_FALLBACK = CIDADES.map((c) => ({ value: c, label: c }))

const CACHE_KEY = 'painel-celula:cidades-br:v1'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias
const IBGE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome'

let memoria = null // cache em memória (por sessão)
let promessaEmVoo = null // dedupe de requisições concorrentes

// Transforma a resposta do IBGE em opções únicas por NOME, agregando as UFs.
// Nomes de municípios se repetem entre estados (~250 casos); mantemos um único
// item por nome (value = nome, casa com o autofill do ViaCEP) e mostramos as
// UFs na descrição para desambiguar.
function processarMunicipios(municipios) {
  const porNome = new Map()
  for (const m of municipios) {
    const nome = m?.nome
    if (!nome) continue
    const uf = m?.microrregiao?.mesorregiao?.UF?.sigla || ''
    if (!porNome.has(nome)) porNome.set(nome, new Set())
    if (uf) porNome.get(nome).add(uf)
  }
  return [...porNome.entries()]
    .map(([nome, ufs]) => ({
      value: nome,
      label: nome,
      description: [...ufs].sort().join(', ') || undefined,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}

function lerCache() {
  try {
    const bruto = localStorage.getItem(CACHE_KEY)
    if (!bruto) return null
    const { ts, opcoes } = JSON.parse(bruto)
    if (!Array.isArray(opcoes) || !opcoes.length) return null
    if (Date.now() - ts > CACHE_TTL_MS) return null
    return opcoes
  } catch {
    return null
  }
}

function gravarCache(opcoes) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), opcoes }))
  } catch {
    /* localStorage cheio/indisponível — segue sem cache */
  }
}

/**
 * Carrega as cidades do Brasil (todas, via IBGE) como opções do Combobox.
 * Ordem: memória → localStorage → IBGE. Em falha, retorna a lista curada.
 * Nunca lança — sempre resolve com um array utilizável.
 */
export async function carregarCidadesBrasil() {
  if (memoria) return memoria
  const doCache = lerCache()
  if (doCache) {
    memoria = doCache
    return memoria
  }
  if (promessaEmVoo) return promessaEmVoo

  promessaEmVoo = (async () => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    try {
      const r = await fetch(IBGE_URL, { signal: ctrl.signal })
      if (!r.ok) throw new Error(`IBGE ${r.status}`)
      const dados = await r.json()
      const opcoes = processarMunicipios(dados)
      if (!opcoes.length) throw new Error('IBGE vazio')
      memoria = opcoes
      gravarCache(opcoes)
      return opcoes
    } catch {
      // Offline / bloqueado / timeout → fallback curado (não cacheia).
      memoria = null
      return CIDADES_OPCOES_FALLBACK
    } finally {
      clearTimeout(timer)
      promessaEmVoo = null
    }
  })()

  return promessaEmVoo
}

function normalizar(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export function filtrarCidades(q) {
  const s = normalizar(q)
  if (!s) return CIDADES
  return CIDADES.filter((c) => normalizar(c).includes(s))
}
