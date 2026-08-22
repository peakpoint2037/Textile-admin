import * as React from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createOrderSchema, type CreateOrderInput } from '@textile-admin/shared';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomers } from '@/api/customers';
import { useProducts } from '@/api/products';
import { useCreateOrder } from '@/api/orders';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ProductCombobox } from './ProductCombobox';

const NO_CUSTOMER = '__none__';

export function CreateOrderDialog() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const { data: customers } = useCustomers({ limit: 100 });
  const { data: products } = useProducts({ limit: 100, status: 'ACTIVE' });
  const createOrder = useCreateOrder();

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      items: [{ productId: '', quantity: 1, discount: 0 }],
      discount: 0,
      shippingFee: 0,
      tax: 0,
      paymentStatus: 'PENDING',
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const watchedDiscount = watch('discount') ?? 0;
  const watchedShipping = watch('shippingFee') ?? 0;
  const watchedTax = watch('tax') ?? 0;

  const estimatedSubtotal = watchedItems.reduce((sum, item) => {
    const product = products?.items.find((p) => p.id === item.productId);
    if (!product || !item.quantity) return sum;
    const unitPrice = item.unitPrice ?? product.sellingPrice;
    return sum + unitPrice * item.quantity - (item.discount ?? 0);
  }, 0);
  const estimatedTotal = estimatedSubtotal - watchedDiscount + watchedShipping + watchedTax;

  async function onSubmit(values: CreateOrderInput) {
    try {
      const payload = { ...values, customerId: values.customerId === NO_CUSTOMER ? null : values.customerId };
      const order = await createOrder.mutateAsync(payload);
      toast.success(`Order ${order.orderNumber} created`);
      setOpen(false);
      reset();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create order');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer (optional)</Label>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <Select value={field.value ?? NO_CUSTOMER} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Walk-in / no customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CUSTOMER}>No customer</SelectItem>
                    {customers?.items.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Items</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <Controller
                  control={control}
                  name={`items.${index}.productId`}
                  render={({ field: productField }) => (
                    <ProductCombobox
                      products={products?.items ?? []}
                      value={productField.value}
                      onChange={productField.onChange}
                    />
                  )}
                />
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  placeholder="Qty"
                  {...register(`items.${index}.quantity`)}
                />
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
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productId: '', quantity: 1, discount: 0 })}
            >
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="discount">Discount</Label>
              <Input id="discount" type="number" step="0.01" {...register('discount')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shippingFee">Shipping</Label>
              <Input id="shippingFee" type="number" step="0.01" {...register('shippingFee')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax">Tax</Label>
              <Input id="tax" type="number" step="0.01" {...register('tax')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated total</span>
              <span className="font-medium">{formatCurrency(estimatedTotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Final totals are always calculated by the server.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
