# vector-migration-cli




## [ 0.1.1 ]

 - Ajuste en los saltos de linea en la arquitectura del proyecto.
 - Fuljo de trabajo planteado.

```text
 [ Inicio CLI ]
        │
        ▼
 1. EXTRACT (Extractor)
    └── Consulta paginada a API REST (DummyJSON)
    └── Manejo de paginación por lotes (batching: limit, skip)
        │
        ▼
 2. VALIDATE & PARSE (Zod Schema)
    └── Validación runtime del contrato de datos JSON
    └── Separación de registros válidos y captura de anomalías
        │
        ▼
 3. TRANSFORM & EMBED (Transformers.js)
    └── Concatenación de texto relevante (Título + Descripción + Categoría)
    └── Generación de embeddings vectoriales (MiniLM-L6-v2) en local
        │
        ▼
 4. LOAD & RESILIENCE (Qdrant Sink)
    └── Creación/Verificación de Colección e Índices en Qdrant
    └── Inserción masiva por lotes (upsert batch) con reintentos (Backoff)
        │
        ▼
  [ Fin de Lote ] ────► ¿Quedan registros? ──(SÍ)──► Siguiente Lote
        │
      (NO)
        ▼
  [ Notificación de Éxito & Cierre ]
```

## [ 0.1.0 ]

- Primer diseño de arquitectura.

```text
vector-migration-cli/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── src/
    ├── config/
    │   └── env.ts            # Variables de entorno validadas con Zod
    ├── schemas/
    │   └── product.schema.ts # Validación y tipado Zod (DummyJSON -> Qdrant Payload)
    ├── services/
    │   ├── extractor.ts      # Ingesta paginada con reintentos desde DummyJSON
    │   ├── embedder.ts       # Vectorizador local (@xenova/transformers)
    │   └── vectorStore.ts    # Cliente de Qdrant (creación de colección e inserción en batch)
    ├── utils/
    │   └── backoff.ts        # Utility para Exponential Backoff & Resilience
    └── index.ts              # Punto de entrada CLI
```