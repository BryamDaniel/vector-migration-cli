import { env } from '../config/env.js';
import { embedder } from './embedder.js';

const COLLECTION_NAME = 'products_catalog';

export interface SearchResultItem {
  id: string | number;
  score: number;
  title?: string;
  description?: string;
  category?: string;
  price?: number;
  brand?: string;
}

export async function searchProducts(queryText: string, limit: number = 3): Promise<SearchResultItem[]> {
  try {
    // 1. Asegurar que el embedder local esté cargado en memoria
    await embedder.init();

    console.log(`[Searcher] Generando vector para la consulta: "${queryText}"...`);
    const queryVector = await embedder.generateEmbedding(queryText);

    console.log(`[Searcher] Consultando Qdrant REST API (${COLLECTION_NAME})...`);
    
    // Petición HTTP nativa al endpoint de búsqueda de Qdrant
    const url = `${env.QDRANT_URL}/collections/${COLLECTION_NAME}/points/search`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vector: Array.from(queryVector), // Convertimos el tensor/Float32Array a array plano de JS
        limit,
        with_payload: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en Qdrant REST API: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    const searchResults = data.result || [];

    return searchResults.map((hit: any) => ({
      id: hit.id,
      score: hit.score,
      title: hit.payload?.title,
      description: hit.payload?.description,
      category: hit.payload?.category,
      price: hit.payload?.price,
      brand: hit.payload?.brand,
    }));
  } catch (error) {
    console.error('[Searcher] Error ejecutando la búsqueda semántica:', error);
    throw error;
  }
}