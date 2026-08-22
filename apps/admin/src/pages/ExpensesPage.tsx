import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  createExpenseSchema,
  EXPENSE_CATEGORIES,
  type CreateExpenseInput,
  type ExpenseCategory,
  type ExpenseDto,
} from '@textile-admin/shared';
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { useCreateExpense, useDeleteExpense, useExpenses, useUpdateExpense } from '@/api/expenses';
import { formatCurrency, formatDate } from '@/lib/utils';

const ALL = '__all__';

function ExpenseForm({ expense, onDone }: { expense?: ExpenseDto; onDone: () => void }) {
  const isEdit = Boolean(expense);
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense(expense?.id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      category: expense?.category ?? 'OTHER',
      description: expense?.description ?? '',
      amount: expense?.amount ?? 0,
      expenseDate: expense?.expenseDate ?? new Date().toISOString().slice(0, 10),
    },
  });

  async function onSubmit(values: CreateExpenseInput) {
    try {
      await mutation.mutateAsync(values);
      toast.success(isEdit ? 'Expense updated' : 'Expense added');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" step="0.01" {...register('amount')} />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expenseDate">Date</Label>
          <Input id="expenseDate" type="date" {...register('expenseDate')} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...register('description')} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add Expense'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ExpensesPage() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [category, setCategory] = React.useState(ALL);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ExpenseDto | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<ExpenseDto | null>(null);

  const { data, isPending, isError, error, refetch } = useExpenses({
    page,
    limit,
    category: category === ALL ? undefined : (category as ExpenseCategory),
  });
  const deleteMutation = useDeleteExpense();

  const totalsByCategory = React.useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of data?.items ?? []) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    return totals;
  }, [data]);
  const grandTotal = data?.items.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  function openEdit(expense: ExpenseDto) {
    setEditing(expense);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Expense deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete expense');
    }
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track packaging, marketing, shipping and other costs"
        actions={
          <Dialog
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open);
              if (!open) setEditing(undefined);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(undefined)}>
                <Plus className="h-4 w-4" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Expense' : 'New Expense'}</DialogTitle>
              </DialogHeader>
              <ExpenseForm expense={editing} onDone={() => setFormOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">This page's total</p>
            <p className="text-lg font-semibold">{formatCurrency(grandTotal)}</p>
          </CardContent>
        </Card>
        {['PACKAGING', 'MARKETING', 'SHIPPING'].map((cat) => (
          <Card key={cat}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{cat}</p>
              <p className="text-lg font-semibold">{formatCurrency(totalsByCategory.get(cat) ?? 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4">
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isPending && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {data && data.items.length === 0 && (
        <EmptyState icon={Receipt} title="No expenses recorded" description="Add your first expense to start tracking costs." />
      )}

      {data && data.items.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-muted-foreground">{formatDate(expense.expenseDate)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.category}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {expense.description || '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(expense)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(expense)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination pagination={data.pagination} onPageChange={setPage} onLimitChange={setLimit} />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this expense?"
        description="This cannot be undone."
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
