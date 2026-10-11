import { embedder } from './services/embedder.js';
import { dlq } from './services/dlq.js';
import { fetchProductsInBatches } from './services/extractor.js';
import { ensureCollectionExists, upsertBatch } from './services/vectorStore.js';

async function runMigrationPipeline() {
  console.log('🚀 Iniciando pipeline ETL tolerante a fallos (con DLQ)...');

  try {
    await ensureCollectionExists();
    await embedder.init();

    let totalProcessed = 0;
    let totalFailed = 0;

    for await (const batchResult of fetchProductsInBatches()) {
      const { validProducts, failedCount } = batchResult;
      totalFailed += failedCount;

      if (validProducts.length === 0) {
        console.warn('⚠️ Lote vacío de elementos válidos. Saltando inserción...');
        continue;
      }

      console.log(`\n📦 Procesando lote válido de ${validProducts.length} registros (${failedCount} descartados)...`);

      const batchPoints = [];

      for (const product of validProducts) {
        const textToEmbed = `${product.title}. ${product.description}. Categoría: ${product.category}. Marca: ${product.brand}`;
        const vector = await embedder.generateEmbedding(textToEmbed);
        batchPoints.push({ product, vector });
      }

      console.log(`💾 Guardando lote en Qdrant...`);
      await upsertBatch(batchPoints);

      totalProcessed += validProducts.length;
      console.log(`✨ Lote procesado con éxito. Total acumulado: ${totalProcessed} productos.`);
    }

    // Volcar reporte DLQ a disco
    dlq.flushToDisk();

    console.log(`\n🎉 ¡Pipeline ETL completado!`);
    console.log(`   - Registros migrados con éxito: ${totalProcessed}`);
    console.log(`   - Registros corruptos aislados (DLQ): ${totalFailed}`);

  } catch (error) {
    console.error('❌ Error crítico ejecutando el pipeline de migración:', error);
    process.exit(1);
  }
}

runMigrationPipeline();