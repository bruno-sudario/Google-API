# Busca Geo Avançada

Ferramenta **client-only** de prospecção de leads comerciais via **Google Places API (New)**.
Busca estabelecimentos por categoria dentro de um raio de uma cidade, classifica em
**Aprovados / Para revisar / Descartados**, enriquece os aprovados com contato
(telefone/WhatsApp/site/nota) e exporta uma planilha XLSX. Interface 100% PT-BR.

## Stack

Vite · React 18 · TypeScript · Tailwind CSS · `@vis.gl/react-google-maps` · `xlsx`.

## Pré-requisitos (Google Cloud)

1. Habilite 3 APIs no projeto Cloud: **Places API (New)**, **Maps JavaScript API**, **Geocoding API**.
2. Crie uma API key e **restrinja**:
   - por **referenciador HTTP** (`http://localhost:*` e o domínio de produção);
   - por **API** (somente as 3 acima).
3. Copie `.env.local.example` para `.env.local` e preencha a chave:
   ```
   VITE_GOOGLE_MAPS_API_KEY=SUA_CHAVE_AQUI
   ```

> ⚠️ Por ser um app client-only, a chave fica exposta no bundle do navegador — isso é
> inerente à Maps JS API. A proteção real contra abuso/custo é a **restrição por
> referrer + API**, não esconder a chave. O `.env.local` está no `.gitignore`.

## Como rodar

```bash
npm install
npm run dev      # ambiente de desenvolvimento
npm run build    # build de produção (type-check + bundle)
npm run preview  # serve o build
```

## Como funciona (resumo de arquitetura)

- **Whitelist > Blacklist** — um lead só vira *Aprovado* se provar pertencer ao
  segmento (tipo primário OU palavra obrigatória). Palavra bloqueada manda para
  *Para revisar*, nunca descarta cegamente.
- **Filtro de tipo no servidor** — `searchNearby` com `includedPrimaryTypes`.
- **Grade adaptativa (QuadTree)** — como o SDK JS não expõe `nextPageToken`, a área é
  loteada e apenas a célula saturada (20 resultados) é subdividida.
- **Duas fases (custo mínimo)** — descoberta com campos baratos; enriquecimento
  (telefone/site/nota) só nos aprovados.
- **Rate-limit em 3 camadas** — menos chamadas (QuadTree) + pool de concorrência (4) +
  backoff exponencial acionado apenas no erro.

As categorias ficam em `src/lib/buscaEngine.ts` (`CATEGORIAS`). Hoje: **Móveis
Planejados** (foco), Marmorarias, Vidraçarias e Gesso/Drywall. Adicionar uma nova
categoria é apenas acrescentar uma entrada de configuração.

## Estrutura

```
src/
  App.tsx                      layout + <APIProvider>
  lib/buscaEngine.ts           núcleo de busca (QuadTree, pool, classificação, enriquecimento)
  lib/exportarXlsx.ts          geração da planilha
  hooks/useGeocode.ts          cidade/CEP -> coordenadas
  hooks/useBuscaFornecedores.ts orquestração multi-categoria + dedup global + progresso
  components/                  formulário, barra de progresso, painel/tabela/linha de resultados
```
