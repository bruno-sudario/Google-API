import { useState } from 'react';
import {
  Copy,
  Check,
  MessageCircle,
  Globe,
  Map as MapIcon,
  Star,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { Fornecedor } from '../lib/buscaEngine';

interface Props {
  fornecedor: Fornecedor;
  /** 'promover' (em Revisar) | 'remover' (em Aprovados) | null (somente leitura) */
  acao: 'promover' | 'remover' | null;
  onPromover?: (placeId: string) => void;
  onRemover?: (placeId: string) => void;
}

const corStatus: Record<Fornecedor['status'], string> = {
  APROVADO: 'bg-emerald-100 text-emerald-700',
  REVISAR: 'bg-amber-100 text-amber-700',
  DESCARTADO: 'bg-slate-100 text-slate-500',
};

const rotuloStatus: Record<Fornecedor['status'], string> = {
  APROVADO: 'Aprovado',
  REVISAR: 'Revisar',
  DESCARTADO: 'Descartado',
};

export default function LinhaFornecedor({
  fornecedor: f,
  acao,
  onPromover,
  onRemover,
}: Props) {
  const [copiado, setCopiado] = useState(false);

  const copiarTelefone = async () => {
    if (!f.telefone) return;
    try {
      await navigator.clipboard.writeText(f.telefone);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* clipboard indisponível — ignora */
    }
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      {/* Nome */}
      <td className="px-3 py-2 align-top">
        <div className="font-medium text-slate-800">{f.nome}</div>
        {f.tipoPrimario && (
          <div className="text-xs text-slate-400">{f.tipoPrimario}</div>
        )}
      </td>

      {/* Telefone */}
      <td className="px-3 py-2 align-top whitespace-nowrap">
        {f.telefone ? (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700">{f.telefone}</span>
            <button
              type="button"
              onClick={copiarTelefone}
              title="Copiar telefone"
              className="text-slate-400 hover:text-slate-700"
            >
              {copiado ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* WhatsApp */}
      <td className="px-3 py-2 align-top text-center">
        {f.whatsapp ? (
          <a
            href={f.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir conversa no WhatsApp"
            className="inline-flex text-emerald-600 hover:text-emerald-700"
          >
            <MessageCircle size={16} />
          </a>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* Site */}
      <td className="px-3 py-2 align-top text-center">
        {f.site ? (
          <a
            href={f.site}
            target="_blank"
            rel="noopener noreferrer"
            title={f.site}
            className="inline-flex text-slate-500 hover:text-slate-800"
          >
            <Globe size={16} />
          </a>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* Nota */}
      <td className="px-3 py-2 align-top whitespace-nowrap">
        {f.nota != null ? (
          <span className="inline-flex items-center gap-1 text-slate-700">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {f.nota.toFixed(1)}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* Avaliações */}
      <td className="px-3 py-2 align-top text-right tabular-nums text-slate-600">
        {f.totalAvaliacoes != null ? f.totalAvaliacoes : <span className="text-slate-300">—</span>}
      </td>

      {/* Endereço */}
      <td className="px-3 py-2 align-top text-slate-600">
        <div className="flex items-start gap-1.5">
          <span className="max-w-xs">{f.endereco || '—'}</span>
          {f.mapsUrl && (
            <a
              href={f.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver no Google Maps"
              className="mt-0.5 shrink-0 text-slate-400 hover:text-slate-700"
            >
              <MapIcon size={14} />
            </a>
          )}
        </div>
      </td>

      {/* Categoria */}
      <td className="px-3 py-2 align-top whitespace-nowrap text-slate-600">
        {f.categoria ?? '—'}
      </td>

      {/* Status */}
      <td className="px-3 py-2 align-top">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${corStatus[f.status]}`}
          title={f.motivo}
        >
          {rotuloStatus[f.status]}
        </span>
      </td>

      {/* Ações */}
      <td className="px-3 py-2 align-top whitespace-nowrap text-right">
        {acao === 'remover' && (
          <button
            type="button"
            onClick={() => onRemover?.(f.placeId)}
            title="Mover para Para revisar"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            <ArrowDown size={13} /> Revisar
          </button>
        )}
        {acao === 'promover' && (
          <button
            type="button"
            onClick={() => onPromover?.(f.placeId)}
            title="Mover para Aprovados"
            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
          >
            <ArrowUp size={13} /> Aprovar
          </button>
        )}
      </td>
    </tr>
  );
}
