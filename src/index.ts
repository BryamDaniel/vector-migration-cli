import { fetchProductsInBatches } from './services/extractor.js';

async function testExtractor() {
  console.log('Probando módulo Extractor de la Fase 2...\n');

  let totalProcessed = 0;

  for await (const batch of fetchProductsInBatches()) {
    totalProcessed += batch.length;
    console.log(`✅ Lote recibido exitosamente: ${batch.length} productos (Total hasta ahora: ${totalProcessed})`);
    console.log(`   Ejemplo del primer producto: "${batch[0].title}" - ${batch[0].price}€`);
  }

  console.log(`\n Fase 2 completada: ${totalProcessed} productos extraídos y validados correctamente con Zod.`);
}

testExtractor().catch(console.error);