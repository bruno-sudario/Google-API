/** Opções dos filtros de resultados (compartilhadas entre formulário e painel). */

export interface OpcaoFiltro {
  valor: number;
  rotulo: string;
}

export const OPCOES_NOTA: OpcaoFiltro[] = [
  { valor: 0, rotulo: 'Qualquer nota' },
  { valor: 3, rotulo: '3,0+' },
  { valor: 3.5, rotulo: '3,5+' },
  { valor: 4, rotulo: '4,0+' },
  { valor: 4.5, rotulo: '4,5+' },
];

export const OPCOES_AVALIACOES: OpcaoFiltro[] = [
  { valor: 0, rotulo: 'Qualquer' },
  { valor: 1, rotulo: '1+' },
  { valor: 5, rotulo: '5+' },
  { valor: 10, rotulo: '10+' },
  { valor: 25, rotulo: '25+' },
  { valor: 50, rotulo: '50+' },
];

/** Classe Tailwind reutilizada pelos <select> de filtro. */
export const CLASSE_SELECT_FILTRO =
  'rounded-lg border border-slate-300 bg-white py-1.5 pl-2 pr-7 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900';
