import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export interface DateRange {
  from?: string;
  to?: string;
}

type Preset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom';

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rangeForPreset(preset: Preset): DateRange {
  const now = new Date();
  const today = toISODate(now);

  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const iso = toISODate(y);
      return { from: iso, to: iso };
    }
    case 'last7': {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { from: toISODate(start), to: today };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toISODate(start), to: today };
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toISODate(start), to: toISODate(end) };
    }
    case 'custom':
      return {};
  }
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [preset, setPreset] = React.useState<Preset>('last7');

  function handlePresetChange(next: Preset) {
    setPreset(next);
    if (next !== 'custom') onChange(rangeForPreset(next));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={(v) => handlePresetChange(v as Preset)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="last7">Last 7 Days</SelectItem>
          <SelectItem value="thisMonth">This Month</SelectItem>
          <SelectItem value="lastMonth">Last Month</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-[150px]"
            value={value.from ?? ''}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-[150px]"
            value={value.to ?? ''}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

export function useDefaultDateRange(): DateRange {
  return React.useMemo(() => rangeForPreset('last7'), []);
}
