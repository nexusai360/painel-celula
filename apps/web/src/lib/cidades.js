// Lista curada de municípios comuns (foco em GO + capitais/grandes BR).
// Combobox permite valor livre (allowCustom) quando a cidade não está aqui.
export const CIDADES = [
  'Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia',
  'Águas Lindas de Goiás', 'Valparaíso de Goiás', 'Trindade', 'Formosa',
  'Novo Gama', 'Itumbiara', 'Senador Canedo', 'Catalão', 'Jataí', 'Planaltina',
  'Caldas Novas', 'Goianésia', 'Uruaçu', 'Ceres', 'Inhumas', 'Cidade Ocidental',
  'Santo Antônio do Descoberto', 'Mineiros', 'Cristalina', 'Morrinhos', 'Nerópolis',
  'Brasília', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador',
  'Fortaleza', 'Curitiba', 'Recife', 'Porto Alegre', 'Manaus', 'Belém',
  'Campo Grande', 'Cuiabá', 'Palmas', 'Uberlândia', 'Uberaba', 'Ribeirão Preto',
  'Campinas', 'Guarulhos', 'Sorocaba', 'Londrina', 'Maringá', 'Joinville',
  'Florianópolis', 'Vitória', 'Natal', 'João Pessoa', 'Maceió', 'Aracaju',
  'Teresina', 'São Luís', 'Macapá', 'Boa Vista', 'Rio Branco', 'Porto Velho',
]

function normalizar(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export function filtrarCidades(q) {
  const s = normalizar(q)
  if (!s) return CIDADES
  return CIDADES.filter((c) => normalizar(c).includes(s))
}
