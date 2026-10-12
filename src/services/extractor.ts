import { env } from '../config/env.js';
import { Product, ProductSchema } from '../schemas/product.schema.js';
import { z } from 'zod';
import { dlq } from './dlq.js';

// Esquema para validar únicamente los metadatos de la respuesta paginada y asegurar que products es un array desconocido
const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  products: z.array(z.unknown()),
});

export interface ExtractionResult {
  validProducts: Product[];
  failedCount: number;
}

export async function* fetchProductsInBatches(): AsyncGenerator<ExtractionResult, void, unknown> {
  let skip = 0;
  let total = Infinity;
  const limit = env.BATCH_SIZE;

  while (skip < total) {
    const url = `${env.SOURCE_API_URL}?limit=${limit}&skip=${skip}`;
    console.log(`[Extractor] Consultando lote en: ${url}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const rawJson = await response.json();

      // Validamos los metadatos globales con Zod
      const meta = PaginationMetaSchema.parse(rawJson);
      
      total = meta.total;
      skip += meta.limit;

      const validProducts: Product[] = [];
      let failedCountInBatch = 0;

      // Validación individual tolerante a fallos con Zod (SafeParse)
      for (const rawProduct of meta.products) {
        const result = ProductSchema.safeParse(rawProduct);

        if (result.success) {
          validProducts.push(result.data);
        } else {
          failedCountInBatch++;
          // Enviamos el registro corrupto y el error detallado de Zod a la DLQ
          dlq.add(rawProduct, result.error.format());
        }
      }

      yield { validProducts, failedCount: failedCountInBatch };
    } catch (error) {
      console.error(`[Extractor] Error crítico al procesar el lote (skip: ${skip}):`, error);
      throw error;
    }
  }
}