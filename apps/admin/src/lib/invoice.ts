import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrderDetailDto } from '@textile-admin/shared';
import { formatCurrency, formatDate } from './utils';

// There's no per-business settings screen yet, so these are the one place
// to edit if the shop's name/tagline/GST status ever changes.
const BUSINESS_NAME = 'DZANE';
const BUSINESS_TAGLINE = 'Stitching Studio & Premium Ladies Wear';
const BUSINESS_MOTTO = 'Tailored Grace, Timeless Fit';
const GST_NOTE = 'GST not charged — supplier not registered under GST';
const THANK_YOU_NOTE = `Thank you for choosing ${BUSINESS_NAME}. Please keep this receipt for your records.`;

/** jspdf-autotable types its `doc` param as `any` and attaches this at
 *  runtime rather than through a typed return value — this is the
 *  documented way to read the table's final Y position afterward. */
function lastAutoTableFinalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function buildInvoiceDoc(order: OrderDetailDto): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(BUSINESS_NAME, margin, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(BUSINESS_TAGLINE, margin, 64);
  doc.setFont('helvetica', 'italic');
  doc.text(BUSINESS_MOTTO, margin, 78);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RECEIPT / INVOICE', pageWidth - margin, 48, { align: 'right' });

  doc.setDrawColor(20);
  doc.setLineWidth(1.2);
  doc.line(margin, 92, pageWidth - margin, 92);

  let y = 116;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const col2 = pageWidth / 2;

  doc.setFont('helvetica', 'bold');
  doc.text('Invoice No.', margin, y);
  doc.text('Date', col2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(order.orderNumber, margin + 65, y);
  doc.text(formatDate(order.orderDate), col2 + 35, y);

  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.text('Customer', margin, y);
  doc.text('Mobile', col2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(order.customer?.name ?? 'Walk-in customer', margin + 65, y);
  doc.text(order.customer?.phone ?? '—', col2 + 35, y);

  const addressParts = [order.customer?.address, order.customer?.city, order.customer?.state, order.customer?.pincode].filter(
    (part): part is string => Boolean(part),
  );
  if (addressParts.length > 0) {
    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('Address', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(addressParts.join(', '), margin + 65, y, { maxWidth: pageWidth - margin - 65 - margin });
  }

  y += 30;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Item', 'SKU', 'Qty', 'Rate', 'Amount']],
    body: order.items.map((item, index) => [
      String(index + 1),
      item.productName,
      item.sku,
      String(item.quantity),
      formatCurrency(item.unitPrice),
      formatCurrency(item.total),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 24 },
      3: { cellWidth: 40, halign: 'right' },
      4: { cellWidth: 70, halign: 'right' },
      5: { cellWidth: 70, halign: 'right' },
    },
  });

  y = lastAutoTableFinalY(doc) + 24;

  const totalsRows: Array<[string, number, boolean?]> = [
    ['Subtotal', order.subtotal],
    ['Discount', -order.discount],
    ['Shipping', order.shippingFee],
    ['Tax', order.tax],
    ['Total', order.total, true],
  ];
  const totalsX = pageWidth - margin - 200;
  for (const [label, amount, emphasize] of totalsRows) {
    doc.setFont('helvetica', emphasize ? 'bold' : 'normal');
    doc.setFontSize(emphasize ? 12 : 10);
    doc.text(label, totalsX, y);
    doc.text(formatCurrency(amount), pageWidth - margin, y, { align: 'right' });
    y += emphasize ? 22 : 18;
  }

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Payment Status', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(order.paymentStatus, margin + 90, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Order Status', col2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(order.orderStatus, col2 + 80, y);

  if (order.notes) {
    y += 24;
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', margin, y);
    doc.setFont('helvetica', 'normal');
    y += 14;
    doc.text(order.notes, margin, y, { maxWidth: pageWidth - margin * 2 });
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text(GST_NOTE, margin, pageHeight - 90);

  doc.setDrawColor(180);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 60, margin + 160, pageHeight - 60);
  doc.line(pageWidth - margin - 160, pageHeight - 60, pageWidth - margin, pageHeight - 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Customer Signature', margin, pageHeight - 48);
  doc.text(`For ${BUSINESS_NAME}`, pageWidth - margin - 160, pageHeight - 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(THANK_YOU_NOTE, pageWidth / 2, pageHeight - 24, { align: 'center' });

  return doc;
}

export function downloadInvoicePdf(order: OrderDetailDto): void {
  const doc = buildInvoiceDoc(order);
  doc.save(`${order.orderNumber}-invoice.pdf`);
}

/**
 * Navigates an already-open window to the invoice PDF. Takes the window as
 * a parameter rather than calling `window.open()` itself: this function
 * runs after an `await` (fetching the order), and by then the browser no
 * longer considers the call "within a trusted user gesture" — `window.open`
 * at that point silently opens a blank tab instead of the real URL in most
 * browsers. The caller opens the blank tab synchronously inside the click
 * handler instead, before anything is awaited, and hands it to us here.
 *
 * The object URL is created via `targetWindow.URL`, not the opener's own
 * `URL` global — some Chromium versions refuse to navigate a window to a
 * blob: URL registered in a different realm. Creating it in the popup's
 * own realm keeps this a same-context navigation either way.
 */
export function printInvoicePdf(order: OrderDetailDto, targetWindow: Window): void {
  const doc = buildInvoiceDoc(order);
  const blob = doc.output('blob');
  const targetURL = (targetWindow as unknown as { URL: typeof URL }).URL;
  const blobUrl = targetURL.createObjectURL(blob);
  targetWindow.addEventListener('load', () => targetWindow.print());
  targetWindow.location.href = blobUrl;
}
