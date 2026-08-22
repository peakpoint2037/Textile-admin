import * as React from 'react';
import { toast } from 'sonner';
import type { InventoryListItemDto } from '@textile-admin/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStockAdjust, useStockIn } from '@/api/inventory';

interface StockDialogProps {
  product: InventoryListItemDto | null;
  onOpenChange: (open: boolean) => void;
}

export function StockInDialog({ product, onOpenChange }: StockDialogProps) {
  const [quantity, setQuantity] = React.useState('');
  const [reason, setReason] = React.useState('');
  const mutation = useStockIn();

  React.useEffect(() => {
    if (product) {
      setQuantity('');
      setReason('');
    }
  }, [product]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error('Enter a quantity greater than 0');
      return;
    }
    try {
      await mutation.mutateAsync({ productId: product.id, quantity: qty, reason: reason || undefined });
      toast.success(`Added ${qty} units to ${product.sku}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add stock');
    }
  }

  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock In — {product?.sku}</DialogTitle>
          <DialogDescription>Record newly received stock for {product?.name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="stock-in-qty">Quantity to add</Label>
            <Input
              id="stock-in-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock-in-reason">Reason (optional)</Label>
            <Textarea
              id="stock-in-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. New stock from supplier"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Add Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdjustStockDialog({ product, onOpenChange }: StockDialogProps) {
  const [quantity, setQuantity] = React.useState('');
  const [reason, setReason] = React.useState('');
  const mutation = useStockAdjust();

  React.useEffect(() => {
    if (product) {
      setQuantity('');
      setReason('');
    }
  }, [product]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    const qty = Number(quantity);
    if (!qty) {
      toast.error('Enter a non-zero quantity (negative to remove stock)');
      return;
    }
    if (!reason.trim()) {
      toast.error('A reason is required for adjustments');
      return;
    }
    try {
      await mutation.mutateAsync({ productId: product.id, quantity: qty, reason });
      toast.success(`Adjusted ${product.sku} by ${qty > 0 ? '+' : ''}${qty}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not adjust stock');
    }
  }

  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock — {product?.sku}</DialogTitle>
          <DialogDescription>
            Use a positive number to add stock (e.g. a return) or negative to remove it (e.g. damage).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="adjust-qty">Quantity change</Label>
            <Input
              id="adjust-qty"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. -2"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Current stock: {product?.stockQuantity}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-reason">Reason</Label>
            <Textarea
              id="adjust-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Damaged in transit"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Adjust Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
