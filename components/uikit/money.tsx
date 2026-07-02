// Денежная типографика: число доминирует, знак валюты приглушён — как в
// банковских приложениях. Единый вид сумм по списку/карточке/закрытиям.

export function Money({
  value,
  size = 'md',
  className = '',
}: {
  value: number | null | undefined;
  /** sm — инлайн в строках, md — карточки списка, lg — крупные итоги */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  if (value == null) {
    return <span className={`text-text3 ${className}`}>—</span>;
  }
  const num =
    size === 'lg' ? 'text-[20px] font-semibold tracking-[-0.01em]'
    : size === 'md' ? 'text-[17px] font-semibold tracking-[-0.01em]'
    : 'text-[14px] font-medium';
  const cur =
    size === 'sm' ? 'text-[12px]' : 'text-[13px]';
  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums ${className}`}>
      <span className={num}>{value.toLocaleString('ru-RU')}</span>
      <span className={`${cur} text-text3 font-medium`}>₽</span>
    </span>
  );
}
