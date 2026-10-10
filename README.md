# vector-migration-cli

Una herramienta de línea de comandos (CLI) desarrollada en **TypeScript / Node.js** diseñada para ejecutar canalizaciones (pipelines) de extracción, transformación y carga (**ETL**) de datos empresariales desde APIs/Bases de datos tradicionales hacia un motor vectorial NoSQL (**Qdrant**), generando embeddings semánticos en local sin costes de API externas.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=for-the-badge&logo=nodedotjs)
![Qdrant](https://img.shields.io/badge/Qdrant-v1.9-red?style=for-the-badge&logo=qdrant)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue?style=for-the-badge&logo=docker)
![Zod](https://img.shields.io/badge/Validation-Zod-purple?style=for-the-badge)


##  Flujo de Trabajo (Pipeline ETL)

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

## Arquitectura.

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