import { parentPort } from 'worker_threads';
import { pipeline, env as transformersEnv } from '@xenova/transformers';

// Desactivamos la búsqueda de modelos locales si no existen para agilizar
transformersEnv.allowLocalModels = false;

let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

if (parentPort) {
  parentPort.on('message', async (message: { id: string; text: string }) => {
    try {
      const generate = await getExtractor();
      const output = await generate(message.text, {
        pooling: 'mean',
        normalize: true,
      });

      const embedding = Array.from(output.data as Float32Array);

      parentPort?.postMessage({
        id: message.id,
        success: true,
        embedding,
      });
    } catch (error: any) {
      parentPort?.postMessage({
        id: message.id,
        success: false,
        error: error?.message || 'Error en Worker Thread durante la generación del embedding',
      });
    }
  });
}