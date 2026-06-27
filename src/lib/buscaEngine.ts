/**
 * buscaEngine.ts — Núcleo de busca de fornecedores via Google Places API (New).
 *
 * Princípios (não alterar o contrato público):
 *  1. Whitelist > Blacklist: lead só vira APROVADO se provar pertencer ao
 *     segmento (tipo OU palavra obrigatória). Palavra bloqueada → REVISAR.
 *  2. Descoberta centrada em busca por TEXTO (searchByText): os segmentos-alvo
 *     (marmorarias, vidraçarias, gesso, móveis planejados) NÃO têm um Place Type
 *     dedicado na API — a própria consulta de texto é o filtro. searchNearby
 *     (filtro de tipo no servidor) só é usado quando há tipo primário VÁLIDO.
 *  3. Grade adaptativa (QuadTree): subdivide apenas a célula saturada (20),
 *     reaproveitada também para lotear a busca por texto (retângulo por célula).
 *  4. Duas fases: descoberta com campos baratos; enriquecimento só nos aprovados.
 *  5. Rate-limit em 3 camadas: menos chamadas (QuadTree) + pool de 4 + backoff.
 */

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface CategoriaConfig {
  id: string;
  rotulo: string;
  /** Tipos primários VÁLIDOS do Places para searchNearby + prova de tipo. */
  tiposPrimarios: string[];
  /** Whitelist: nome precisa conter ao menos uma destas (normalizado). */
  palavrasObrigatorias: string[];
  /** Rede de segurança: presença joga o lead para REVISAR (nunca descarta). */
  palavrasBloqueadas: string[];
  /**
   * Consultas de texto que dirigem a descoberta. A 1ª roda em TODA célula da
   * QuadTree (lotear); as demais rodam uma vez na área inteira (mais recall).
   */
  consultasTexto: string[];
}

export interface AreaBusca {
  centro: { lat: number; lng: number };
  raioKm: number;
}

export interface Fornecedor {
  placeId: string;
  nome: string;
  endereco: string;
  lat: number;
  lng: number;
  tipoPrimario?: string;
  tipos: string[];
  status: 'APROVADO' | 'REVISAR' | 'DESCARTADO';
  motivo?: string;
  telefone?: string;
  whatsapp?: string;
  site?: string;
  nota?: number;
  totalAvaliacoes?: number;
  mapsUrl?: string;
  /** Categoria de origem (preenchida pelo motor). */
  categoria?: string;
}

export interface ResultadoBusca {
  aprovados: Fornecedor[];
  revisar: Fornecedor[];
  descartados: Fornecedor[];
  resumo: {
    bruto: number;
    aprovados: number;
    revisar: number;
    descartados: number;
  };
}

type OnProgresso = (msg: string, pct: number) => void;

/** De onde o lead veio na descoberta (afeta a classificação). */
type Origem = 'texto' | 'proximidade';

// ---------------------------------------------------------------------------
// Configuração das categorias
//
// IMPORTANTE: `tiposPrimarios` vazio em todas — os tipos dedicados (marmoraria,
// vidraçaria, etc.) NÃO existem na Table A do Google e os tipos reais são
// genéricos demais (manufacturer / general_contractor / ausente). A descoberta
// é feita por `consultasTexto`. O caminho searchNearby fica disponível para
// categorias futuras que tenham um tipo primário preciso e válido.
// ---------------------------------------------------------------------------

