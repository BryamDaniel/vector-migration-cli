import { z } from 'zod';

// Esquema de entrada de un producto individual desde DummyJSON
export const ProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, "El título no puede estar vacío"),
  description: z.string().default("Sin descripción"),
  category: z.string(),
  price: z.number().nonnegative(),
  rating: z.number().min(0).max(5).default(0),
  tags: z.array(z.string()).optional().default([]),
  brand: z.string().optional().default('Unbranded'),
});

// Esquema de respuesta paginada de la API origen
export const PaginatedProductsResponseSchema = z.object({
  products: z.array(ProductSchema),
  total: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});

// Tipos inferidos automáticamente a partir de Zod
export type Product = z.infer<typeof ProductSchema>;
export type PaginatedProductsResponse = z.infer<typeof PaginatedProductsResponseSchema>;