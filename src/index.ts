import { embedder } from './services/embedder.js';
import { fetchProductsInBatches } from './services/extractor.js';
import { ensureCollectionExists, upsertBatch } from './services/vectorStore.js';

async function runMigrationPipeline() {
  console.log('Iniciando pipeline ETL de migración vectorial...');

  try {
    // 1. Asegurar infraestructura vectorial en Qdrant
    await ensureCollectionExists();

    // 2. Precargar modelo de embeddings en memoria local
    await embedder.init();

    let totalProcessed = 0;

    // 3. Iterar por lotes usando el generador asíncrono
    for await (const batch of fetchProductsInBatches()) {
      console.log(`\n📦 Procesando lote de ${batch.length} registros...`);

      const batchPoints = [];

      for (const product of batch) {
        // Combinamos campos clave para darle contexto semántico al embedding
        const textToEmbed = `${product.title}. ${product.description}. Categoría: ${product.category}. Marca: ${product.brand}`;
        
        // Generación del vector local
        const vector = await embedder.generateEmbedding(textToEmbed);
        
        batchPoints.push({ product, vector });
      }

      // 4. Inserción masiva en Qdrant
      console.log(`Guardando lote en Qdrant...`);
      await upsertBatch(batchPoints);

      totalProcessed += batch.length;
      console.log(`Lote procesado con éxito. Total acumulado: ${totalProcessed} productos.`);
    }

    console.log(`\n¡Pipeline ETL completado con éxito! Se migraron ${totalProcessed} registros a Qdrant.`);
  } catch (error) {
    console.error('Error crítico ejecutando el pipeline de migración:', error);
    process.exit(1);
  }
}

runMigrationPipeline();