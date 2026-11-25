import { useTranslations } from 'next-intl';
import type { WidgetConfig } from '@/utils/dashboardWidgets';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DAY_OPTIONS = [30, 60, 90, 180, 365];
const FORECAST_OPTIONS = [2, 4, 8];
const FORECAST_SHAPES = ['line', 'range'] as const;

// The window in days, how many recent weeks the closing rate is taken from,
// and whether the forecast is drawn as one line or as a range of about ±40% around it.
export default function BurnupWidgetSettings({
  config,
  onConfigChange,
}: {
  config: WidgetConfig;
  onConfigChange: (config: WidgetConfig) => void;
}) {
  const t = useTranslations('dashboards');
  const days = config.days ?? 90;
  const forecastWeeks = config.forecastWeeks ?? 4;
  const forecast = config.forecast ?? 'range';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={String(days)} onValueChange={(v) => onConfigChange({ days: Number(v) })}>
        <SelectTrigger size="sm" className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DAY_OPTIONS.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {t('lastDays', { days: d })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(forecastWeeks)}
        onValueChange={(v) => onConfigChange({ forecastWeeks: Number(v) })}
      >
        <SelectTrigger size="sm" className="w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FORECAST_OPTIONS.map((w) => (
            <SelectItem key={w} value={String(w)}>
              {t('burnup.forecastWeeks', { weeks: w })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={forecast}
        onValueChange={(v) => onConfigChange({ forecast: v as WidgetConfig['forecast'] })}
      >
        <SelectTrigger size="sm" className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FORECAST_SHAPES.map((shape) => (
            <SelectItem key={shape} value={shape}>
              {t(`burnup.forecastShape.${shape}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
