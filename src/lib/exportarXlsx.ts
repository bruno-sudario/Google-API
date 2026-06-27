import * as XLSX from 'xlsx';
import type { Fornecedor } from './buscaEngine';

interface LinhaPlanilha {
  Nome: string;
  Telefone: string;
  WhatsApp: string;
  Site: string;
  Nota: number | string;
  Avaliações: number | string;
  Endereço: string;
  Categoria: string;
  Maps: string;
}

function paraLinha(f: Fornecedor): LinhaPlanilha {
  return {
    Nome: f.nome,
    Telefone: f.telefone ?? '',
    WhatsApp: f.whatsapp ?? '',
    Site: f.site ?? '',
    Nota: f.nota ?? '',
    Avaliações: f.totalAvaliacoes ?? '',
    Endereço: f.endereco,
    Categoria: f.categoria ?? '',
    Maps: f.mapsUrl ?? '',
  };
}

const LARGURAS = [
  { wch: 32 }, // Nome
  { wch: 16 }, // Telefone
  { wch: 24 }, // WhatsApp
  { wch: 28 }, // Site
  { wch: 6 }, // Nota
  { wch: 11 }, // Avaliações
  { wch: 40 }, // Endereço
  { wch: 18 }, // Categoria
  { wch: 28 }, // Maps
];

/** Constrói o nome do arquivo: fornecedores_<categorias>_<data>.xlsx */
function nomeArquivo(categorias: string[]): string {
  const hoje = new Date();
  const data = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(
    hoje.getDate(),
  ).padStart(2, '0')}`;
  const cats = Array.from(new Set(categorias.filter(Boolean)))
    .map((c) =>
      c
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    )
    .join('_');
  return `fornecedores_${cats || 'geral'}_${data}.xlsx`;
}

/**
 * Gera e baixa a planilha. Inclui os aprovados e, se `incluirRevisar`,
 * também os "para revisar" numa aba separada.
 */
export function exportarXlsx(
  aprovados: Fornecedor[],
  revisar: Fornecedor[],
  incluirRevisar: boolean,
): void {
  const wb = XLSX.utils.book_new();

  const wsAprovados = XLSX.utils.json_to_sheet(aprovados.map(paraLinha));
  wsAprovados['!cols'] = LARGURAS;
  XLSX.utils.book_append_sheet(wb, wsAprovados, 'Aprovados');

  if (incluirRevisar && revisar.length > 0) {
    const wsRevisar = XLSX.utils.json_to_sheet(revisar.map(paraLinha));
    wsRevisar['!cols'] = LARGURAS;
    XLSX.utils.book_append_sheet(wb, wsRevisar, 'Para revisar');
  }

  const categorias = [...aprovados, ...(incluirRevisar ? revisar : [])]
    .map((f) => f.categoria ?? '')
    .filter(Boolean);

  XLSX.writeFile(wb, nomeArquivo(categorias));
}