export const CATEGORIAS: CategoriaConfig[] = [
  {
    id: 'moveis',
    rotulo: 'Móveis Planejados',
    tiposPrimarios: [],
    palavrasObrigatorias: [
      'moveis',
      'planejados',
      'marcenaria',
      'marceneiro',
      'sob medida',
      'movelaria',
    ],
    palavrasBloqueadas: ['usados', 'antiguidades', 'aluguel de moveis', 'colchao', 'colchoes'],
    consultasTexto: ['móveis planejados', 'marcenaria', 'móveis sob medida'],
  },
  {
    id: 'marmorarias',
    rotulo: 'Marmorarias',
    tiposPrimarios: [],
    palavrasObrigatorias: [
      'marmoraria',
      'marmore',
      'granito',
      'pedras',
      'quartzo',
    ],
    palavrasBloqueadas: ['cemiterio', 'funeraria', 'lapide', 'tumulo'],
    consultasTexto: ['marmoraria', 'mármore e granito', 'granito'],
  },
  {
    id: 'vidracarias',
    rotulo: 'Vidraçarias',
    tiposPrimarios: [],
    palavrasObrigatorias: [
      'vidracaria',
      'vidro',
      'vidros',
      'vidro temperado',
      'temperado',
      'box',
      'espelho',
      'espelhos',
      'glass',
    ],
    palavrasBloqueadas: ['oculos', 'otica', 'automotivo', 'parabrisa'],
    consultasTexto: ['vidraçaria', 'box para banheiro', 'espelhos sob medida'],
  },
  {
    id: 'gesso',
    rotulo: 'Gesso / Drywall',
    tiposPrimarios: [],
    palavrasObrigatorias: ['gesso', 'drywall', 'gesseiro', 'forro', 'sancas', 'steel frame'],
    palavrasBloqueadas: ['ortopedico', 'medico', 'hospital'],
    consultasTexto: ['gesso', 'drywall', 'forro de gesso'],
  },
];

// ---------------------------------------------------------------------------
// Máscaras de campo (duas fases — controle de custo)
// ---------------------------------------------------------------------------

/** Fase de descoberta: campos baratos (tier Pro). */
const CAMPOS_DESCOBERTA = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'types',
  'primaryType',
  'googleMapsURI',
];

/** Fase de enriquecimento: campos caros (tier Enterprise) — só nos aprovados. */
const CAMPOS_ENRIQUECIMENTO = [
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteURI',
  'rating',
  'userRatingCount',
];

// ---------------------------------------------------------------------------
// Constantes da grade adaptativa / proteção de custo
// ---------------------------------------------------------------------------

const RAIO_MAX_M = 50_000; // limite do searchNearby
const RAIO_MIN_M = 50; // não subdividir abaixo disso
const PROF_MAX = 6; // teto de profundidade da recursão
const SATURACAO = 20; // 20 resultados = célula lotada → subdividir
const TETO_CHAMADAS = 600; // guarda de custo: máx. de chamadas de descoberta
const FATOR_FILHO = 0.6; // raio do filho (sobreposição evita buracos)
const LIMITE_POOL = 4; // concorrência máxima

// ---------------------------------------------------------------------------
// Utilidades genéricas
// ---------------------------------------------------------------------------

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Normaliza: minúsculas, remove acentos (NFD), colapsa espaços. */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Backoff exponencial: só espera quando há erro (caminho feliz é imediato). */
async function comBackoff<T>(fn: () => Promise<T>, tentativas = 5): Promise<T> {
  let espera = 500;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === tentativas - 1) throw e;
      await dormir(espera + Math.random() * 250);
      espera *= 2;
    }
  }
  // inalcançável, mas satisfaz o compilador
  throw new Error('comBackoff: esgotou as tentativas');
}

/**
 * Pool de N workers sobre uma fila MUTÁVEL. O processador pode empurrar novos
 * itens na fila (usado pela QuadTree para subdividir células saturadas).
 */
async function poolFila<T>(
  fila: T[],
  processar: (item: T, enfileirar: (novo: T) => void) => Promise<void>,
  limite = LIMITE_POOL,
): Promise<void> {
  let ativos = 0;
  const enfileirar = (novo: T) => fila.push(novo);

  return new Promise<void>((resolve, reject) => {
    let finalizado = false;

    const tentarFinalizar = () => {
      if (!finalizado && fila.length === 0 && ativos === 0) {
        finalizado = true;
        resolve();
      }
    };

    const bombear = () => {
      while (ativos < limite && fila.length > 0) {
        const item = fila.shift()!;
        ativos++;
        processar(item, enfileirar)
          .catch((e) => {
            if (!finalizado) {
              finalizado = true;
              reject(e);
            }
          })
          .finally(() => {
            ativos--;
            if (!finalizado) {
              bombear();
              tentarFinalizar();
            }
          });
      }
      tentarFinalizar();
    };

    bombear();
  });
}

