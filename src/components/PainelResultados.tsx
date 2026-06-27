import { useState } from 'react';
import { Download, SlidersHorizontal } from 'lucide-react';
import type { Fornecedor } from '../lib/buscaEngine';
import {
  OPCOES_NOTA,
  OPCOES_AVALIACOES,
  CLASSE_SELECT_FILTRO,
} from '../lib/filtros';
import TabelaFornecedores from './TabelaFornecedores';

type Aba = 'aprovados' | 'revisar' | 'descartados';

interface Props {
  aprovados: Fornecedor[];
  revisar: Fornecedor[];
  descartados: Fornecedor[];
  minNota: number;
  minAvaliacoes: number;
  onMinNotaChange: (v: number) => void;
  onMinAvaliacoesChange: (v: number) => void;
  onPromover: (placeId: string) => void;
  onRemover: (placeId: string) => void;
  onExportar: () => void;
}

export default function PainelResultados({
  aprovados,
  revisar,
  descartados,
  minNota,
  minAvaliacoes,
  onMinNotaChange,
  onMinAvaliacoesChange,
  onPromover,
  onRemover,
  onExportar,
}: Props) {
  const [aba, setAba] = useState<Aba>('aprovados');

  const filtroAtivo = minNota > 0 || minAvaliacoes > 0;

  const abas: { id: Aba; rotulo: string; n: number }[] = [
    { id: 'aprovados', rotulo: 'Aprovados', n: aprovados.length },
    { id: 'revisar', rotulo: 'Para revisar', n: revisar.length },
    { id: 'descartados', rotulo: 'Descartados', n: descartados.length },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Cabeçalho: resumo + exportar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          <strong className="text-emerald-700">{aprovados.length} aprovados</strong>
          {' · '}
          <strong className="text-amber-700">{revisar.length} para revisar</strong>
          {' · '}
          <strong className="text-slate-500">{descartados.length} descartados</strong>
          {filtroAtivo && (
            <span className="ml-1 text-xs text-slate-400">(após filtros)</span>
          )}
        </p>
        <button
          type="button"
          onClick={onExportar}
          disabled={aprovados.length === 0 && revisar.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} /> Exportar XLSX
        </button>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <SlidersHorizontal size={15} /> Filtros
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Pontuação mínima
            <select
              value={minNota}
              onChange={(e) => onMinNotaChange(Number(e.target.value))}
              className={CLASSE_SELECT_FILTRO}
            >
              {OPCOES_NOTA.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Avaliações mínimas
            <select
              value={minAvaliacoes}
              onChange={(e) => onMinAvaliacoesChange(Number(e.target.value))}
              className={CLASSE_SELECT_FILTRO}
            >
              {OPCOES_AVALIACOES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </label>
          {filtroAtivo && (
            <button
              type="button"
              onClick={() => {
                onMinNotaChange(0);
                onMinAvaliacoesChange(0);
              }}
              className="text-sm text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-slate-200 px-3 pt-3">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              aba === a.id
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {a.rotulo}{' '}
            <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              {a.n}
            </span>
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {aba === 'aprovados' && (
        <TabelaFornecedores
          lista={aprovados}
          acao="remover"
          onRemover={onRemover}
          mensagemVazia={
            filtroAtivo
              ? 'Nenhum aprovado atende aos filtros.'
              : 'Nenhum fornecedor aprovado ainda.'
          }
        />
      )}
      {aba === 'revisar' && (
        <TabelaFornecedores
          lista={revisar}
          acao="promover"
          onPromover={onPromover}
          mensagemVazia={
            filtroAtivo
              ? 'Nenhum para revisar atende aos filtros.'
              : 'Nenhum fornecedor para revisar.'
          }
        />
      )}
      {aba === 'descartados' && (
        <TabelaFornecedores
          lista={descartados}
          acao={null}
          mensagemVazia="Nenhum fornecedor descartado."
        />
      )}
    </section>
  );
}
