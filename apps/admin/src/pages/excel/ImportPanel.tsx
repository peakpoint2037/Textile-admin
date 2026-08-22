import * as React from 'react';
import { toast } from 'sonner';
import type { ExcelImportResult } from '@textile-admin/shared';
import type { UseMutationResult } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ImportPanelProps {
  title: string;
  description: string;
  columns: string[];
  useImportMutation: () => UseMutationResult<ExcelImportResult, Error, { file: File; confirm: boolean }>;
}

export function ImportPanel({ title, description, columns, useImportMutation }: ImportPanelProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [result, setResult] = React.useState<ExcelImportResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const mutation = useImportMutation();

  async function handleFileSelected(selected: File) {
    setFile(selected);
    setResult(null);
    try {
      const preview = await mutation.mutateAsync({ file: selected, confirm: false });
      setResult(preview);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read the file');
    }
  }

  async function handleConfirm() {
    if (!file) return;
    try {
      const committed = await mutation.mutateAsync({ file, confirm: true });
      setResult(committed);
      if (committed.committed) {
        toast.success(`Imported ${committed.validCount} row(s)`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Expected columns</p>
          <div className="flex flex-wrap gap-1">
            {columns.map((col) => (
              <Badge key={col} variant="outline">
                {col}
              </Badge>
            ))}
          </div>
        </div>

        {!file && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center">
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Select an .xlsx file to preview</p>
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <FileSpreadsheet className="h-4 w-4" /> Choose file
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
        />

        {file && (
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="truncate">{file.name}</span>
            <Button variant="ghost" size="sm" onClick={reset}>
              Change file
            </Button>
          </div>
        )}

        {mutation.isPending && <p className="text-sm text-muted-foreground">Processing…</p>}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="h-4 w-4" /> {result.validCount} valid
              </span>
              {result.errorCount > 0 && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="h-4 w-4" /> {result.errorCount} error(s)
                </span>
              )}
              <span className="text-muted-foreground">{result.totalRows} total rows</span>
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell>{e.row}</TableCell>
                        <TableCell className="text-destructive">{e.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {result.preview.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.preview.map((p) => (
                      <TableRow key={p.row}>
                        <TableCell>{p.row}</TableCell>
                        <TableCell>{p.sku}</TableCell>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>
                          <Badge variant={p.action === 'CREATE' ? 'success' : 'secondary'}>{p.action}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {result.committed ? (
              <p className="text-sm font-medium text-success">Import complete.</p>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={result.errorCount > 0 || result.validCount === 0 || mutation.isPending}
              >
                Confirm Import
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
