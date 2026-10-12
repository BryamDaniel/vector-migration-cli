import { env } from './config/env.js';
import { ProductSchema, Product } from './schemas/product.schema.js';
import { embedder } from './services/embedder.js';
import { DLQService } from './services/dlq.service.js';
import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({
  url: env.QDRANT_URL,
  checkCompatibility: false,
});

const COLLECTION_NAME = 'products_catalog';
const VECTOR_SIZE = 384; // Dimensión estándar para all-MiniLM-L6-v2

async function ensureCollectionExists() {
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

    if (!exists) {
      console.log(`[Qdrant] La colección "${COLLECTION_NAME}" no existe. Creándola...`);
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });
      console.log(`[Qdrant] Colección "${COLLECTION_NAME}" creada exitosamente.`);
    } else {
      console.log(`[Qdrant] La colección "${COLLECTION_NAME}" ya existe.`);
    }
  } catch (error) {
    console.error('[Qdrant] Error verificando/creando la colección:', error);
    throw error;
  }
}

async function* fetchProductsPaginated(limit: number = 20) {
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${env.SOURCE_API_URL}?limit=${limit}&skip=${skip}`;
    console.log(`[Extractor] Consultando API: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error en la API origen: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    const products = data.products || [];

    if (products.length === 0) {
      hasMore = false;
    } else {
      yield products;
      skip += limit;
      // Si ya trajimos todos los elementos anunciados por la API, detenemos
      if (skip >= data.total) {
        hasMore = false;
      }
    }
  }
}

async function runETL() {
  console.log('🚀 Iniciando pipeline ETL...');
  const startTime = Date.now();

  // 1. Asegurar colección en Qdrant
  await ensureCollectionExists();

  // 2. Inicializar motor de embeddings multihilo
  await embedder.init();

  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  try {
    // 3. Extracción paginada por lotes
    for await (const batch of fetchProductsPaginated(env.BATCH_SIZE)) {
      console.log(`[ETL] Procesando lote de ${batch.length} registros...`);
      const pointsToUpsert: any[] = [];

      for (const rawProduct of batch) {
        processedCount++;

        // 4. Validación de esquemas con Zod
        const validationResult = ProductSchema.safeParse(rawProduct);

        if (!validationResult.success) {
          errorCount++;
          console.warn(`⚠️ [Zod Validation] Registro inválido (ID: ${rawProduct?.id || 'desconocido'}). Aislando en DLQ...`);
          DLQService.recordFailure({
            rawRecord: rawProduct,
            error: validationResult.error.format(),
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        const product: Product = validationResult.data;

        try {
          // 5. Generación de embedding (Aprovecha Worker Thread y caché LRU SHA-256)
          const textToEmbed = `${product.title}. ${product.description}. Categoría: ${product.category}. Marca: ${product.brand}`;
          const vector = await embedder.generateEmbedding(textToEmbed);

          // 6. Preparar estructura de punto para Qdrant
          pointsToUpsert.push({
            id: product.id,
            vector,
            payload: {
              title: product.title,
              description: product.description,
              category: product.category,
              price: product.price,
              brand: product.brand,
              rating: product.rating,
            },
          });

          successCount++;
        } catch (embedError: any) {
          errorCount++;
          console.error(`❌ [Embedder] Error generando vector para producto ID ${product.id}:`, embedError.message);
          DLQService.recordFailure({
            rawRecord: rawProduct,
            error: embedError.message,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // 7. Volcado masivo (Upsert) a Qdrant si hay puntos válidos en el lote
      if (pointsToUpsert.length > 0) {
        await client.upsert(COLLECTION_NAME, {
          wait: true,
          points: pointsToUpsert,
        });
        console.log(`[Qdrant] ✅ ${pointsToUpsert.length} puntos indexados correctamente.`);
      }
    }
  } catch (error) {
    console.error('❌ Error crítico durante la ejecución del ETL:', error);
  } finally {
    // 8. Cierre seguro y guardado de caché en disco
    await embedder.terminate();
    DLQService.flush();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n========================================');
    console.log('📊 RESUMEN DE EJECUCIÓN ETL');
    console.log('========================================');
    console.log(`⏱️ Tiempo total: ${duration}s`);
    console.log(`📦 Registros procesados: ${processedCount}`);
    console.log(`✨ Indexados con éxito: ${successCount}`);
    console.log(`⚠️ Aislados en DLQ (Errores): ${errorCount}`);
    console.log('========================================\n');
  }
}

// Ejecutar el ETL
runETL();