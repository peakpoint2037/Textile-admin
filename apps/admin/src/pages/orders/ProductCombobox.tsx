import * as React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatCurrency } from '@/lib/utils';

interface ProductOption {
  id: string;
  sku: string;
  name: string;
  sellingPrice: number;
  size?: string | null;
  color?: string | null;
}

interface ProductComboboxProps {
  products: ProductOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

/** e.g. "(32, Black)" — distinguishes variants of the same product name; empty for a plain product. */
function variantSuffix(p: ProductOption): string {
  const parts = [p.size, p.color].filter(Boolean);
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

export function ProductCombobox({ products, value, onChange, placeholder = 'Select product' }: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const selected = products.find((p) => p.id === value);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 justify-between font-normal"
        >
          <span className="truncate">
            {selected
              ? `${selected.sku} — ${selected.name}${variantSuffix(selected)} (${formatCurrency(selected.sellingPrice)})`
              : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="flex h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No products found.</p>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p.id);
                setOpen(false);
                setSearch('');
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                p.id === value && 'bg-accent/50',
              )}
            >
              <span className="truncate">
                <span className="font-medium">{p.sku}</span> — {p.name}
                {variantSuffix(p)}
              </span>
              <span className="ml-2 shrink-0 text-muted-foreground">{formatCurrency(p.sellingPrice)}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