// ---------------------------------------------------------------------------
// Geometria
// ---------------------------------------------------------------------------

interface Celula {
  lat: number;
  lng: number;
  raioM: number;
  profundidade: number;
}

/** Subdivide uma célula circular em 4 filhas que se sobrepõem nos cantos. */
function subdividir(c: Celula): Celula[] {
  const latRad = (c.lat * Math.PI) / 180;
  const offM = c.raioM / 2;
  const dLat = offM / 111_320;
  const dLng = offM / (111_320 * Math.cos(latRad) || 1);
  const raioFilho = c.raioM * FATOR_FILHO;
  const prof = c.profundidade + 1;
  return [
    { lat: c.lat + dLat, lng: c.lng - dLng, raioM: raioFilho, profundidade: prof },
    { lat: c.lat + dLat, lng: c.lng + dLng, raioM: raioFilho, profundidade: prof },
    { lat: c.lat - dLat, lng: c.lng - dLng, raioM: raioFilho, profundidade: prof },
    { lat: c.lat - dLat, lng: c.lng + dLng, raioM: raioFilho, profundidade: prof },
  ];
}

/** Caixa delimitadora (bounds) que circunscreve um círculo — para searchByText. */
function circuloParaBounds(
  lat: number,
  lng: number,
  raioM: number,
): google.maps.LatLngBoundsLiteral {
  const latRad = (lat * Math.PI) / 180;
  const dLat = raioM / 111_320;
  const dLng = raioM / (111_320 * Math.cos(latRad) || 1);
  return {
    north: lat + dLat,
    south: lat - dLat,
    east: lng + dLng,
    west: lng - dLng,
  };
}

/** Constrói a(s) célula(s) raiz a partir da área (respeita o limite de 50 km). */
function celulasRaiz(area: AreaBusca): Celula[] {
  const raioM = area.raioKm * 1000;
  const base: Celula = {
    lat: area.centro.lat,
    lng: area.centro.lng,
    raioM,
    profundidade: 0,
  };
  if (raioM <= RAIO_MAX_M) return [base];
  // Área maior que o limite do searchNearby: começa já subdividida.
  return subdividir(base);
}

// ---------------------------------------------------------------------------
// Classificação (whitelist > blacklist)
// ---------------------------------------------------------------------------

interface Classificacao {
  status: Fornecedor['status'];
  motivo: string;
}

