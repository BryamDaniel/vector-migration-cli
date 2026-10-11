import * as fs from 'fs';
import * as path from 'path';

export interface DeadLetterRecord {
  rawRecord: unknown;
  errorMessage: string;
  timestamp: string;
}

class DeadLetterQueueService {
  private static instance: DeadLetterQueueService;
  private deadLetters: DeadLetterRecord[] = [];
  private logFilePath = path.join(process.cwd(), 'dlq-report.json');

  public static getInstance(): DeadLetterQueueService {
    if (!DeadLetterQueueService.instance) {
      DeadLetterQueueService.instance = new DeadLetterQueueService();
    }
    return DeadLetterQueueService.instance;
  }

  public add(rawRecord: unknown, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.deadLetters.push({
      rawRecord,
      errorMessage,
      timestamp: new Date().toISOString(),
    });
  }

  public getCount(): number {
    return this.deadLetters.length;
  }

  public getRecords(): DeadLetterRecord[] {
    return this.deadLetters;
  }

  public flushToDisk(): void {
    if (this.deadLetters.length === 0) {
      console.log('[DLQ] No se registraron anomalías. Sistema limpio.');
      return;
    }

    try {
      fs.writeFileSync(this.logFilePath, JSON.stringify(this.deadLetters, null, 2), 'utf-8');
      console.warn(`[DLQ] ⚠️ Se han aislado ${this.deadLetters.length} registros corruptos. Reporte guardado en: ${this.logFilePath}`);
    } catch (err) {
      console.error('[DLQ] Error al escribir el reporte de la Dead Letter Queue en disco:', err);
    }
  }
}

export const dlq = DeadLetterQueueService.getInstance();