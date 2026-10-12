import { Command } from 'commander';
import { searchProducts } from './services/searcher.js';

const program = new Command();

program
  .name('vector-search')
  .description('CLI para búsqueda semántica de productos utilizando Qdrant y Embeddings locales')
  .version('1.0.0');

program
  .argument('<query...>', 'Texto o frase a buscar en lenguaje natural')
  .option('-l, --limit <number>', 'Número máximo de resultados a mostrar', '3')
  .action(async (queryWords, options) => {
    // Unimos las palabras de la consulta en una sola frase
    const queryText = queryWords.join(' ');
    const limit = parseInt(options.limit, 10);

    if (isNaN(limit) || limit <= 0) {
      console.error('❌ Error: El límite debe ser un número entero positivo.');
      process.exit(1);
    }

    console.log(`\n🔍 Ejecutando búsqueda semántica para: "${queryText}" (Límite: ${limit})...\n`);

    try {
      const results = await searchProducts(queryText, limit);

      if (results.length === 0) {
        console.log('⚠️ No se encontraron resultados relevantes en Qdrant.');
        return;
      }

      console.log(`✨ Se encontraron los siguientes ${results.length} productos más afines:\n`);
      console.log('============================================================');

      results.forEach((item, index) => {
        console.log(`[${index + 1}] ${item.title} (Similitud: ${(item.score * 100).toFixed(2)}%)`);
        console.log(`    🏷️ Categoría: ${item.category} | 🏢 Marca: ${item.brand} | 💵 Precio: $${item.price}`);
        console.log(`    📝 Descripción: ${item.description}`);
        console.log('------------------------------------------------------------');
      });

    } catch (error) {
      console.error('❌ Error fatal en el comando de búsqueda:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);