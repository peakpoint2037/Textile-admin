import * as React from 'react';
import { ChevronDown, Plus, Search, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** Sentinel for "walk-in / no customer" — kept out of the real customerId
 *  value so it never reaches the server or the uuid-shaped Zod schema. */
export const NO_CUSTOMER = '__none__';

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
}

interface CustomerComboboxProps {
  customers: CustomerOption[];
  /** A real customer id, or NO_CUSTOMER for walk-in. */
  value: string;
  onChange: (id: string) => void;
  /** Called with whatever the user typed when they ask to create a new customer. */
  onCreateNew: (name: string) => void;
}

export function CustomerCombobox({
  customers,
  value,
  onChange,
  onCreateNew,
}: CustomerComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const selected = customers.find((c) => c.id === value);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').toLowerCase().includes(q),
    );
  }, [customers, search]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setSearch('');
  }

  function selectCustomer(id: string) {
    onChange(id);
    handleOpenChange(false);
  }

  function handleCreateNew() {
    const name = search.trim();
    handleOpenChange(false);
    onCreateNew(name);
  }

  const label =
    value !== NO_CUSTOMER && selected
      ? `${selected.name}${selected.phone ? ` (${selected.phone})` : ''}`
      : 'Walk-in / no customer';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{label}</span>
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
            placeholder="Search by name or phone…"
            className="flex h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          <button
            type="button"
            onClick={() => selectCustomer(NO_CUSTOMER)}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              value === NO_CUSTOMER && 'bg-accent/50',
            )}
          >
            <UserRound className="h-4 w-4 shrink-0" />
            Walk-in / no customer
          </button>

          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCustomer(c.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                c.id === value && 'bg-accent/50',
              )}
            >
              <span className="truncate font-medium">{c.name}</span>
              {c.phone && <span className="ml-2 shrink-0 text-muted-foreground">{c.phone}</span>}
            </button>
          ))}

          {search.trim() && filtered.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No customers found for "{search.trim()}".
            </p>
          )}
        </div>
        <div className="border-t p-1">
          <button
            type="button"
            onClick={handleCreateNew}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {search.trim() ? `Create new customer "${search.trim()}"` : 'Create new customer'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
