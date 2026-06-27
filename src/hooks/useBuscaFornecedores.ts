import { useReducer, useCallback } from 'react';
import {
  buscarFornecedores,
  type AreaBusca,
  type Fornecedor,
} from '../lib/buscaEngine';

interface Progresso {
  msg: string;
  pct: number;
}

interface Resumo {
  bruto: number;
  aprovados: number;
  revisar: number;
  descartados: number;
}

interface Estado {
  buscando: boolean;
  concluido: boolean;
  erro: string | null;
  progresso: Progresso;
  aprovados: Fornecedor[];
  revisar: Fornecedor[];
  descartados: Fornecedor[];
  resumo: Resumo;
}

const RESUMO_ZERO: Resumo = { bruto: 0, aprovados: 0, revisar: 0, descartados: 0 };

const ESTADO_INICIAL: Estado = {
  buscando: false,
  concluido: false,
  erro: null,
  progresso: { msg: '', pct: 0 },
  aprovados: [],
  revisar: [],
  descartados: [],
  resumo: RESUMO_ZERO,
};

type Acao =
  | { tipo: 'INICIAR' }
  | { tipo: 'PROGRESSO'; progresso: Progresso }
  | {
      tipo: 'CONCLUIR';
      aprovados: Fornecedor[];
      revisar: Fornecedor[];
      descartados: Fornecedor[];
    }
  | { tipo: 'ERRO'; msg: string }
  | { tipo: 'PROMOVER'; placeId: string }
  | { tipo: 'REMOVER'; placeId: string };

function recalcular(estado: Estado): Estado {
  return {
    ...estado,
    resumo: {
      bruto: estado.aprovados.length + estado.revisar.length + estado.descartados.length,
      aprovados: estado.aprovados.length,
      revisar: estado.revisar.length,
      descartados: estado.descartados.length,
    },
  };
}

function reducer(estado: Estado, acao: Acao): Estado {
  switch (acao.tipo) {
    case 'INICIAR':
      return {
        ...ESTADO_INICIAL,
        buscando: true,
        progresso: { msg: 'Iniciando…', pct: 0 },
      };
    case 'PROGRESSO':
      return { ...estado, progresso: acao.progresso };
    case 'CONCLUIR':
      return recalcular({
        ...estado,
        buscando: false,
        concluido: true,
        aprovados: acao.aprovados,
        revisar: acao.revisar,
        descartados: acao.descartados,
        progresso: { msg: 'Concluído', pct: 100 },
      });
    case 'ERRO':
      return { ...estado, buscando: false, erro: acao.msg };
    case 'PROMOVER': {
      const lead = estado.revisar.find((f) => f.placeId === acao.placeId);
      if (!lead) return estado;
      return recalcular({
        ...estado,
        revisar: estado.revisar.filter((f) => f.placeId !== acao.placeId),
        aprovados: [...estado.aprovados, { ...lead, status: 'APROVADO' }],
      });
    }
    case 'REMOVER': {
      const lead = estado.aprovados.find((f) => f.placeId === acao.placeId);
      if (!lead) return estado;
      return recalcular({
        ...estado,
        aprovados: estado.aprovados.filter((f) => f.placeId !== acao.placeId),
        revisar: [...estado.revisar, { ...lead, status: 'REVISAR' }],
      });
    }
    default:
      return estado;
  }
}

export function useBuscaFornecedores() {
  const [estado, dispatch] = useReducer(reducer, ESTADO_INICIAL);

  const executar = useCallback(
    async (catIds: string[], area: AreaBusca, incluirRevisar: boolean) => {
      if (catIds.length === 0) return;
      dispatch({ tipo: 'INICIAR' });

      // Acumuladores com dedup GLOBAL por placeId (entre categorias).
      const aprovados: Fornecedor[] = [];
      const revisar: Fornecedor[] = [];
      const descartados: Fornecedor[] = [];
      const vistos = new Set<string>();

      const total = catIds.length;

      try {
        for (let i = 0; i < total; i++) {
          const catId = catIds[i];
          const resultado = await buscarFornecedores(
            catId,
            area,
            (msg, pct) => {
              // Progresso combinado: fatia desta categoria dentro do total.
              const combinado = Math.round((i * 100 + pct) / total);
              dispatch({ tipo: 'PROGRESSO', progresso: { msg, pct: combinado } });
            },
            incluirRevisar,
          );

          for (const f of resultado.aprovados) {
            if (vistos.has(f.placeId)) continue;
            vistos.add(f.placeId);
            aprovados.push(f);
          }
          for (const f of resultado.revisar) {
            if (vistos.has(f.placeId)) continue;
            vistos.add(f.placeId);
            revisar.push(f);
          }
          for (const f of resultado.descartados) {
            if (vistos.has(f.placeId)) continue;
            vistos.add(f.placeId);
            descartados.push(f);
          }
        }

        dispatch({ tipo: 'CONCLUIR', aprovados, revisar, descartados });
      } catch (e) {
        dispatch({
          tipo: 'ERRO',
          msg: e instanceof Error ? e.message : 'Erro inesperado na busca.',
        });
      }
    },
    [],
  );

  const promover = useCallback(
    (placeId: string) => dispatch({ tipo: 'PROMOVER', placeId }),
    [],
  );
  const remover = useCallback(
    (placeId: string) => dispatch({ tipo: 'REMOVER', placeId }),
    [],
  );

  return {
    aprovados: estado.aprovados,
    revisar: estado.revisar,
    descartados: estado.descartados,
    resumo: estado.resumo,
    buscando: estado.buscando,
    concluido: estado.concluido,
    erro: estado.erro,
    progresso: estado.progresso,
    executar,
    promover,
    remover,
  };
}
