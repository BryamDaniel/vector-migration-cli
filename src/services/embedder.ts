import { Worker } from 'worker_threads';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.resolve(process.cwd(), 'embedding-cache.json');
const MAX_CACHE_SIZE = 5000;

interface CacheStructure {
  [hash: string]: number[];
}

class ThreadedEmbedderService {
  private worker: Worker | null = null;
  private cache: Map<string, number[]> = new Map();
  private pendingRequests: Map<string, { resolve: (val: number[]) => void; reject: (err: any) => void }> = new Map();

  constructor() {
    this.loadCache();
  }

  private loadCache(): void {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const rawData = fs.readFileSync(CACHE_FILE, 'utf-8');
        const parsed: CacheStructure = JSON.parse(rawData);
        Object.entries(parsed).forEach(([hash, vector]) => {
          this.cache.set(hash, vector);
        });
        console.log(`[Embedder Cache] Cargados ${this.cache.size} embeddings desde caché persistente.`);
      }
    } catch (err) {
      console.warn('[Embedder Cache] No se pudo leer la caché previa, iniciando limpia.');
    }
  }

  public saveCache(): void {
    try {
      // Estrategia LRU simple: mantener solo los últimos MAX_CACHE_SIZE elementos
      const entries = Array.from(this.cache.entries()).slice(-MAX_CACHE_SIZE);
      const cacheObj = Object.fromEntries(entries);
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheObj, null, 2), 'utf-8');
      console.log(`[Embedder Cache] Caché guardada en disco (${entries.length} elementos).`);
    } catch (err) {
      console.error('[Embedder Cache] Error guardando la caché en disco:', err);
    }
  }

  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  public async init(): Promise<void> {
    if (this.worker) return;

    return new Promise((resolve, reject) => {
      // Usamos tsx para resolver directamente el worker en TypeScript en desarrollo
      const workerPath = path.resolve(process.cwd(), 'src/workers/embedder.worker.ts');

      this.worker = new Worker(
        `
        const { register } = require('tsx/cjs/api');
        register();
        require('${workerPath.replace(/\\/g, '/')}');
        `,
        { eval: true }
      );

      this.worker.on('message', (msg: { id: string; success: boolean; embedding?: number[]; error?: string }) => {
        const promise = this.pendingRequests.get(msg.id);
        if (promise) {
          if (msg.success && msg.embedding) {
            promise.resolve(msg.embedding);
          } else {
            promise.reject(new Error(msg.error || 'Worker error'));
          }
          this.pendingRequests.delete(msg.id);
        }
      });

      this.worker.on('error', (err) => {
        console.error('[Worker Thread Error]', err);
        reject(err);
      });

      // Confirmar inicialización exitosa
      resolve();
    });
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    const hash = this.hashText(text);

    // 1. Verificación en Caché (0ms latency)
    if (this.cache.has(hash)) {
      const cachedVector = this.cache.get(hash)!;
      // Re-insertar para mantener orden de uso reciente (LRU)
      this.cache.delete(hash);
      this.cache.set(hash, cachedVector);
      return cachedVector;
    }

    // 2. Inferencia en Worker Thread si no está en caché
    await this.init();

    const requestId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve: (vector: number[]) => {
          // Guardar en la caché tras generar
          this.cache.set(hash, vector);
          resolve(vector);
        },
        reject,
      });

      this.worker?.postMessage({ id: requestId, text });
    });
  }

  public async terminate(): Promise<void> {
    this.saveCache();
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const embedder = new ThreadedEmbedderService();