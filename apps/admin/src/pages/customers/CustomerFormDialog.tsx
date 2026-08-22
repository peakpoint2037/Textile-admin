import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  createCustomerSchema,
  type CreateCustomerInput,
  type CustomerWithStatsDto,
} from '@textile-admin/shared';
import { Plus } from 'lucide-react';
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
import { useCreateCustomer, useUpdateCustomer } from '@/api/customers';
import { ApiClientError } from '@/api/client';

interface CustomerFormDialogProps {
  customer?: CustomerWithStatsDto;
  trigger?: React.ReactNode;
  /** For controlled/inline use (e.g. "create customer" from within another
   *  form) — when provided, no trigger is rendered and openness is driven
   *  entirely by the parent. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Pre-fills the name field, e.g. with whatever the user already typed
   *  into a search box before asking to create a new customer. */
  defaultName?: string;
  /** Called with the newly created customer — only fires on create, not edit. */
  onCreated?: (customer: CustomerWithStatsDto) => void;
}

export function CustomerFormDialog({
  customer,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  defaultName,
  onCreated,
}: CustomerFormDialogProps) {
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = isControlled ? openProp : internalOpen;
  const setOpen = onOpenChangeProp ?? setInternalOpen;
  const isEdit = Boolean(customer);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer(customer?.id ?? '');

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: customer?.name ?? defaultName ?? '',
      phone: customer?.phone ?? '',
      email: customer?.email ?? '',
      address: customer?.address ?? '',
      city: customer?.city ?? '',
      state: customer?.state ?? '',
      pincode: customer?.pincode ?? '',
      country: customer?.country ?? 'India',
    },
  });

  // Re-seed the form each time it opens for a fresh create — in controlled
  // mode this component doesn't unmount between opens, so without this a
  // second "create new customer" click would still show the previous
  // attempt's leftover values (or a stale defaultName).
  React.useEffect(() => {
    if (open && !isEdit) {
      reset({
        name: defaultName ?? '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: CreateCustomerInput) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(values);
        toast.success('Customer updated');
      } else {
        const created = await createMutation.mutateAsync(values);
        toast.success('Customer created');
        reset();
        onCreated?.(created);
      }
      setOpen(false);
    } catch (err) {
      if (err instanceof ApiClientError && err.fields) {
        for (const [field, message] of Object.entries(err.fields)) {
          setError(field as keyof CreateCustomerInput, { message });
        }
      }
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Customer' : 'New Customer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" {...register('address')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register('state')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" {...register('pincode')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
