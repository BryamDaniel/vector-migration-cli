import { env } from '../config/env.js';
import { PaginatedProductsResponseSchema, Product } from '../schemas/product.schema.js';

export async function* fetchProductsInBatches(): AsyncGenerator<Product[], void, unknown> {
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

      // Validación runtime del JSON entrante con Zod
      const parsedData = PaginatedProductsResponseSchema.parse(rawJson);
      
      total = parsedData.total;
      skip += parsedData.limit;

      yield parsedData.products;
    } catch (error) {
      console.error(`[Extractor] Error al extraer el lote (skip: ${skip}):`, error);
      throw error;
    }
  }
}