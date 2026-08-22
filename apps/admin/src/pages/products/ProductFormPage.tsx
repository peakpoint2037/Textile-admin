import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from '@textile-admin/shared';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategories } from '@/api/categories';
import { useCreateProduct, useProduct, useUpdateProduct } from '@/api/products';
import { ApiClientError } from '@/api/client';
import { ProductImageManager } from './ProductImageManager';

const NO_CATEGORY = '__none__';

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: categories } = useCategories();
  const { data: product, isPending: productPending, isError, error, refetch } = useProduct(id);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(id ?? '');

  const schema = isEdit ? updateProductSchema : createProductSchema;
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductInput | UpdateProductInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'ACTIVE',
      lowStockLimit: 5,
      stockQuantity: 0,
    },
  });

  React.useEffect(() => {
    if (product) {
      reset({
        categoryId: product.categoryId ?? undefined,
        sku: product.sku,
        name: product.name,
        description: product.description ?? '',
        size: product.size ?? '',
        color: product.color ?? '',
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        lowStockLimit: product.lowStockLimit,
        status: product.status,
      });
    }
  }, [product, reset]);

  async function onSubmit(values: CreateProductInput | UpdateProductInput) {
    const payload = { ...values, categoryId: values.categoryId === NO_CATEGORY ? null : values.categoryId };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload as UpdateProductInput);
        toast.success('Product updated');
      } else {
        const created = await createMutation.mutateAsync(payload as CreateProductInput);
        toast.success('Product created');
        navigate(`/products/${created.id}/edit`);
        return;
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.fields) {
        for (const [field, message] of Object.entries(err.fields)) {
          setError(field as keyof CreateProductInput, { message });
        }
      }
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (isEdit && productPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isEdit && isError) {
    return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={isEdit ? 'Edit Product' : 'Add Product'} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register('sku')} placeholder="e.g. TS-BLK-M" />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value ?? NO_CATEGORY} onValueChange={field.onChange}>
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="size">Size</Label>
              <Input id="size" {...register('size')} placeholder="e.g. M" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Color</Label>
              <Input id="color" {...register('color')} placeholder="e.g. Black" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <Input id="purchasePrice" type="number" step="0.01" {...register('purchasePrice')} />
              {errors.purchasePrice && <p className="text-xs text-destructive">{errors.purchasePrice.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sellingPrice">Selling Price</Label>
              <Input id="sellingPrice" type="number" step="0.01" {...register('sellingPrice')} />
              {errors.sellingPrice && <p className="text-xs text-destructive">{errors.sellingPrice.message}</p>}
            </div>

            {!isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="stockQuantity">Initial Stock Quantity</Label>
                <Input id="stockQuantity" type="number" {...register('stockQuantity')} />
              </div>
            )}
            {isEdit && product && (
              <div className="space-y-1.5">
                <Label>Current Stock</Label>
                <p className="pt-1.5 text-sm text-muted-foreground">
                  {product.stockQuantity} units — adjust this from the{' '}
                  <a href="/inventory" className="underline">
                    Inventory
                  </a>{' '}
                  page.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="lowStockLimit">Low Stock Limit</Label>
              <Input id="lowStockLimit" type="number" {...register('lowStockLimit')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {isEdit && product && (
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductImageManager productId={product.id} images={product.images} />
            </CardContent>
          </Card>
        )}
        {!isEdit && (
          <p className="text-sm text-muted-foreground">Save the product first to add images.</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/products')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </form>
    </div>
  );
}
