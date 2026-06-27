import { useState } from 'react';
import { Download } from 'lucide-react';
import type { Fornecedor } from '../lib/buscaEngine';
import TabelaFornecedores from './TabelaFornecedores';

type Aba = 'aprovados' | 'revisar' | 'descartados';

interface Props {
  aprovados: Fornecedor[];
  revisar: Fornecedor[];
  descartados: Fornecedor[];
  resumo: { bruto: number; aprovados: number; revisar: number; descartados: number };
  onPromover: (placeId: string) => void;
  onRemover: (placeId: string) => void;
  onExportar: () => void;
}

export default function PainelResultados({
  aprovados,
  revisar,
  descartados,
  resumo,
  onPromover,
  onRemover,
  onExportar,
}: Props) {
  const [aba, setAba] = useState<Aba>('aprovados');

  const abas: { id: Aba; rotulo: string; n: number }[] = [
    { id: 'aprovados', rotulo: 'Aprovados', n: resumo.aprovados },
    { id: 'revisar', rotulo: 'Para revisar', n: resumo.revisar },
    { id: 'descartados', rotulo: 'Descartados', n: resumo.descartados },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Cabeçalho: resumo + exportar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          <strong className="text-emerald-700">{resumo.aprovados} aprovados</strong>
          {' · '}
          <strong className="text-amber-700">{resumo.revisar} para revisar</strong>
          {' · '}
          <strong className="text-slate-500">{resumo.descartados} descartados</strong>
        </p>
        <button
          type="button"
          onClick={onExportar}
          disabled={resumo.aprovados === 0 && resumo.revisar === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} /> Exportar XLSX
        </button>
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
          mensagemVazia="Nenhum fornecedor aprovado ainda."
        />
      )}
      {aba === 'revisar' && (
        <TabelaFornecedores
          lista={revisar}
          acao="promover"
          onPromover={onPromover}
          mensagemVazia="Nenhum fornecedor para revisar."
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
