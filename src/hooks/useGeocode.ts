import { useCallback } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export interface ResultadoGeocode {
  lat: number;
  lng: number;
  enderecoFormatado: string;
}

/**
 * Geocodificação de cidade/CEP -> coordenadas, com viés para o Brasil.
 * Retorna null quando a biblioteca ainda não carregou ou não há resultados.
 */
export function useGeocode() {
  const geocodingLib = useMapsLibrary('geocoding');

  const pronto = geocodingLib !== null;

  const geocodificar = useCallback(
    async (texto: string): Promise<ResultadoGeocode | null> => {
      if (!geocodingLib) return null;
      const termo = texto.trim();
      if (!termo) return null;

      const geocoder = new geocodingLib.Geocoder();
      try {
        const { results } = await geocoder.geocode({
          address: termo,
          region: 'br',
        });
        const r = results[0];
        if (!r) return null;
        const loc = r.geometry.location;
        return {
          lat: loc.lat(),
          lng: loc.lng(),
          enderecoFormatado: r.formatted_address,
        };
      } catch {
        // ZERO_RESULTS, OVER_QUERY_LIMIT etc. → tratado como "não encontrado"
        return null;
      }
    },
    [geocodingLib],
  );

  return { geocodificar, pronto };
}
