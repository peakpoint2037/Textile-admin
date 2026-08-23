import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  SIZE_PRESETS,
  addProductGroupVariantSchema,
  updateProductGroupSchema,
  type AddProductGroupVariantInput,
  type UpdateProductGroupInput,
} from '@textile-admin/shared';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState } from '@/components/ErrorState';
import { StockStatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useCategories } from '@/api/categories';
import { useAddProductGroupVariant, useProductGroup, useUpdateProductGroup } from '@/api/productGroups';
import { ApiClientError } from '@/api/client';

const NO_CATEGORY = '__none__';

function AddVariantDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = React.useState(false);
  const addVariant = useAddProductGroupVariant(groupId);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddProductGroupVariantInput>({
    resolver: zodResolver(addProductGroupVariantSchema),
    defaultValues: { stockQuantity: 0, lowStockLimit: 5 },
  });

  async function onSubmit(values: AddProductGroupVariantInput) {
    try {
      await addVariant.mutateAsync(values);
      toast.success('Variant added');
      setOpen(false);
      reset();
    } catch (err) {
      if (err instanceof ApiClientError && err.fields) {
        for (const [field, message] of Object.entries(err.fields)) {
          setError(field as keyof AddProductGroupVariantInput, { message });
        }
      }
      toast.error(err instanceof Error ? err.message : 'Could not add variant');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" /> Add Variant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Variant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="variant-sku">SKU</Label>
              <Input id="variant-sku" {...register('sku')} placeholder="e.g. PT-BLU-36" />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variant-size">Size</Label>
              <Input
                id="variant-size"
                list="variant-size-presets"
                {...register('size')}
                placeholder="e.g. M, or Free Size"
              />
              <datalist id="variant-size-presets">
                {SIZE_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variant-color">Color</Label>
              <Input id="variant-color" {...register('color')} placeholder="e.g. Black" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variant-stock">Initial Stock</Label>
              <Input id="variant-stock" type="number" {...register('stockQuantity')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variant-low-stock">Low Stock Limit</Label>
              <Input id="variant-low-stock" type="number" {...register('lowStockLimit')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add variant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProductGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: group, isPending, isError, error, refetch } = useProductGroup(id);
  const { data: categories } = useCategories();
  const updateGroup = useUpdateProductGroup(id ?? '');

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProductGroupInput>({
    resolver: zodResolver(updateProductGroupSchema),
  });

  React.useEffect(() => {
    if (group) {
      reset({
        categoryId: group.categoryId ?? undefined,
        name: group.name,
        description: group.description ?? '',
        purchasePrice: group.purchasePrice,
        sellingPrice: group.sellingPrice,
        status: group.status,
      });
    }
  }, [group, reset]);

  async function onSubmit(values: UpdateProductGroupInput) {
    const payload = { ...values, categoryId: values.categoryId === NO_CATEGORY ? null : values.categoryId };
    try {
      await updateGroup.mutateAsync(payload);
      toast.success('Product group updated — every variant now shares these details');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update product group');
    }
  }

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !group) {
    return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;
  }

  return (
    <div>
      <PageHeader
        title={group.name}
        description={`${group.variantCount} variant${group.variantCount === 1 ? '' : 's'} · ${group.totalStock} units in stock`}
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Shared Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
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
              These details — including price — are shared by every variant below. Saving here
              updates all of them.
            </p>

            <div className="sm:col-span-2">
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Variants</CardTitle>
          <AddVariantDialog groupId={group.id} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.variants.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.sku}</TableCell>
                  <TableCell>{v.size ?? '—'}</TableCell>
                  <TableCell>{v.color ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.stockQuantity}</TableCell>
                  <TableCell>
                    <StockStatusBadge status={v.stockStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/products/${v.id}/edit`}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
