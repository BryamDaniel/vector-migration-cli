import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '../config/env.js';
import { Product } from '../schemas/product.schema.js';

const client = new QdrantClient({ url: env.QDRANT_URL });
const COLLECTION_NAME = 'products_catalog';
const VECTOR_SIZE = 384; // Dimensión exacta generada por all-MiniLM-L6-v2

export async function ensureCollectionExists(): Promise<void> {
  try {
    const collectionsResponse = await client.getCollections();
    const exists = collectionsResponse.collections.some(c => c.name === COLLECTION_NAME);

    if (!exists) {
      console.log(`[Qdrant] La colección '${COLLECTION_NAME}' no existe. Creándola...`);
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });
      console.log(`[Qdrant] Colección '${COLLECTION_NAME}' creada con éxito.`);
    } else {
      console.log(`[Qdrant] Colección '${COLLECTION_NAME}' verificada (ya existe).`);
    }
  } catch (error) {
    console.error('[Qdrant] Error al verificar/crear la colección:', error);
    throw error;
  }
}

export interface ProductPoint {
  product: Product;
  vector: number[];
}

export async function upsertBatch(items: ProductPoint[]): Promise<void> {
  const points = items.map(({ product, vector }) => ({
    id: product.id,
    vector,
    payload: {
      title: product.title,
      description: product.description,
      category: product.category,
      price: product.price,
      rating: product.rating,
      brand: product.brand,
    },
  }));

  try {
    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points,
    });
  } catch (error) {
    console.error(`[Qdrant] Error al insertar lote de ${points.length} elementos:`, error);
    throw error;
  }
}