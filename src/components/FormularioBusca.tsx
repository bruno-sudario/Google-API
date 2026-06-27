import { useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { CATEGORIAS, type AreaBusca } from '../lib/buscaEngine';
import {
  OPCOES_NOTA,
  OPCOES_AVALIACOES,
  CLASSE_SELECT_FILTRO,
} from '../lib/filtros';
import { useGeocode } from '../hooks/useGeocode';

interface Props {
  buscando: boolean;
  incluirRevisar: boolean;
  onIncluirRevisarChange: (v: boolean) => void;
  minNota: number;
  minAvaliacoes: number;
  onMinNotaChange: (v: number) => void;
  onMinAvaliacoesChange: (v: number) => void;
  onBuscar: (catIds: string[], area: AreaBusca, rotuloArea: string) => void;
}

export default function FormularioBusca({
  buscando,
  incluirRevisar,
  onIncluirRevisarChange,
  minNota,
  minAvaliacoes,
  onMinNotaChange,
  onMinAvaliacoesChange,
  onBuscar,
}: Props) {
  const placesLib = useMapsLibrary('places');
  const { geocodificar, pronto: geocodePronto } = useGeocode();

  const [local, setLocal] = useState('');
  const [raioKm, setRaioKm] = useState(15);
  const [selecionadas, setSelecionadas] = useState<string[]>(['moveis']);
  const [erro, setErro] = useState<string | null>(null);
  const [geocodificando, setGeocodificando] = useState(false);

  const bibliotecasProntas = placesLib !== null && geocodePronto;
  const podeBuscar =
    bibliotecasProntas &&
    !buscando &&
    !geocodificando &&
    local.trim().length > 0 &&
    selecionadas.length > 0;

  const alternarCategoria = (id: string) => {
    setSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!podeBuscar) return;

    setGeocodificando(true);
    const r = await geocodificar(local);
    setGeocodificando(false);

    if (!r) {
      setErro('Não foi possível localizar essa cidade/CEP. Verifique e tente novamente.');
      return;
    }
    const area: AreaBusca = {
      centro: { lat: r.lat, lng: r.lng },
      raioKm,
    };
    onBuscar(selecionadas, area, r.enderecoFormatado);
  };

  return (
    <form
      onSubmit={submeter}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-5 md:grid-cols-2">
        {/* Local */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Cidade ou CEP
          </label>
          <div className="relative">
            <MapPin
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Ex.: Sorocaba, SP"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Raio */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Raio de busca: <span className="font-semibold">{raioKm} km</span>
          </label>
          <input
            type="range"
            min={1}
            max={30}
            value={raioKm}
            onChange={(e) => setRaioKm(Number(e.target.value))}
            className="mt-3 w-full accent-slate-900"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>1 km</span>
            <span>30 km</span>
          </div>
        </div>
      </div>

      {/* Categorias */}
      <div className="mt-5">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Categorias
        </span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((c) => {
            const ativa = selecionadas.includes(c.id);
            return (
              <label
                key={c.id}
                className={`cursor-pointer select-none rounded-full border px-3 py-1.5 text-sm transition ${
                  ativa
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={ativa}
                  onChange={() => alternarCategoria(c.id)}
                />
                {c.rotulo}
              </label>
            );
          })}
        </div>
      </div>

      {/* Filtros de qualidade (aplicados aos resultados) */}
      <div className="mt-5">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Filtros de qualidade
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
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Filtram os resultados por nota e nº de avaliações (não alteram a busca).
        </p>
      </div>

      {/* Ações */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={incluirRevisar}
            onChange={(e) => onIncluirRevisarChange(e.target.checked)}
            className="h-4 w-4 accent-slate-900"
          />
          Incluir &ldquo;para revisar&rdquo; na exportação
        </label>

        <button
          type="submit"
          disabled={!podeBuscar}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buscando || geocodificando ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          {geocodificando ? 'Localizando…' : buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {!bibliotecasProntas && (
        <p className="mt-3 text-xs text-slate-400">
          Carregando bibliotecas do Google Maps…
        </p>
      )}
      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
    </form>
  );
}
