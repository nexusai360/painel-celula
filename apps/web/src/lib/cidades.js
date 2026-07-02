// Lista curada de municípios comuns (foco em GO + capitais/grandes BR).
// Combobox permite valor livre (allowCustom) quando a cidade não está aqui.
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
  'Anápolis', 'Imperatriz', 'Petrolina', 'Vitória da Conquista', 'Camaçari',
]

function normalizar(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export function filtrarCidades(q) {
  const s = normalizar(q)
  if (!s) return CIDADES
  return CIDADES.filter((c) => normalizar(c).includes(s))
}
