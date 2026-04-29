import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad';

const tones: Record<Tone, string> = {
  neutral: 'border-border text-muted bg-surface',
  accent:  'border-accent/25 text-accent-fg bg-accent/10',
  ok:      'border-ok/25 text-ok bg-ok-soft',
  warn:    'border-warn/25 text-warn bg-warn-soft',
  bad:     'border-bad/25 text-bad bg-bad-soft',
};

const dots: Record<Tone, string> = {
  neutral: 'bg-muted',
  accent:  'bg-accent',
  ok:      'bg-ok',
  warn:    'bg-warn',
  bad:     'bg-bad',
};

export function Pill({
  tone = 'neutral',
  children,
  withDot = true,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  withDot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border',
        'text-[11px] font-medium tracking-tight',
        tones[tone],
        className,
      )}
    >
      {withDot && <span className={cn('w-1.5 h-1.5 rounded-full', dots[tone])} />}
      {children}
    </span>
  );
}
