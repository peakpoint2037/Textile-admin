# Public Product API

Two deliberately unauthenticated endpoints, meant to be called directly from
a customer-facing storefront (a separate app/domain from the admin
dashboard): a listing endpoint and a single-product detail endpoint. Both
only ever return products with `status = 'ACTIVE'` — there is no way to
request draft or archived products through either route.

- Router: [`apps/backend/src/routes/publicRoutes.ts`](../../apps/backend/src/routes/publicRoutes.ts)
- Controller: [`apps/backend/src/controllers/publicProductController.ts`](../../apps/backend/src/controllers/publicProductController.ts)
- Service: [`apps/backend/src/services/publicProductService.ts`](../../apps/backend/src/services/publicProductService.ts)
- Query schema: [`packages/shared/schemas/product.ts`](../../packages/shared/schemas/product.ts) (`publicProductQuerySchema`)
- Response types: [`packages/shared/types/api.ts`](../../packages/shared/types/api.ts) (`PublicProductDto`, `PublicProductDetailDto`, `PublicProductImageDto`)

## Authentication

None. No `Authorization` header is required or checked for either route.

## CORS

Controlled separately from the rest of the API by the `PUBLIC_STOREFRONT_URLS`
env var (comma-separated origin allowlist, applied to every path under
`/api/public/*`):

- Unset / empty → any origin may call these endpoints.
- Set → only the listed origins are allowed; all others are rejected at the
  CORS layer.

Every other route in the API stays locked to `FRONTEND_URL` regardless of
this setting. See the `origin` function in
[`apps/backend/src/app.ts`](../../apps/backend/src/app.ts).

No rate limiting is applied to these or any other routes.

---

## `GET /api/public/products` — list

### Query parameters

All parameters are optional and passed as a query string.

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | integer ≥ 1 | `1` | |
| `limit` | integer, 1–100 | `20` | |
| `search` | string | — | Case-insensitive substring match (`ILIKE %search%`) against `name`, `sku`, `color`, and `size` |
| `category` | string | — | Category **slug**, not the internal UUID (e.g. `?category=t-shirts`). An unknown slug returns an empty page (`200`), not a `404` |
| `size` | string | — | Exact match |
| `color` | string | — | Exact match |
| `sortBy` | `name` \| `sellingPrice` \| `createdAt` | `createdAt` | |
| `sortDir` | `asc` \| `desc` | `desc` | |

There is no price-range filter, and `status` cannot be set by the caller —
the service hardcodes `ACTIVE`.

#### Example

```
GET /api/public/products?category=t-shirts&search=blue&sortBy=sellingPrice&sortDir=asc&page=1&limit=20
```

### Success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "c3b1e2b0-...",
        "sku": "TS-BLU-M",
        "name": "Classic Blue Tee",
        "description": "100% cotton crew neck",
        "categoryId": "8f2a1c9d-...",
        "categoryName": "T-Shirts",
        "categorySlug": "t-shirts",
        "size": "M",
        "color": "Blue",
        "sellingPrice": 599,
        "stockStatus": "IN_STOCK",
        "inStock": true,
        "primaryImageUrl": "https://cdn.example.com/products/ts-blu-m/1.jpg",
        "imageCount": 3
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3
    }
  }
}
```

#### `PublicProductDto` fields

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | |
| `sku` | string | |
| `name` | string | |
| `description` | string \| null | |
| `categoryId` | string \| null | |
| `categoryName` | string \| null | |
| `categorySlug` | string \| null | |
| `size` | string \| null | |
| `color` | string \| null | |
| `sellingPrice` | number | |
| `stockStatus` | `"IN_STOCK"` \| `"LOW"` \| `"OUT_OF_STOCK"` | |
| `inStock` | boolean | |
| `primaryImageUrl` | string \| null | Single representative image only — use the detail endpoint below for the full image list |
| `imageCount` | number | Total image count, e.g. to show a "+N photos" affordance in a grid |

**Deliberately excluded:** `purchasePrice` and `lowStockLimit` are internal
fields (cost/margin and operational threshold) returned by the admin-facing
`/api/products` endpoint but never exposed on this public one. Keep that
exclusion in mind if this DTO is extended later.

### Error responses

| Status | `code` | Cause |
|---|---|---|
| `422` | `VALIDATION_ERROR` | A query param fails validation (e.g. `limit` > 100, invalid `sortBy`/`sortDir` value) — `fields` gives a per-field message |
| `500` | `INTERNAL_ERROR` | Unhandled server error |

There is no `404` case for this endpoint — an unrecognized `category` slug
returns `200` with `items: []` instead of erroring, since it's treated as a
filter that matched nothing rather than a missing resource.

---

## `GET /api/public/products/:id` — detail (with all images)

Returns everything the list endpoint does, plus the full `images` array — use
this to render a product's gallery/detail page.

### Path parameters

| Param | Type | Notes |
|---|---|---|
| `id` | string (UUID) | The product's id (from a list response's `id` field) |

### Success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "id": "c3b1e2b0-...",
    "sku": "TS-BLU-M",
    "name": "Classic Blue Tee",
    "description": "100% cotton crew neck",
    "categoryId": "8f2a1c9d-...",
    "categoryName": "T-Shirts",
    "categorySlug": "t-shirts",
    "size": "M",
    "color": "Blue",
    "sellingPrice": 599,
    "stockStatus": "IN_STOCK",
    "inStock": true,
    "primaryImageUrl": "https://cdn.example.com/products/ts-blu-m/1.jpg",
    "imageCount": 3,
    "images": [
      {
        "id": "9a1e2f30-...",
        "imageUrl": "https://cdn.example.com/products/ts-blu-m/1.jpg",
        "altText": null,
        "sortOrder": 0,
        "isPrimary": true
      },
      {
        "id": "9a1e2f31-...",
        "imageUrl": "https://cdn.example.com/products/ts-blu-m/2.jpg",
        "altText": null,
        "sortOrder": 1,
        "isPrimary": false
      }
    ]
  }
}
```

`PublicProductDetailDto` is `PublicProductDto` (see the field table above)
plus:

| Field | Type | Notes |
|---|---|---|
| `images` | `PublicProductImageDto[]` | Ordered by `sortOrder` ascending, same order as the admin UI's image manager |

#### `PublicProductImageDto` fields

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | |
| `imageUrl` | string | Public CDN/storage URL |
| `altText` | string \| null | |
| `sortOrder` | number | |
| `isPrimary` | boolean | Matches the list endpoint's `primaryImageUrl` |

**Deliberately excluded:** `storageKey` (the internal R2/S3 object key) is
present on the admin-facing `ProductImageDto` but stripped from this public
shape, same rationale as `purchasePrice`/`lowStockLimit` above.

### Error responses

| Status | `code` | Cause |
|---|---|---|
| `404` | `PRODUCT_NOT_FOUND` | No product with that id, **or** the product exists but isn't `ACTIVE` (inactive/archived products 404 here rather than leaking their existence) |
| `500` | `INTERNAL_ERROR` | Unhandled server error |
