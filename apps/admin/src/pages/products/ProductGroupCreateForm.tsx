import { useNavigate } from 'react-router-dom';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  SIZE_PRESETS,
  createProductGroupSchema,
  type CreateProductGroupInput,
} from '@textile-admin/shared';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategories } from '@/api/categories';
import { useCreateProductGroup } from '@/api/productGroups';
import { ApiClientError } from '@/api/client';

const NO_CATEGORY = '__none__';

export function ProductGroupCreateForm() {
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const createGroup = useCreateProductGroup();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductGroupInput>({
    resolver: zodResolver(createProductGroupSchema),
    defaultValues: {
      status: 'ACTIVE',
      variants: [{ sku: '', size: '', color: '', stockQuantity: 0, lowStockLimit: 5 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });

  async function onSubmit(values: CreateProductGroupInput) {
    const payload = { ...values, categoryId: values.categoryId === NO_CATEGORY ? null : values.categoryId };
    try {
      const created = await createGroup.mutateAsync(payload);
      toast.success(`Product created with ${created.variantCount} variants`);
      navigate(`/products/groups/${created.id}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.fields) {
        for (const [field, message] of Object.entries(err.fields)) {
          setError(field as keyof CreateProductGroupInput, { message });
        }
      }
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
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

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} />
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
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Every size/color variant below shares this one price.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-5">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor={`variants.${index}.sku`} className="text-xs">
                  SKU
                </Label>
                <Input id={`variants.${index}.sku`} {...register(`variants.${index}.sku`)} placeholder="e.g. PT-BLK-32" />
                {errors.variants?.[index]?.sku && (
                  <p className="text-xs text-destructive">{errors.variants[index]?.sku?.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`variants.${index}.size`} className="text-xs">
                  Size
                </Label>
                <Input
                  id={`variants.${index}.size`}
                  list="variant-size-presets"
                  {...register(`variants.${index}.size`)}
                  placeholder="e.g. M"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`variants.${index}.color`} className="text-xs">
                  Color
                </Label>
                <Input id={`variants.${index}.color`} {...register(`variants.${index}.color`)} placeholder="e.g. Black" />
              </div>
              <div className="flex items-end gap-1">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`variants.${index}.stockQuantity`} className="text-xs">
                    Initial Stock
                  </Label>
                  <Input
                    id={`variants.${index}.stockQuantity`}
                    type="number"
                    {...register(`variants.${index}.stockQuantity`)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {typeof errors.variants?.message === 'string' && (
            <p className="text-xs text-destructive">{errors.variants.message}</p>
          )}
          {typeof errors.variants?.root?.message === 'string' && (
            <p className="text-xs text-destructive">{errors.variants.root.message}</p>
          )}
          <datalist id="variant-size-presets">
            {SIZE_PRESETS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ sku: '', size: '', color: '', stockQuantity: 0, lowStockLimit: 5 })}
          >
            <Plus className="h-4 w-4" /> Add variant
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">Save the product first to add images.</p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate('/products')}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
