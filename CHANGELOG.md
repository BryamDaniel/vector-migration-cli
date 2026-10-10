# vector-migration-cli


## [0.1.4] - 2026-10-10

- `Dockerfile` con estrategia *multi-stage build* optimizada para producción con Node.js Alpine y usuario sin privilegios.
- Pipeline de Integración Continua (CI) en GitHub Actions (`.github/workflows/ci.yml`) para validación de compilación y tipado automático.

## [ 0.1.3 ] 2026-10-10 

- Servicio de vectorización local (`src/services/embedder.ts`) usando `@xenova/transformers` con el modelo `all-MiniLM-L6-v2` (vectores de 384 dimensiones sin costes de API externos).
- Servicio de persistencia en Qdrant (`src/services/vectorStore.ts`) con verificación/creación automática de colecciones e inserción masiva por lotes (*bulk upsert*).
- Integración completa del orquestador ETL en `src/index.ts` unificando extracción, validación Zod, vectorización local y persistencia vectorial.

## [ 0.1.2 ] 2026-10-10 

- Módulo Extractor (`src/services/extractor.ts`) para consulta paginada a la API de DummyJSON usando `Async Generators`.
- Esquema de validación estricta en tiempo de ejecución con Zod (`src/schemas/product.schema.ts`).
- Validación de variables de entorno con Zod (`src/config/env.ts` y `.env`).
- Archivo `.gitignore` para exclusión de dependencias, entornos, cachés y artefactos de compilación.

## [ 0.1.1 ] 2026-10-10

 - Ajuste en los saltos de linea en la arquitectura del proyecto.
 - Fuljo de trabajo planteado.


## [ 0.1.0 ] 2026-10-10
 
- Primer diseño de arquitectura.
