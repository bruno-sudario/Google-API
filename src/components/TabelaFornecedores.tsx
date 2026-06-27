import type { Fornecedor } from '../lib/buscaEngine';
import LinhaFornecedor from './LinhaFornecedor';

interface Props {
  lista: Fornecedor[];
  acao: 'promover' | 'remover' | null;
  onPromover?: (placeId: string) => void;
  onRemover?: (placeId: string) => void;
  mensagemVazia: string;
}

const colunas = [
  'Nome',
  'Telefone',
  'WhatsApp',
  'Site',
  'Nota',
  'Avaliações',
  'Endereço',
  'Categoria',
  'Status',
  '',
];

export default function TabelaFornecedores({
  lista,
  acao,
  onPromover,
  onRemover,
  mensagemVazia,
}: Props) {
  if (lista.length === 0) {
    return (
      <div className="px-3 py-12 text-center text-sm text-slate-400">
        {mensagemVazia}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            {colunas.map((c, i) => (
              <th key={i} className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lista.map((f) => (
            <LinhaFornecedor
              key={f.placeId}
              fornecedor={f}
              acao={acao}
              onPromover={onPromover}
              onRemover={onRemover}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
