import { useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import FormularioBusca from './components/FormularioBusca';
import { buscarFornecedores, type AreaBusca } from './lib/buscaEngine';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

export default function App() {
  const [buscando, setBuscando] = useState(false);
  const [incluirRevisar, setIncluirRevisar] = useState(false);

  // Handler temporário (M2): roda a busca e loga as contagens no console.
  const handleBuscar = async (
    catIds: string[],
    area: AreaBusca,
    rotuloArea: string,
  ) => {
    setBuscando(true);
    console.log(`[busca] área: ${rotuloArea}`, area, 'categorias:', catIds);
    try {
      for (const catId of catIds) {
        const r = await buscarFornecedores(
          catId,
          area,
          (msg, pct) => console.log(`[${catId}] ${pct}% — ${msg}`),
          incluirRevisar,
        );
        console.log(`[${catId}] resumo:`, r.resumo);
      }
    } catch (e) {
      console.error('[busca] erro:', e);
    } finally {
      setBuscando(false);
    }
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
            buscando={buscando}
            incluirRevisar={incluirRevisar}
            onIncluirRevisarChange={setIncluirRevisar}
            onBuscar={handleBuscar}
          />
        </main>
      </div>
    </APIProvider>
  );
}
