import { Progress, type ProgressProps } from '../ui';
import { ELEMENT_TONE, MODALITY_TONE, type ChartTone } from '../../lib/chart';
import { useT } from '../../i18n/useT';

type Tone = NonNullable<ProgressProps['tone']>;

function Bars({
  data, total, tones, label, nameOf,
}: {
  data: Record<string, number>;
  total: number;
  tones: Record<string, ChartTone>;
  label: string;
  nameOf: (key: string) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-caption uppercase tracking-wider text-mystic-500">{label}</div>
      {Object.entries(data).map(([key, val]) => {
        const name = nameOf(key);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-16 text-meta text-mystic-300">{name}</span>
            <Progress value={val} max={total} size="md" tone={(tones[key] ?? 'neutral') as Tone} label={name} className="flex-1" />
            <span className="w-8 text-right text-meta text-mystic-400 tabular-nums">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Element and modality counts as bars, tinted from the one chart colour map. */
export function ElementBalance({ elements, modalities }: { elements: Record<string, number>; modalities: Record<string, number> }) {
  const { t } = useT('app');
  const elTotal = Object.values(elements).reduce((a, b) => a + b, 0);
  const modTotal = Object.values(modalities).reduce((a, b) => a + b, 0);
  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <Bars
        data={elements}
        total={elTotal}
        tones={ELEMENT_TONE}
        label={t('chartWheel.legendElements', { defaultValue: 'Elements' })}
        nameOf={(key) => t(`horoscope.birthChartView.elements.${key}`, { defaultValue: key })}
      />
      <Bars
        data={modalities}
        total={modTotal}
        tones={MODALITY_TONE}
        label={t('chartWheel.legendModalities', { defaultValue: 'Modalities' })}
        nameOf={(key) => t(`chartWheel.modalities.${key}`, { defaultValue: key })}
      />
    </div>
  );
}
