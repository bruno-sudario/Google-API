import { useEffect } from 'react';
import { Map, Marker, useMap } from '@vis.gl/react-google-maps';
import type { Fornecedor } from '../lib/buscaEngine';

interface Props {
  centro: { lat: number; lng: number };
  raioKm: number;
  locais: Fornecedor[];
}

/** Desenha o círculo do raio e ajusta o zoom para enquadrá-lo. */
function CamadaCirculo({
  centro,
  raioM,
}: {
  centro: { lat: number; lng: number };
  raioM: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const circulo = new google.maps.Circle({
      map,
      center: centro,
      radius: raioM,
      fillColor: '#0f172a',
      fillOpacity: 0.06,
      strokeColor: '#0f172a',
      strokeOpacity: 0.3,
      strokeWeight: 1,
    });
    const bounds = circulo.getBounds();
    if (bounds) map.fitBounds(bounds);
    return () => circulo.setMap(null);
  }, [map, centro.lat, centro.lng, raioM]);
  return null;
}

export default function MapaResultados({ centro, raioKm, locais }: Props) {
  const comCoordenadas = locais.filter((l) => l.lat !== 0 || l.lng !== 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="overflow-hidden rounded-lg" style={{ height: 420 }}>
        <Map
          defaultCenter={centro}
          defaultZoom={10}
          gestureHandling="greedy"
          disableDefaultUI={false}
          clickableIcons={false}
          style={{ width: '100%', height: '100%' }}
        >
          <CamadaCirculo centro={centro} raioM={raioKm * 1000} />
          {comCoordenadas.map((l) => (
            <Marker
              key={l.placeId}
              position={{ lat: l.lat, lng: l.lng }}
              title={l.nome}
            />
          ))}
        </Map>
      </div>
      <p className="px-2 py-1 text-xs text-slate-400">
        {comCoordenadas.length} local(is) no mapa
      </p>
    </section>
  );
}
