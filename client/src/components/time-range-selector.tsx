import { useEffect, useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  TIME_RANGE_PRESETS,
  getPresetRange,
  getTimeRangeKey,
  formatRangeLabel,
  normalizeCustomRange,
  type TimeRangeValue,
  type TimeRangePreset,
} from "@/lib/time-range";

interface TimeRangeSelectorProps {
  value: TimeRangeValue;
  onChange: (value: TimeRangeValue) => void;
  className?: string;
  presets?: typeof TIME_RANGE_PRESETS;
  align?: "start" | "end";
  disabled?: boolean;
}

export function TimeRangeSelector({
  value,
  onChange,
  className,
  presets = TIME_RANGE_PRESETS,
  align = "end",
  disabled = false,
}: TimeRangeSelectorProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(() =>
    value.preset === "custom"
      ? {
          from: value.from ?? undefined,
          to: value.to ?? undefined,
        }
      : undefined,
  );

  useEffect(() => {
    if (value.preset === "custom") {
      setCustomRange({
        from: value.from ?? undefined,
        to: value.to ?? undefined,
      });
    }
  }, [value.preset, value.from, value.to]);

  const handlePresetClick = (preset: TimeRangePreset) => {
    if (preset === "custom") {
      setCustomOpen(true);
      return;
    }
    const { from, to } = getPresetRange(preset);
    onChange({ preset, from, to });
  };

  const handleApplyCustom = () => {
    if (disabled) return;
    const normalized = normalizeCustomRange(customRange, value);
    onChange(normalized);
    setCustomOpen(false);
  };

  const isCustomValid = Boolean(customRange?.from && customRange?.to);

  const currentKey = useMemo(() => getTimeRangeKey(value), [value]);

  return (
    <div className={cn("flex w-full flex-col gap-2 text-left sm:w-auto", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rango temporal</div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = value.preset === preset.value;
          const button = (
            <Button
              key={preset.value}
              type="button"
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={() => handlePresetClick(preset.value)}
              disabled={disabled}
            >
              {preset.label}
            </Button>
          );

          if (preset.value !== "custom") {
            return button;
          }

          return (
            <Popover key={preset.value} open={customOpen} onOpenChange={(open) => !disabled && setCustomOpen(open)}>
              <PopoverTrigger asChild>{button}</PopoverTrigger>
              <PopoverContent align={align} className="w-auto p-3">
                <div className="text-sm font-medium">Seleccionar rango personalizado</div>
                <p className="text-xs text-muted-foreground">Elegí la fecha de inicio y fin para tus gráficos.</p>
                <Separator className="my-3" />
                <Calendar
                  initialFocus
                  mode="range"
                  numberOfMonths={2}
                  selected={customRange}
                  onSelect={(range) => setCustomRange(range)}
                  disabled={disabled}
                />
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCustomOpen(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleApplyCustom} disabled={!isCustomValid}>
                    Aplicar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
        <CalendarIcon className="h-3.5 w-3.5" />
        <span data-range-key={currentKey}>{formatRangeLabel(value)}</span>
      </div>
    </div>
  );
}

