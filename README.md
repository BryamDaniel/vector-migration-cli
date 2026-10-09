# migration-cli

# [ 0.1.0 ]
- Primer diseño de arquitectura. 
vector-migration-cli/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
├── src/
│   ├── config/
│   │   └── env.ts           # Variables de entorno validadas con Zod
│   ├── schemas/
│   │   └── product.schema.ts# Validación y tipado Zod (DummyJSON -> Qdrant Payload)
│   ├── services/
│   │   ├── extractor.ts     # Ingesta paginada con reintentos desde DummyJSON
│   │   ├── embedder.ts      # Vectorizador local (@xenova/transformers)
│   │   └── vectorStore.ts   # Cliente de Qdrant (creación de colección e inserción en batch)
│   ├── utils/
│   │   └── backoff.ts       # Utility para Exponential Backoff & Resilience
│   └── index.ts             # Punto de entrada CLI