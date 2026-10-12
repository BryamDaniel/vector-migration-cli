import fs from 'fs';
import path from 'path';

const DLQ_FILE_PATH = path.resolve(process.cwd(), 'dlq-report.json');

export interface DLQRecord {
  rawRecord: any;
  error: any;
  timestamp: string;
}

class DeadLetterQueueService {
  private failures: DLQRecord[] = [];

  public recordFailure(record: DLQRecord): void {
    this.failures.push(record);
  }

  public flush(): void {
    if (this.failures.length === 0) {
      // Si no hay fallos nuevos, limpiamos o dejamos el reporte previo intacto
      return;
    }

    try {
      let existingFailures: DLQRecord[] = [];
      
      // Si ya existía un reporte previo, acumulamos los errores
      if (fs.existsSync(DLQ_FILE_PATH)) {
        const fileContent = fs.readFileSync(DLQ_FILE_PATH, 'utf-8');
        existingFailures = JSON.parse(fileContent);
      }

      const combined = [...existingFailures, ...this.failures];
      fs.writeFileSync(DLQ_FILE_PATH, JSON.stringify(combined, null, 2), 'utf-8');
      
      console.log(`[DLQ Service] ⚠️ Se registraron y persistieron ${this.failures.length} errores en "${DLQ_FILE_PATH}".`);
    } catch (error) {
      console.error('[DLQ Service] Error al escribir el reporte de la Dead Letter Queue:', error);
    }
  }
}

export const DLQService = new DeadLetterQueueService();