function classificar(
  p: google.maps.places.Place,
  cat: CategoriaConfig,
  origem: Origem,
): Classificacao {
  const tipos = p.types ?? [];
  const nome = normalizar(p.displayName ?? '');

  const provaTipo =
    (p.primaryType ? cat.tiposPrimarios.includes(p.primaryType) : false) ||
    tipos.some((t) => cat.tiposPrimarios.includes(t));
  const provaPalavra = cat.palavrasObrigatorias.some((w) =>
    nome.includes(normalizar(w)),
  );
  const bloqueado = cat.palavrasBloqueadas.some((w) =>
    nome.includes(normalizar(w)),
  );

  if (!provaTipo && !provaPalavra) {
    // Veio de uma consulta de texto direcionada: a query já é evidência, então
    // mandamos para revisão humana em vez de descartar cegamente.
    if (origem === 'texto') {
      return {
        status: 'REVISAR',
        motivo: 'Veio da busca por texto, sem palavra-chave no nome — verificar',
      };
    }
    return {
      status: 'DESCARTADO',
      motivo: 'Não comprovou pertencer ao segmento',
    };
  }
  if (bloqueado) {
    return {
      status: 'REVISAR',
      motivo: 'Palavra bloqueada detectada — verificar manualmente',
    };
  }
  return {
    status: 'APROVADO',
    motivo: provaTipo ? 'Tipo confirmado' : 'Palavra-chave confirmada',
  };
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------

/** Deriva link wa.me a partir do telefone (preferir o internacional). */
function derivarWhatsapp(
  internacional?: string | null,
  nacional?: string | null,
): string | undefined {
  const tel = internacional || nacional;
  if (!tel) return undefined;
  let d = tel.replace(/\D/g, '');
  if (!d.startsWith('55')) d = '55' + d;
  return d.length >= 12 ? `https://wa.me/${d}` : undefined;
}

// ---------------------------------------------------------------------------
// Mapeamento Place -> Fornecedor
// ---------------------------------------------------------------------------

function mapearDescoberta(
  p: google.maps.places.Place,
  cat: CategoriaConfig,
  origem: Origem,
): Fornecedor {
  const { status, motivo } = classificar(p, cat, origem);
  return {
    placeId: p.id,
    nome: p.displayName ?? '(sem nome)',
    endereco: p.formattedAddress ?? '',
    lat: p.location?.lat() ?? 0,
    lng: p.location?.lng() ?? 0,
    tipoPrimario: p.primaryType ?? undefined,
    tipos: p.types ?? [],
    status,
    motivo,
    mapsUrl: p.googleMapsURI ?? undefined,
    categoria: cat.rotulo,
  };
}

// ---------------------------------------------------------------------------
// Busca de UMA categoria
// ---------------------------------------------------------------------------

export async function buscarFornecedores(
  catId: string,
  area: AreaBusca,
  onProgresso?: OnProgresso,
  incluirRevisar = false,
): Promise<ResultadoBusca> {
  const emit = (msg: string, pct: number) => onProgresso?.(msg, pct);

  emit('Carregando biblioteca de lugares…', 0);
  const { Place } = await google.maps.importLibrary('places');

  const cat = CATEGORIAS.find((c) => c.id === catId);
  if (!cat) throw new Error(`Categoria desconhecida: ${catId}`);

  // ---- Fase 1: descoberta (campos baratos) ----
  const vistos = new Map<string, google.maps.places.Place>();
  const origens = new Map<string, Origem>();
  let chamadas = 0;
  let truncado = false;

  const podeChamar = () => chamadas < TETO_CHAMADAS;
  const registrar = (places: google.maps.places.Place[], origem: Origem) => {
    for (const p of places) {
      if (!vistos.has(p.id)) {
        vistos.set(p.id, p);
        origens.set(p.id, origem);
      }
    }
  };
  const progressoDescoberta = () =>
    emit(
      `Escaneando ${cat.rotulo}… (${vistos.size} encontrados)`,
      Math.min(55, 5 + Math.round((chamadas / TETO_CHAMADAS) * 50)),
    );

  // QuadTree: cada célula roda a consulta primária (e searchNearby, se houver
  // tipo válido); subdivide apenas a célula saturada.
  const queryPrimaria = cat.consultasTexto[0];
  const fila = celulasRaiz(area);

  await poolFila<Celula>(fila, async (cel, enfileirar) => {
    if (!podeChamar()) {
      truncado = true;
      return;
    }
    const raioM = Math.min(cel.raioM, RAIO_MAX_M);
    let maxResultados = 0;

    // searchNearby só quando há tipo primário válido (hoje: nunca).
    if (cat.tiposPrimarios.length > 0 && podeChamar()) {
      chamadas++;
      try {
        const { places } = await comBackoff(() =>
          Place.searchNearby({
            fields: CAMPOS_DESCOBERTA,
            locationRestriction: {
              center: { lat: cel.lat, lng: cel.lng },
              radius: raioM,
            },
            includedPrimaryTypes: cat.tiposPrimarios,
            maxResultCount: SATURACAO,
          }),
        );
        registrar(places, 'proximidade');
        maxResultados = Math.max(maxResultados, places.length);
      } catch {
        // melhor-esforço por célula
      }
    }

    // Consulta de texto primária, confinada ao retângulo da célula.
    if (queryPrimaria && podeChamar()) {
      chamadas++;
      try {
        const { places } = await comBackoff(() =>
          Place.searchByText({
            fields: CAMPOS_DESCOBERTA,
            textQuery: queryPrimaria,
            locationRestriction: circuloParaBounds(cel.lat, cel.lng, raioM),
            maxResultCount: SATURACAO,
            language: 'pt-BR',
            region: 'br',
          }),
        );
        registrar(places, 'texto');
        maxResultados = Math.max(maxResultados, places.length);
      } catch {
        // melhor-esforço por célula
      }
    }

    progressoDescoberta();

    // Saturação → subdividir apenas esta célula.
    if (
      maxResultados >= SATURACAO &&
      cel.raioM / 2 >= RAIO_MIN_M &&
      cel.profundidade < PROF_MAX &&
      podeChamar()
    ) {
      for (const filho of subdividir(cel)) enfileirar(filho);
    }
  });

  // Consultas alternativas: uma passada na área inteira (mais recall, sem lotear).
  const alternativas = cat.consultasTexto.slice(1);
  const raioRaiz = Math.min(area.raioKm * 1000, RAIO_MAX_M);
  for (const q of alternativas) {
    if (!podeChamar()) {
      truncado = true;
      break;
    }
    chamadas++;
    try {
      const { places } = await comBackoff(() =>
        Place.searchByText({
          fields: CAMPOS_DESCOBERTA,
          textQuery: q,
          locationBias: { center: area.centro, radius: raioRaiz },
          maxResultCount: SATURACAO,
          language: 'pt-BR',
          region: 'br',
        }),
      );
      registrar(places, 'texto');
    } catch {
      // melhor-esforço por consulta
    }
  }
  if (truncado) {
    emit(
      `Cobertura parcial de ${cat.rotulo} (limite de chamadas atingido)`,
      58,
    );
  }

  // ---- Classificação ----
  const aprovados: Fornecedor[] = [];
  const revisar: Fornecedor[] = [];
  const descartados: Fornecedor[] = [];
  const placePorId = new Map<string, google.maps.places.Place>();

  for (const p of vistos.values()) {
    const f = mapearDescoberta(p, cat, origens.get(p.id) ?? 'texto');
    placePorId.set(f.placeId, p);
    if (f.status === 'APROVADO') aprovados.push(f);
    else if (f.status === 'REVISAR') revisar.push(f);
    else descartados.push(f);
  }

  // ---- Fase 2: enriquecimento (campos caros) — só aprovados (+ revisar opc.) ----
  const aEnriquecer = incluirRevisar ? [...aprovados, ...revisar] : aprovados;
  let enriquecidos = 0;
  const total = aEnriquecer.length || 1;

  await poolFila<Fornecedor>([...aEnriquecer], async (f) => {
    const p = placePorId.get(f.placeId);
    if (!p) return;
    try {
      await comBackoff(() => p.fetchFields({ fields: CAMPOS_ENRIQUECIMENTO }));
      f.telefone = p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? undefined;
      f.whatsapp = derivarWhatsapp(p.internationalPhoneNumber, p.nationalPhoneNumber);
      f.site = p.websiteURI ?? undefined;
      f.nota = p.rating ?? undefined;
      f.totalAvaliacoes = p.userRatingCount ?? undefined;
    } catch {
      // enriquecimento é melhor-esforço por lead
    } finally {
      enriquecidos++;
      emit(
        `Coletando contatos de ${cat.rotulo}… (${enriquecidos}/${total})`,
        60 + Math.round((enriquecidos / total) * 35),
      );
    }
  });

  // ---- Ordenação: por nota desc., depois nº de avaliações desc. ----
  const ordenar = (a: Fornecedor, b: Fornecedor) =>
    (b.nota ?? 0) - (a.nota ?? 0) ||
    (b.totalAvaliacoes ?? 0) - (a.totalAvaliacoes ?? 0);
  aprovados.sort(ordenar);
  revisar.sort(ordenar);

  emit('Concluído', 100);

  return {
    aprovados,
    revisar,
    descartados,
    resumo: {
      bruto: vistos.size,
      aprovados: aprovados.length,
      revisar: revisar.length,
      descartados: descartados.length,
    },
  };
}
