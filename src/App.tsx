import { useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import FormularioBusca from './components/FormularioBusca';
import BarraProgresso from './components/BarraProgresso';
import PainelResultados from './components/PainelResultados';
import { useBuscaFornecedores } from './hooks/useBuscaFornecedores';
import type { AreaBusca } from './lib/buscaEngine';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

export default function App() {
  const [incluirRevisar, setIncluirRevisar] = useState(false);
  const busca = useBuscaFornecedores();

  const handleBuscar = (catIds: string[], area: AreaBusca) => {
    busca.executar(catIds, area, incluirRevisar);
  };

  return (
    <APIProvider apiKey={API_KEY} libraries={['places', 'geocoding']}>
      <div className="min-h-full bg-slate-50 text-slate-800">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <MapPin size={20} />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Busca Geo Avançada</h1>
              <p className="text-sm text-slate-500">
                Prospecção de fornecedores por categoria e raio
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
          {!API_KEY && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Defina <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> em{' '}
              <code className="font-mono">.env.local</code> para habilitar a busca.
            </div>
          )}

          <FormularioBusca
            buscando={busca.buscando}
            incluirRevisar={incluirRevisar}
            onIncluirRevisarChange={setIncluirRevisar}
            onBuscar={handleBuscar}
          />

          {busca.buscando && (
            <BarraProgresso msg={busca.progresso.msg} pct={busca.progresso.pct} />
          )}

          {busca.erro && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {busca.erro}
            </div>
          )}

          {busca.concluido && (
            <PainelResultados
              aprovados={busca.aprovados}
              revisar={busca.revisar}
              descartados={busca.descartados}
              resumo={busca.resumo}
              onPromover={busca.promover}
              onRemover={busca.remover}
              onExportar={() => {
                /* M5: exportação XLSX */
              }}
            />
          )}
        </main>
      </div>
    </APIProvider>
  );
}
