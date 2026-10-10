import { pipeline } from '@xenova/transformers';

class EmbedderService {
  private static instance: EmbedderService;
  private pipe: any = null;
  private isInitialized = false;

  public static getInstance(): EmbedderService {
    if (!EmbedderService.instance) {
      EmbedderService.instance = new EmbedderService();
    }
    return EmbedderService.instance;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[Embedder] Cargando modelo local (Xenova/all-MiniLM-L6-v2)... Esto puede tardar unos segundos la primera vez.');
    // Inicializa el pipeline de extracción de características semánticas
    this.pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    this.isInitialized = true;
    console.log('[Embedder] Modelo cargado en memoria correctamente.');
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.init();
    }

    // Genera el vector aplicando pooling de media y normalización coseno
    const output = await this.pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data) as number[];
  }
}

export const embedder = EmbedderService.getInstance();