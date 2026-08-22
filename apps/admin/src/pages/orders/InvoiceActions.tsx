import * as React from 'react';
import { toast } from 'sonner';
import { Download, Loader2, Printer } from 'lucide-react';
import type { OrderDetailDto } from '@textile-admin/shared';
import { Button } from '@/components/ui/button';
import { fetchOrder } from '@/api/orders';
import { downloadInvoicePdf, printInvoicePdf } from '@/lib/invoice';

interface InvoiceActionsProps {
  orderId: string;
  /** Pass the already-loaded order (e.g. on the detail page) to skip a refetch. */
  order?: OrderDetailDto;
}

export function InvoiceActions({ orderId, order }: InvoiceActionsProps) {
  const [busy, setBusy] = React.useState<'print' | 'download' | null>(null);

  async function handlePrint(e: React.MouseEvent) {
    e.stopPropagation(); // these buttons often sit inside a clickable table row
    // Open the tab synchronously, inside the click handler, while the browser
    // still counts this as a trusted user gesture — window.open() after the
    // await below would silently produce a blank tab instead.
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Please allow popups for this site to print the invoice');
      return;
    }
    setBusy('print');
    try {
      const full = order ?? (await fetchOrder(orderId));
      printInvoicePdf(full, win);
    } catch (err) {
      win.close();
      toast.error(err instanceof Error ? err.message : 'Could not generate the invoice');
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    setBusy('download');
    try {
      const full = order ?? (await fetchOrder(orderId));
      downloadInvoicePdf(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate the invoice');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Print invoice"
        disabled={busy !== null}
        onClick={handlePrint}
      >
        {busy === 'print' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Download invoice PDF"
        disabled={busy !== null}
        onClick={handleDownload}
      >
        {busy === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </Button>
    </>
  );
}
