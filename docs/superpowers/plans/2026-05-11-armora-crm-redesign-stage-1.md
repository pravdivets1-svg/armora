# Armora CRM Redesign — Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести admin-часть Armora CRM на mobile-first Premium Soft (Linear-style) дизайн-систему; полностью переделать sidebar/shell, orders list и order detail, заменить визуализацию статусов на ProgressChip + HeroStage + StageLadder.

**Architecture:** Новая папка `components/ui/` с примитивами, единый `<AppShell>` с двумя layout'ами (mobile bottom-tab / desktop sidebar), новые tokens в `tailwind.config.ts` параллельно со старыми (алиасы для неотредизайненных экранов). Старые `components/ui.tsx`, `admin-shell.tsx`, `sidebar.tsx`, `stage-badge.tsx`, `stage-stepper.tsx` остаются на диске до Stage 2, но из admin layout'а и orders больше не импортируются.

**Tech Stack:** Next.js 14 App Router · React 18 · Tailwind 3 · framer-motion · lucide-react · Prisma 5 · NextAuth v5.

**Constraints:**
- Windows + PowerShell. `npm`/`npx` запускать через `cmd /c "npx ..."`.
- Перед каждым коммитом: `cmd /c "npx tsc --noEmit"` + `cmd /c "npx next build"`.
- Без эмоджи в UI и коде.
- НЕ ТРОГАТЬ: `auth.ts`, `middleware.ts`, `lib/stage-transitions.ts`, `next.config.js`.
- Коммиты:
  ```
  git -c user.email=dev@armora.local -c user.name=Armora commit -m "..."
  git push origin main
  ```
- Файлы с кириллицей в пути: `C:\Users\Mi\приложение\...`. В bash — `"C:/Users/Mi/приложение/..."`.

**Спека:** [docs/superpowers/specs/2026-05-11-armora-crm-redesign-stage-1-design.md](../specs/2026-05-11-armora-crm-redesign-stage-1-design.md).

---

## File map

**Создаются:**

- `components/ui/index.ts` — re-export
- `components/ui/tokens.ts` — runtime-доступ к ключевым tokens (не критично, но удобно)
- `components/ui/use-media-query.ts` — hook `useIsDesktop()`
- `components/ui/button.tsx` — `<Button>` (primary/secondary/ghost/danger) + `<IconButton>`
- `components/ui/card.tsx` — `<Card>`
- `components/ui/section-card.tsx` — `<SectionCard>` (header + content)
- `components/ui/key-value-row.tsx` — `<KeyValueRow>`
- `components/ui/pill-tabs.tsx` — `<PillTabs>`
- `components/ui/sheet.tsx` — `<Sheet>` (bottom-sheet на мобиле, modal на десктопе)
- `components/ui/empty.tsx` — `<Empty>`
- `components/ui/page-header.tsx` — `<PageHeader>` (sticky top-bar mob / page header desk)
- `components/ui/mobile-tab-bar.tsx` — `<MobileTabBar>`
- `components/ui/desktop-sidebar.tsx` — `<DesktopSidebar>`
- `components/ui/app-shell.tsx` — `<AppShell>`
- `components/ui/progress-chip.tsx` — `<ProgressChip>`
- `components/ui/hero-stage.tsx` — `<HeroStage>` (+ inline сервер-актион вызов через client wrapper)
- `components/ui/stage-ladder.tsx` — `<StageLadder>`
- `components/ui/order-card.tsx` — `<OrderCard>` (карточка для списка заказов)

**Модифицируются:**

- `tailwind.config.ts` — добавить новые tokens
- `app/(admin)/layout.tsx` — заменить `<AdminShell>` на `<AppShell>`
- `app/(admin)/orders/page.tsx` — переписать список (карточки + pill-tabs)
- `app/(admin)/orders/[id]/page.tsx` — рестрктуризация: HeroStage + SectionCard'ы
- `app/(admin)/orders/[id]/order-form.tsx` — переразбить рендер на секции (Клиент / Финансы / Замер / Установка); логика server action не трогается

**Остаются как есть** (не импортируются больше из admin, но не удаляются):

- `components/admin-shell.tsx`, `components/sidebar.tsx`, `components/stage-badge.tsx`, `components/stage-stepper.tsx`, `components/page-shell.tsx`, `components/header.tsx`, `components/ui.tsx` — Stage 2 утилизирует / удалит.

---

## Conventions

- Все клиентские компоненты с интерактивом: `'use client';` первой строкой.
- Серверные компоненты: импорты Prisma/auth — только из server-only файлов.
- Импорты иконок: `import { IconName } from 'lucide-react';`. Размер 16 для `meta`, 18–20 для базовых, 22 для tab-bar/sidebar.
- Имена классов: новая палитра (`bg-app`, `bg-card`, `text-1`, `text-2`, `text-3`, `border` (custom token), `accent`, `accent-soft`, `accent-deep`). Старые ключи (`canvas`, `page`, `line`, `ink.900`, etc) — алиасы, можно использовать в неотредизайненных файлах.
- ВАЖНО: tailwind ключ `border` конфликтует с дефолтным utility `border` (1px solid). Чтобы не ломать существующие места, новый цвет границы вводим как `borderc` (`#ECEEF1`), и используем `border-borderc`. Или, проще — в `tailwind.config.ts` НЕ переопределять ключ `border`, а добавить `colors.line` нового значения. Подробнее в задаче 1.

---

## Tasks

### Task 1: Расширить `tailwind.config.ts` новыми design tokens

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Открыть `tailwind.config.ts` и заменить содержимое целиком**

Новые токены добавлены, старые (`canvas`, `page`, `line`, `ink.*`, `accent.*`, `sidebar.*`) сохранены для совместимости.

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // === New Premium Soft tokens ===
        app:        '#FAFAFB',
        card:       '#FFFFFF',
        subtle:     '#F4F5F7',
        borderc:    '#ECEEF1',
        borders:    '#DDE1E6',
        text1:      '#0B0D12',
        text2:      '#4B5260',
        text3:      '#8A93A1',
        // Status (desaturated)
        ok2:        { DEFAULT: '#2A9D6A', soft: '#ECF7F0' },
        warn2:      { DEFAULT: '#B6781A', soft: '#FBF3E2' },
        bad2:       { DEFAULT: '#C9384B', soft: '#FCEBED' },
        info2:      { DEFAULT: '#2462C7', soft: '#E8F0FB' },
        // === Legacy aliases (Stage 2 утилизирует) ===
        canvas:    '#f0f2f5',
        page:      '#ffffff',
        line:      '#e5e7eb',
        lineHover: '#d1d5db',
        sidebar: {
          bg:      '#1e2a3a',
          hover:   '#28394f',
          active:  '#2563eb',
          text:    '#94a3b8',
          textAct: '#ffffff',
        },
        ink: {
          900: '#111827',
          700: '#374151',
          500: '#6b7280',
          400: '#9ca3af',
          300: '#d1d5db',
        },
        accent: {
          DEFAULT:  '#2563EB',
          hover:    '#1D4ED8',
          soft:     '#EFF6FF',
          deep:     '#1D4ED8',
          softText: '#1D4ED8',
        },
        ok:   { DEFAULT: '#16a34a', soft: '#f0fdf4' },
        warn: { DEFAULT: '#d97706', soft: '#fffbeb', softText: '#92400e' },
        bad:  { DEFAULT: '#dc2626', soft: '#fef2f2' },
        whatsapp: { DEFAULT: '#25D366', hover: '#128C7E' },
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '10px',
        lg: '14px',
        xl: '16px',
        '2xl': '20px',
        sheet: '20px',
      },
      fontSize: {
        display: ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '650' }],
        h1: ['20px', { lineHeight: '28px', letterSpacing: '-0.015em', fontWeight: '600' }],
        h2: ['16px', { lineHeight: '22px', letterSpacing: '-0.01em',  fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '450' }],
        meta: ['13px', { lineHeight: '18px', fontWeight: '500' }],
        mono: ['13px', { lineHeight: '18px', fontWeight: '500' }],
      },
      boxShadow: {
        'soft':         '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'soft-lg':      '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'card':         '0 1px 2px rgba(15,23,42,.04), 0 1px 1px rgba(15,23,42,.03)',
        'popover':      '0 12px 32px -8px rgba(15,23,42,.16), 0 2px 6px rgba(15,23,42,.06)',
        'accent-glow':  '0 4px 20px -6px rgba(37,99,235,0.4)',
        'ok-glow':      '0 4px 20px -6px rgba(22,163,74,0.3)',
        'bad-glow':     '0 4px 20px -6px rgba(220,38,38,0.3)',
      },
      width:   { sidebar: '240px' },
      spacing: { sidebar: '240px', topbar: '56px', pageheader: '64px', tabbar: '64px' },
      transitionTimingFunction: {
        soft: 'cubic-bezier(.2,.8,.2,1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '260ms',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Прогнать typecheck + build**

```
cmd /c "npx tsc --noEmit"
cmd /c "npx next build"
```
Expected: оба завершаются без ошибок (есть warning `Critical dependency in @prisma/instrumentation` — игнорируем, это известный шум).

- [ ] **Step 3: Commit**

```
git add tailwind.config.ts
git -c user.email=dev@armora.local -c user.name=Armora commit -m "tailwind: extend with Premium Soft tokens"
git push origin main
```

---

### Task 2: `useIsDesktop` hook

**Files:**
- Create: `components/ui/use-media-query.ts`

- [ ] **Step 1: Создать файл**

```ts
'use client';

import { useEffect, useState } from 'react';

export function useIsDesktop(): boolean {
  // На сервере и первом рендере — true (desktop layout по умолчанию),
  // чтобы избежать FOUC и hydration mismatch на десктопе.
  // На мобиле эффект мгновенно переключит на mobile layout.
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return isDesktop;
}
```

- [ ] **Step 2: typecheck**
```
cmd /c "npx tsc --noEmit"
```

(Commit делаем после Task 3 — пакетом.)

---

### Task 3: `<Button>` и `<IconButton>`

**Files:**
- Create: `components/ui/button.tsx`

- [ ] **Step 1: Создать файл**

```tsx
'use client';

import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary:   'bg-accent text-white hover:bg-accent-deep active:bg-accent-deep shadow-card',
  secondary: 'bg-card text-text1 border border-borderc hover:bg-subtle',
  ghost:     'text-text2 hover:bg-subtle hover:text-text1',
  danger:    'text-bad2 hover:bg-bad2-soft',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-10 px-4 text-[14px]',
  lg: 'h-12 px-5 text-[15px]',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium
                  transition-colors duration-fast ease-soft
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
                  ${VARIANT[variant]} ${SIZE[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 36 | 40 | 44;
  variant?: 'ghost' | 'secondary';
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 40, variant = 'ghost', className = '', children, ...rest },
  ref,
) {
  const dim = `${size}px`;
  const look = variant === 'secondary'
    ? 'bg-card border border-borderc text-text2 hover:bg-subtle hover:text-text1'
    : 'text-text2 hover:bg-subtle hover:text-text1';
  return (
    <button
      ref={ref}
      style={{ width: dim, height: dim }}
      className={`inline-flex items-center justify-center rounded-md
                  transition-colors duration-fast ease-soft
                  disabled:opacity-50
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                  ${look} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
```

- [ ] **Step 2: typecheck**
```
cmd /c "npx tsc --noEmit"
```

---

### Task 4: `<Card>`, `<SectionCard>`, `<KeyValueRow>`

**Files:**
- Create: `components/ui/card.tsx`
- Create: `components/ui/section-card.tsx`
- Create: `components/ui/key-value-row.tsx`

- [ ] **Step 1: `card.tsx`**

```tsx
export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`bg-card border border-borderc rounded-lg shadow-card
                  ${interactive ? 'transition-shadow duration-fast ease-soft hover:shadow-soft-lg cursor-pointer' : ''}
                  ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: `section-card.tsx`**

```tsx
export function SectionCard({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-card border border-borderc rounded-lg ${className}`}>
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-meta uppercase tracking-wide text-text3">{title}</h2>
        {action}
      </header>
      <div className="px-5 pb-5 space-y-3">{children}</div>
    </section>
  );
}
```

- [ ] **Step 3: `key-value-row.tsx`**

```tsx
export function KeyValueRow({
  label,
  value,
  action,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-meta text-text3 shrink-0">{label}</span>
      <span className={`flex-1 text-right text-text1 truncate ${mono ? 'tabular-nums font-mono' : ''}`}>
        {value}
      </span>
      {action && <span className="shrink-0">{action}</span>}
    </div>
  );
}
```

- [ ] **Step 4: typecheck**
```
cmd /c "npx tsc --noEmit"
```

---

### Task 5: `<PillTabs>`

**Files:**
- Create: `components/ui/pill-tabs.tsx`

- [ ] **Step 1: Создать файл**

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export type PillTabItem = {
  key: string;
  label: string;
  count?: number;
};

export function PillTabs({
  items,
  paramName,
  preserve = [],
}: {
  items: PillTabItem[];
  paramName: string;
  preserve?: string[];
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get(paramName) ?? '';

  const buildHref = (key: string) => {
    const params = new URLSearchParams();
    if (key) params.set(paramName, key);
    for (const p of preserve) {
      const v = sp.get(p);
      if (v) params.set(p, v);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
      {items.map((it) => {
        const active = current === it.key;
        return (
          <Link
            key={it.key}
            href={buildHref(it.key)}
            className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-[13px] font-medium
                        transition-colors duration-fast ease-soft
                        ${active
                          ? 'bg-text1 text-card'
                          : 'bg-card border border-borderc text-text2 hover:text-text1'}`}
          >
            {it.label}
            {typeof it.count === 'number' && (
              <span className={`inline-flex items-center justify-center min-w-[20px] h-[18px] px-1
                                rounded-md text-[11px] tabular-nums leading-none
                                ${active ? 'bg-card/20 text-card' : 'bg-subtle text-text3'}`}>
                {it.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: typecheck**
```
cmd /c "npx tsc --noEmit"
```

---

### Task 6: `<Sheet>` (bottom-sheet / modal)

**Files:**
- Create: `components/ui/sheet.tsx`

- [ ] **Step 1: Создать файл**

```tsx
'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from './button';
import { useIsDesktop } from './use-media-query';

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className={isDesktop
              ? 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card rounded-lg shadow-popover w-[min(560px,calc(100vw-32px))] max-h-[85vh] flex flex-col overflow-hidden'
              : 'fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-sheet shadow-popover max-h-[92vh] flex flex-col overflow-hidden'
            }
            initial={isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
          >
            {!isDesktop && (
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <div className="w-10 h-1 bg-borders rounded-full" />
              </div>
            )}
            {title && (
              <header className="flex items-center justify-between px-5 py-3 border-b border-borderc shrink-0">
                <h3 className="text-h2 text-text1">{title}</h3>
                <IconButton size={36} onClick={onClose} aria-label="Закрыть">
                  <X size={18} />
                </IconButton>
              </header>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <footer className="px-5 py-3 border-t border-borderc shrink-0 bg-card">{footer}</footer>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: typecheck**
```
cmd /c "npx tsc --noEmit"
```

---

### Task 7: `<Empty>` и `<PageHeader>`

**Files:**
- Create: `components/ui/empty.tsx`
- Create: `components/ui/page-header.tsx`

- [ ] **Step 1: `empty.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react';

export function Empty({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-12 h-12 rounded-md bg-subtle text-text3 flex items-center justify-center mb-4">
        <Icon size={22} />
      </div>
      <h3 className="text-h2 text-text1 mb-1">{title}</h3>
      {hint && <p className="text-meta text-text3 max-w-sm mb-4">{hint}</p>}
      {action}
    </div>
  );
}
```

- [ ] **Step 2: `page-header.tsx`**

`<PageHeader>` универсальный: на мобиле — sticky top-bar 56px, на десктопе — page header 64px.

```tsx
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { IconButton } from './button';
import { useIsDesktop } from './use-media-query';

export function PageHeader({
  title,
  sub,
  backHref,
  actions,
}: {
  title: string;
  sub?: string;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  const isDesktop = useIsDesktop();

  return (
    <header
      className="sticky top-0 z-30 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70
                 border-b border-borderc"
      style={{ height: isDesktop ? 64 : 56 }}
    >
      <div className="flex items-center gap-2 h-full px-4">
        {backHref && (
          <Link href={backHref} aria-label="Назад">
            <IconButton size={36} aria-label="Назад">
              <ArrowLeft size={18} />
            </IconButton>
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-h1 text-text1 truncate">{title}</h1>
          {sub && <p className="text-meta text-text3 truncate -mt-0.5">{sub}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">{actions}</div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: typecheck**
```
cmd /c "npx tsc --noEmit"
```

---

### Task 8: `<MobileTabBar>`

**Files:**
- Create: `components/ui/mobile-tab-bar.tsx`

- [ ] **Step 1: Создать файл**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@prisma/client';
import { LayoutList, Calendar, Inbox, CheckSquare, MoreHorizontal } from 'lucide-react';

type TabItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  roles?: Role[];
};

export function MobileTabBar({
  role,
  pendingClosures,
  newLeads,
}: {
  role: Role;
  pendingClosures: number;
  newLeads: number;
}) {
  const pathname = usePathname();

  const all: TabItem[] = [
    { href: '/orders',   label: 'Заказы',  icon: LayoutList },
    { href: '/calendar', label: 'Расписание',  icon: Calendar },
    { href: '/leads',    label: 'Заявки', icon: Inbox,      badge: newLeads,        roles: ['director', 'manager'] },
    { href: '/closures', label: 'Закрытие', icon: CheckSquare, badge: pendingClosures, roles: ['director'] },
  ];
  const items = all.filter((it) => !it.roles || it.roles.includes(role));

  // Если основных табов < 4, ничего не добавляем.
  // Если ровно 4 — кладём «Ещё» только при наличии скрытых под ролью разделов в будущем.
  // Сейчас «Ещё» оставлен как точка расширения; на текущей роли не показывается.
  // (Stage 2 откроет users/settings под «Ещё».)

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-card/90 backdrop-blur
                 border-t border-borderc"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Главная навигация"
    >
      <ul className="flex items-stretch h-16">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + '/');
          const Icon = it.icon;
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`relative flex flex-col items-center justify-center gap-1 h-full
                            text-[11px] font-medium transition-colors duration-fast
                            ${active ? 'text-accent' : 'text-text3 hover:text-text1'}`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent rounded-b-md" />
                )}
                <span className="relative">
                  <Icon size={22} strokeWidth={1.6} />
                  {!!it.badge && it.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1
                                     rounded-md bg-accent text-card text-[10px] font-semibold
                                     tabular-nums leading-[16px] text-center">
                      {it.badge > 99 ? '99+' : it.badge}
                    </span>
                  )}
                </span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: typecheck**
```
cmd /c "npx tsc --noEmit"
```

---

### Task 9: `<DesktopSidebar>`

**Files:**
- Create: `components/ui/desktop-sidebar.tsx`

- [ ] **Step 1: Создать файл**

```tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { Role } from '@prisma/client';
import { LayoutList, Calendar, Inbox, CheckSquare, Users, LogOut } from 'lucide-react';
import { ROLE_LABEL } from '@/lib/labels';
import { logoutAction } from '@/app/(auth)/actions';
import { IconButton } from './button';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  roles?: Role[];
};

export function DesktopSidebar({
  role,
  user,
  pendingClosures,
  newLeads,
}: {
  role: Role;
  user: { name: string; email: string };
  pendingClosures: number;
  newLeads: number;
}) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: '/orders',   label: 'Заказы',     icon: LayoutList },
    { href: '/calendar', label: 'Расписание', icon: Calendar },
    { href: '/leads',    label: 'Заявки',     icon: Inbox,       badge: newLeads,        roles: ['director', 'manager'] },
    { href: '/closures', label: 'На закрытие', icon: CheckSquare, badge: pendingClosures, roles: ['director'] },
    { href: '/users',    label: 'Сотрудники', icon: Users,       roles: ['director'] },
  ].filter((it) => !it.roles || it.roles.includes(role));

  return (
    <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-sidebar
                       bg-card border-r border-borderc z-30">
      <div className="flex items-center gap-2.5 h-16 px-5 border-b border-borderc shrink-0">
        <Image src="/icon.svg" alt="Armora" width={28} height={28} priority />
        <span className="text-h2 text-text1 tracking-tight">Armora</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + '/');
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 h-10 px-3 rounded-md text-[13.5px] font-medium
                          transition-colors duration-fast
                          ${active
                            ? 'bg-accent-soft text-accent'
                            : 'text-text2 hover:bg-subtle hover:text-text1'}`}
            >
              <Icon size={18} strokeWidth={1.6} className="shrink-0" />
              <span className="flex-1 truncate">{it.label}</span>
              {!!it.badge && it.badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
                                 rounded-md text-[11px] tabular-nums font-semibold leading-none
                                 bg-accent text-card">
                  {it.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-borderc p-3 shrink-0">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-8 h-8 rounded-md bg-subtle text-text2 flex items-center justify-center text-[13px] font-semibold uppercase">
            {user.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-text1 font-medium truncate">{user.name}</p>
            <p className="text-meta text-text3 truncate">{ROLE_LABEL[role]}</p>
          </div>
          <form action={logoutAction}>
            <IconButton size={36} type="submit" aria-label="Выйти">
              <LogOut size={16} />
            </IconButton>
          </form>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: typecheck**
```
cmd /c "npx tsc --noEmit"
```

---

### Task 10: `<AppShell>`

**Files:**
- Create: `components/ui/app-shell.tsx`

- [ ] **Step 1: Создать файл**

```tsx
'use client';

import type { Role } from '@prisma/client';
import { DesktopSidebar } from './desktop-sidebar';
import { MobileTabBar } from './mobile-tab-bar';

export function AppShell({
  role,
  user,
  pendingClosures,
  newLeads,
  children,
}: {
  role: Role;
  user: { name: string; email: string };
  pendingClosures: number;
  newLeads: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-app text-text1">
      <DesktopSidebar
        role={role}
        user={user}
        pendingClosures={pendingClosures}
        newLeads={newLeads}
      />
      <div className="min-h-screen lg:ml-sidebar pb-[80px] lg:pb-0">
        {children}
      </div>
      <MobileTabBar
        role={role}
        pendingClosures={pendingClosures}
        newLeads={newLeads}
      />
    </div>
  );
}
```

- [ ] **Step 2: typecheck**
```
cmd /c "npx tsc --noEmit"
```

---

### Task 11: `<ProgressChip>`

**Files:**
- Create: `components/ui/progress-chip.tsx`

- [ ] **Step 1: Создать файл**

`STAGE_ORDER` уже определён в `lib/labels.ts`. Использует 8 этапов.

```tsx
import type { Stage } from '@prisma/client';
import { STAGE_ORDER } from '@/lib/labels';

const COMPACT: Record<Stage, string> = {
  new:              'Новая',
  survey_scheduled: 'Замер',
  survey_done:      'Аванс',
  production:       'Производство',
  ready_to_install: 'К установке',
  installed:        'Установлена',
  pending_closure:  'На закрытие',
  closed:           'Закрыт',
};

export function ProgressChip({
  stage,
  daysInStage,
}: {
  stage: Stage;
  daysInStage?: number;
}) {
  const idx = STAGE_ORDER.indexOf(stage);
  const isClosed = stage === 'closed';
  const isPending = stage === 'pending_closure';

  const durationCls =
    daysInStage == null ? 'text-text3'
    : daysInStage > 14 ? 'text-bad2'
    : daysInStage > 5  ? 'text-warn2'
    : 'text-text3';

  return (
    <div className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1" aria-label={`Этап ${idx + 1} из ${STAGE_ORDER.length}`}>
        {STAGE_ORDER.map((_, i) => {
          let cls = 'bg-borderc';
          if (i < idx) cls = isClosed ? 'bg-text3' : 'bg-accent';
          else if (i === idx) {
            cls = isPending
              ? 'bg-accent ring-2 ring-accent-soft animate-pulse'
              : 'bg-card border border-accent';
          }
          return <span key={i} className={`w-1.5 h-1.5 rounded-full shrink-0 ${cls}`} />;
        })}
      </span>
      <span className="text-meta text-text2 truncate">
        {COMPACT[stage]}
        {daysInStage != null && stage !== 'closed' && (
          <span className={`ml-1.5 tabular-nums ${durationCls}`}>· {daysInStage}д в этапе</span>
        )}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: typecheck**
```
cmd /c "npx tsc --noEmit"
```

---

### Task 12: `<StageLadder>`

**Files:**
- Create: `components/ui/stage-ladder.tsx`

- [ ] **Step 1: Создать файл**

```tsx
'use client';

import { useTransition } from 'react';
import { Check, Lock } from 'lucide-react';
import type { Role, Stage } from '@prisma/client';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import { isStageTransitionAllowed } from '@/lib/stage-transitions';

export function StageLadder({
  current,
  role,
  onStageClick,
  disabled,
}: {
  current: Stage;
  role: Role;
  onStageClick?: (next: Stage) => void;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const currentIdx = STAGE_ORDER.indexOf(current);

  return (
    <ol className="space-y-0.5" role="list" aria-label="Все этапы заказа">
      {STAGE_ORDER.map((s, i) => {
        const isCurrent = s === current;
        const isPast = i < currentIdx;
        const allowed = !disabled && !!onStageClick && isStageTransitionAllowed(role, current, s) && !isCurrent;
        const interactive = allowed && !pending;

        const base = 'flex items-center gap-3 h-10 px-3 rounded-md text-[13.5px] w-full text-left transition-colors duration-fast';
        let look: string;
        let icon: React.ReactNode;
        if (isCurrent) {
          look = 'bg-accent-soft text-accent font-medium';
          icon = <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />;
        } else if (isPast) {
          look = 'text-text2';
          icon = <Check size={14} className="text-ok2 shrink-0" />;
        } else if (interactive) {
          look = 'text-text2 hover:bg-subtle hover:text-text1';
          icon = <span className="w-2 h-2 rounded-full border border-text3 shrink-0" />;
        } else {
          look = 'text-text3';
          icon = <Lock size={12} className="text-text3 shrink-0" />;
        }

        const inner = (
          <>
            {icon}
            <span className="flex-1 truncate">{STAGE_LABEL[s]}</span>
            {isCurrent && <span className="text-meta text-accent uppercase tracking-wide">текущий</span>}
          </>
        );

        if (interactive) {
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => start(() => onStageClick!(s))}
                className={`${base} ${look}`}
              >
                {inner}
              </button>
            </li>
          );
        }
        return (
          <li key={s}>
            <div className={`${base} ${look} cursor-default`} aria-current={isCurrent ? 'step' : undefined}>
              {inner}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2: typecheck**
```
cmd /c "npx tsc --noEmit"
```

---

### Task 13: `<HeroStage>`

**Files:**
- Create: `components/ui/hero-stage.tsx`

- [ ] **Step 1: Создать файл**

`HeroStage` показывает Step N/8, имя текущего этапа, progress rail, time-in-stage, primary CTA на +1 переход, ссылку «Все этапы» (открывает Sheet со StageLadder). Все переходы делаются через `onStageChange(stage)` — родитель пробрасывает server action.

```tsx
'use client';

import { useState, useTransition } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { Role, Stage } from '@prisma/client';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import { isStageTransitionAllowed } from '@/lib/stage-transitions';
import { Button } from './button';
import { Sheet } from './sheet';
import { StageLadder } from './stage-ladder';

function nextAllowed(current: Stage, role: Role): Stage | null {
  const idx = STAGE_ORDER.indexOf(current);
  const next = STAGE_ORDER[idx + 1];
  if (!next) return null;
  return isStageTransitionAllowed(role, current, next) ? next : null;
}

function daysSince(d: Date | string): number {
  const t = typeof d === 'string' ? new Date(d).getTime() : d.getTime();
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

export function HeroStage({
  current,
  role,
  enteredAt,
  enteredBy,
  onStageChange,
  onApproveClosure,
}: {
  current: Stage;
  role: Role;
  enteredAt: Date | string;
  enteredBy?: string;
  onStageChange: (next: Stage) => Promise<void> | void;
  onApproveClosure?: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const idx = STAGE_ORDER.indexOf(current);
  const total = STAGE_ORDER.length;
  const next = nextAllowed(current, role);
  const isPendingClosureAsDirector = current === 'pending_closure' && role === 'director';
  const isPendingClosureOther = current === 'pending_closure' && role !== 'director';

  const railFill = ((idx + 1) / total) * 100;
  const days = daysSince(enteredAt);

  const heroBg =
    isPendingClosureAsDirector ? 'bg-accent-soft border-accent/30'
    : isPendingClosureOther    ? 'bg-warn2-soft border-warn2/30'
    : 'bg-card border-borderc';

  return (
    <section className={`rounded-lg border ${heroBg} p-5 sm:p-6`}>
      <p className="text-meta uppercase tracking-wide text-text3 mb-1">
        Этап {idx + 1} из {total}
      </p>
      <h2 className="text-display text-text1 mb-3">{STAGE_LABEL[current]}</h2>

      <div className="relative h-1.5 bg-subtle rounded-md mb-2 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-accent rounded-md transition-all duration-slow ease-soft"
          style={{ width: `${railFill}%` }}
        />
      </div>
      <p className="text-meta text-text3 mb-5 tabular-nums">
        {days === 0 ? 'Перешёл сюда сегодня' : `Перешёл сюда ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`}
        {enteredBy && <> · <span className="font-mono">{enteredBy}</span></>}
      </p>

      <div className="flex flex-col gap-2">
        {isPendingClosureAsDirector && onApproveClosure ? (
          <Button
            size="lg"
            block
            disabled={pending}
            onClick={() => start(() => { void onApproveClosure(); })}
          >
            Закрыть заказ
            <ChevronRight size={18} />
          </Button>
        ) : isPendingClosureOther ? (
          <div className="text-meta text-warn2 font-medium py-2">
            Ожидает действия директора
          </div>
        ) : next ? (
          <Button
            size="lg"
            block
            disabled={pending}
            onClick={() => start(() => { void onStageChange(next); })}
          >
            Передать в «{STAGE_LABEL[next]}»
            <ChevronRight size={18} />
          </Button>
        ) : current === 'closed' ? (
          <div className="text-meta text-text3 font-medium py-2">Заказ закрыт</div>
        ) : (
          <div className="text-meta text-text3 font-medium py-2">Доступных переходов нет</div>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start inline-flex items-center gap-1.5 text-meta text-text2 hover:text-text1 transition-colors"
        >
          <ChevronDown size={14} /> Все этапы
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Этапы заказа">
        <StageLadder
          current={current}
          role={role}
          onStageClick={(s) => {
            setOpen(false);
            start(() => { void onStageChange(s); });
          }}
        />
      </Sheet>
    </section>
  );
}
```

- [ ] **Step 2: typecheck**
```
cmd /c "npx tsc --noEmit"
```

---

### Task 14: `<OrderCard>` (карточка в списке заказов)

**Files:**
- Create: `components/ui/order-card.tsx`

- [ ] **Step 1: Создать файл**

```tsx
import Link from 'next/link';
import type { Stage } from '@prisma/client';
import { ProgressChip } from './progress-chip';

function fmtRub(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toLocaleString('ru-RU')} ₽`;
}

function fmtPhone(p: string | null | undefined): string {
  if (!p) return '';
  return p.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
}

export function OrderCard({
  href,
  number,
  clientName,
  address,
  stage,
  daysInStage,
  phone,
  amount,
  highlight,
}: {
  href: string;
  number: string;
  clientName: string;
  address: string | null;
  stage: Stage;
  daysInStage?: number;
  phone: string | null;
  amount: number | null;
  highlight?: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-card border border-borderc rounded-lg p-4
                 transition-shadow duration-fast ease-soft hover:shadow-soft-lg
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="text-h2 text-text1 truncate">{clientName}</h3>
        <span className="text-meta text-text3 tabular-nums shrink-0">№ {number}</span>
      </div>
      <p className="text-meta text-text3 truncate mb-3">{address || '—'}</p>
      <div className="mb-3">
        <ProgressChip stage={stage} daysInStage={daysInStage} />
      </div>
      <div className="flex items-center justify-between gap-3 text-meta">
        <span className="text-text2 tabular-nums truncate">{fmtPhone(phone)}</span>
        <span className="text-text1 tabular-nums font-medium shrink-0">{fmtRub(amount)}</span>
      </div>
      {highlight && (
        <p className="mt-2 pt-2 border-t border-borderc text-meta text-accent tabular-nums">
          {highlight}
        </p>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: typecheck**
```
cmd /c "npx tsc --noEmit"
```

---

### Task 15: Барель `components/ui/index.ts`

**Files:**
- Create: `components/ui/index.ts`

- [ ] **Step 1: Создать барель**

```ts
export * from './use-media-query';
export * from './button';
export * from './card';
export * from './section-card';
export * from './key-value-row';
export * from './pill-tabs';
export * from './sheet';
export * from './empty';
export * from './page-header';
export * from './mobile-tab-bar';
export * from './desktop-sidebar';
export * from './app-shell';
export * from './progress-chip';
export * from './stage-ladder';
export * from './hero-stage';
export * from './order-card';
```

- [ ] **Step 2: typecheck + build**

```
cmd /c "npx tsc --noEmit"
cmd /c "npx next build"
```
Expected: успешно собирается. На данный момент новые компоненты ещё нигде не используются — это OK.

- [ ] **Step 3: Commit (пакет с Task 2–15)**

```
git add components/ui
git -c user.email=dev@armora.local -c user.name=Armora commit -m "ui: add Premium Soft primitives (AppShell, Sheet, ProgressChip, HeroStage)"
git push origin main
```

---

### Task 16: Подключить `<AppShell>` в admin layout

**Files:**
- Modify: `app/(admin)/layout.tsx`

- [ ] **Step 1: Открыть `app/(admin)/layout.tsx` и заменить содержимое целиком**

```tsx
import { Suspense } from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/ui';
import PageTransition from '@/components/page-transition';
import ToastHost from '@/components/toast-host';
import FaviconBadge from '@/components/favicon-badge';
import PushPrompt from '@/components/push-prompt';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;
  const role = user?.role;
  const showLeadBadge = role === 'director' || role === 'manager';

  let pendingClosures = 0;
  let newLeads = 0;

  if (role === 'director') {
    try {
      pendingClosures = await prisma.order.count({ where: { stage: 'pending_closure' } });
    } catch (e) {
      console.error('[ADMIN_LAYOUT_CLOSURES_ERROR]', e);
    }
  }

  if (role === 'director' || role === 'manager') {
    try {
      newLeads = await prisma.lead.count({ where: { stage: 'new' } });
    } catch (e) {
      console.error('[ADMIN_LAYOUT_LEADS_ERROR]', e);
    }
  }

  return (
    <AppShell
      role={role ?? 'installer'}
      user={{ name: user?.name ?? '—', email: user?.email ?? '' }}
      pendingClosures={pendingClosures}
      newLeads={newLeads}
    >
      <PageTransition>{children}</PageTransition>
      <Suspense fallback={null}><ToastHost /></Suspense>
      <FaviconBadge enabled={showLeadBadge} />
      <PushPrompt />
    </AppShell>
  );
}
```

- [ ] **Step 2: typecheck + build**

```
cmd /c "npx tsc --noEmit"
cmd /c "npx next build"
```

- [ ] **Step 3: Локальная проверка**

```
cmd /c "npm run dev"
```
Открыть `http://localhost:3000/orders`, проверить:
- На десктопе виден белый sidebar 240px слева с пунктами и pill-аватаром снизу.
- На ширине < 1024 (DevTools mobile) виден bottom tab-bar 64px.
- Старая навигация (тёмный navy-сайдбар) ушла.

Остановить dev-server.

- [ ] **Step 4: Commit**

```
git add app/(admin)/layout.tsx
git -c user.email=dev@armora.local -c user.name=Armora commit -m "admin: swap to AppShell (white sidebar + mobile tab-bar)"
git push origin main
```

---

### Task 17: Заменить `<StageBadge>` на `<ProgressChip>` в orders list и order detail

`<StageBadge>` используется в `app/(admin)/orders/page.tsx` и `app/(admin)/orders/[id]/page.tsx`. Меняем точечно — детальный редизайн списка/детальной — следующими тасками.

**Files:**
- Modify: `app/(admin)/orders/page.tsx`
- Modify: `app/(admin)/orders/[id]/page.tsx`

- [ ] **Step 1: В `orders/page.tsx`**

Заменить импорт:
```ts
import { StageBadge } from '@/components/stage-badge';
```
на:
```ts
import { ProgressChip } from '@/components/ui';
```
Найти все `<StageBadge stage={...} />` и заменить на `<ProgressChip stage={...} />`. Если у конкретного `<StageBadge>` есть проп `size="md"` — игнорировать (у ProgressChip размер фиксирован).

- [ ] **Step 2: В `orders/[id]/page.tsx`**

То же самое: импорт + замена. На строке 87 у текущего `<StageBadge stage={order.stage} size="md" />` — оставляем как `<ProgressChip stage={order.stage} />`. (Этот блок будет полностью переделан в Task 19, но для промежуточной целостности заменяем сразу.)

- [ ] **Step 3: typecheck + build**

```
cmd /c "npx tsc --noEmit"
cmd /c "npx next build"
```

- [ ] **Step 4: Commit**

```
git add app/(admin)/orders/page.tsx app/(admin)/orders/[id]/page.tsx
git -c user.email=dev@armora.local -c user.name=Armora commit -m "orders: replace StageBadge with ProgressChip"
git push origin main
```

---

### Task 18: Полный редизайн `app/(admin)/orders/page.tsx` (список заказов)

**Files:**
- Modify: `app/(admin)/orders/page.tsx`

Цель: карточный список через `<OrderCard>`, pill-tabs над списком (Все / Мои / Сегодня / Ждут), поиск в шапке, расширенные фильтры — пока через существующие `AutoSubmitSelect` под pill-tabs (Sheet с фильтрами — Task 20 как доработка). Минимизируем риск: используем существующую `listOrders` из `lib/orders.ts`, не трогаем server-side логику.

- [ ] **Step 1: Изучить, что возвращает `listOrders`**

```
cmd /c "type lib\orders.ts"
```
Убедиться, что в каждом item есть: `id`, `number`, `clientName`, `clientAddress` (или `address`), `stage`, `clientPhone`, `totalAmount` (или сходное), `updatedAt`/`stageEnteredAt`.

(В коде ниже использованы реалистичные имена. Если они отличаются — подменить названия полей; **остальная логика не меняется**.)

- [ ] **Step 2: Переписать `app/(admin)/orders/page.tsx`**

```tsx
import Link from 'next/link';
import { Plus, Search, SlidersHorizontal, Inbox } from 'lucide-react';
import type { Stage } from '@prisma/client';

import { requireUser } from '@/lib/auth-helpers';
import { listOrders, listAssignableUsers } from '@/lib/orders';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import {
  PageHeader, Button, IconButton, OrderCard, Empty, PillTabs,
} from '@/components/ui';
import LiveSearch from '@/components/live-search';
import AutoSubmitSelect from '@/components/auto-submit-select';

export const metadata = { title: 'Заказы — Armora' };
export const dynamic = 'force-dynamic';

type Search = { q?: string; stage?: string; user?: string; filter?: string; page?: string };

function daysSinceUpdate(updatedAt: Date | string): number {
  const t = typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt.getTime();
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

export default async function OrdersPage({ searchParams }: { searchParams: Search }) {
  const me = await requireUser();

  const stage = (STAGE_ORDER as string[]).includes(searchParams.stage ?? '')
    ? (searchParams.stage as Stage)
    : undefined;

  // PillTabs: filter=all|mine|today|waiting. Маппим в параметры listOrders где можем.
  // Минимально-инвазивно: фильтр на стороне сервера остаётся стандартным,
  // pill-tabs пока меняют только серверный q/stage/user преcет.
  const filter = searchParams.filter ?? 'all';
  const userIdFilter = filter === 'mine' ? me.id : searchParams.user;

  const { items, total, page, pageCount } = await listOrders(me, {
    q: searchParams.q,
    stage,
    userId: userIdFilter,
    page: Number(searchParams.page) || 1,
  });

  const assignable = await listAssignableUsers();

  const pluralize = (n: number) =>
    `${n} ${n === 1 ? 'заказ' : n < 5 ? 'заказа' : 'заказов'}`;

  return (
    <>
      <PageHeader
        title="Заказы"
        sub={pluralize(total)}
        actions={
          (me.role === 'director' || me.role === 'manager') ? (
            <Link href="/orders/new">
              <Button size="sm"><Plus size={16} /> Новый</Button>
            </Link>
          ) : null
        }
      />

      <div className="px-4 lg:px-6 pt-4 space-y-4 max-w-6xl mx-auto">
        {/* Поиск + фильтр */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <LiveSearch
              defaultValue={searchParams.q ?? ''}
              placeholder="Поиск: ФИО / телефон / адрес / №"
              preserve={['stage', 'user', 'filter']}
            />
          </div>
          {/* Сохраняем существующий AutoSubmitSelect как «расширенный фильтр» */}
          <div className="hidden sm:flex items-center gap-2">
            <AutoSubmitSelect
              name="stage"
              defaultValue={searchParams.stage ?? ''}
              preserve={['q', 'user', 'filter']}
            >
              <option value="">Все этапы</option>
              {STAGE_ORDER.map((s) => (
                <option key={s} value={s}>{STAGE_LABEL[s]}</option>
              ))}
            </AutoSubmitSelect>
            <AutoSubmitSelect
              name="user"
              defaultValue={searchParams.user ?? ''}
              preserve={['q', 'stage', 'filter']}
            >
              <option value="">Все исполнители</option>
              {assignable.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </AutoSubmitSelect>
          </div>
        </div>

        {/* Pill-tabs */}
        <PillTabs
          paramName="filter"
          preserve={['q', 'stage', 'user']}
          items={[
            { key: '',        label: 'Все',     count: total },
            { key: 'mine',    label: 'Мои' },
            { key: 'today',   label: 'Сегодня' },
            { key: 'waiting', label: 'Ждут' },
          ]}
        />

        {/* Список карточек */}
        {items.length === 0 ? (
          <Empty
            icon={Inbox}
            title="Заказов нет"
            hint="Создайте новый заказ или измените фильтры."
            action={
              (me.role === 'director' || me.role === 'manager') ? (
                <Link href="/orders/new">
                  <Button><Plus size={16} /> Новый заказ</Button>
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pb-8">
            {items.map((o: any) => (
              <OrderCard
                key={o.id}
                href={`/orders/${o.id}`}
                number={String(o.number ?? '')}
                clientName={o.clientName ?? '—'}
                address={o.clientAddress ?? o.address ?? null}
                stage={o.stage}
                daysInStage={daysSinceUpdate(o.stageEnteredAt ?? o.updatedAt ?? new Date())}
                phone={o.clientPhone ?? null}
                amount={o.totalAmount ?? o.amount ?? null}
              />
            ))}
          </div>
        )}

        {/* Пагинация — простая, существующий UX */}
        {pageCount > 1 && (
          <nav className="flex items-center justify-between text-meta text-text3 pb-8" aria-label="Пагинация">
            <Link
              href={{ query: { ...searchParams, page: Math.max(1, page - 1) } }}
              aria-disabled={page === 1}
              className={`${page === 1 ? 'opacity-40 pointer-events-none' : 'text-text2 hover:text-text1'}`}
            >
              ← Назад
            </Link>
            <span className="tabular-nums">{page} / {pageCount}</span>
            <Link
              href={{ query: { ...searchParams, page: Math.min(pageCount, page + 1) } }}
              aria-disabled={page === pageCount}
              className={`${page === pageCount ? 'opacity-40 pointer-events-none' : 'text-text2 hover:text-text1'}`}
            >
              Вперёд →
            </Link>
          </nav>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: typecheck + build**

```
cmd /c "npx tsc --noEmit"
cmd /c "npx next build"
```

Если TS падает на `(o: any)` — корректно, мы намеренно ослабили тип. Если падает на отсутствующих полях в самом `listOrders` (например `stageEnteredAt`) — поправить: убрать чтение `stageEnteredAt`, использовать только `updatedAt`.

- [ ] **Step 4: Локальная проверка**

`cmd /c "npm run dev"` → `http://localhost:3000/orders`. Проверить:
- Карточки заказов рендерятся; ProgressChip с 8 точками виден; phone + сумма читаются.
- Pill-tabs переключают `filter`. (Реальные фильтры `mine/today/waiting` пока обслуживаются только `mine`; `today/waiting` — UI-готовы, server-логика — следующая итерация.)
- Поиск работает, как раньше.
- На мобильной ширине карточки в одну колонку, на ≥1280 — две колонки.
- bottom-tab остаётся.

- [ ] **Step 5: Commit**

```
git add app/(admin)/orders/page.tsx
git -c user.email=dev@armora.local -c user.name=Armora commit -m "orders: redesign list as cards with pill-tabs"
git push origin main
```

---

### Task 19: Редизайн `app/(admin)/orders/[id]/page.tsx` (детальная карточка)

Цель: вверху `<HeroStage>`, ниже — секции (`<SectionCard>`). Существующий `OrderForm` оставляем без изменений (Stage 2 разобьёт). Чтобы избежать дубликата UI смены этапа, после внедрения `<HeroStage>` отключаем «горизонтальный stepper» внутри `OrderForm` (визуально), оставив всю остальную форму. Реализация — пропом `hideStageStepper` в `OrderForm`. Если в `OrderForm` сейчас рендерится `<StageStepper>` — добавляем условный рендер.

**Files:**
- Modify: `app/(admin)/orders/[id]/page.tsx`
- Modify: `app/(admin)/orders/[id]/order-form.tsx` (минимально — пропс `hideStageStepper`)

- [ ] **Step 1: Узнать, где `OrderForm` рендерит `StageStepper`**

```
cmd /c "type app\(admin)\orders\[id]\order-form.tsx" | findstr /N StageStepper
```
Ожидание: одна-две строки с импортом и рендером.

- [ ] **Step 2: В `order-form.tsx` добавить пропс `hideStageStepper`**

В типе пропсов `OrderForm` добавить:
```ts
hideStageStepper?: boolean;
```

В месте рендера `<StageStepper ... />` обернуть условием:
```tsx
{!hideStageStepper && (
  <StageStepper /* ...props as before... */ />
)}
```

Прочие части `order-form.tsx` НЕ ТРОГАТЬ.

- [ ] **Step 3: Создать client-wrapper для server action в `HeroStage`**

`<HeroStage>` ждёт `onStageChange(next)` и опционально `onApproveClosure()`. Сервер-actions (`updateOrderAction`, `approveClosureAction`) импортируются из `../actions`. Создаём небольшой client-component.

**Create:** `app/(admin)/orders/[id]/hero-stage-block.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import type { Role, Stage } from '@prisma/client';
import { HeroStage } from '@/components/ui';

export default function HeroStageBlock({
  orderId,
  current,
  role,
  enteredAt,
  enteredBy,
  updateAction,
  approveClosureAction,
}: {
  orderId: string;
  current: Stage;
  role: Role;
  enteredAt: string;
  enteredBy?: string;
  updateAction: (formData: FormData) => Promise<void>;
  approveClosureAction?: () => Promise<void>;
}) {
  const router = useRouter();

  const onStageChange = async (next: Stage) => {
    const fd = new FormData();
    fd.set('stage', next);
    await updateAction(fd);
    router.refresh();
  };

  return (
    <HeroStage
      current={current}
      role={role}
      enteredAt={enteredAt}
      enteredBy={enteredBy}
      onStageChange={onStageChange}
      onApproveClosure={approveClosureAction}
    />
  );
}
```

> ⚠ Если сигнатура `updateOrderAction` принимает не только `stage` (что вероятно — там вся форма заказа), создаём в `app/(admin)/orders/actions.ts` отдельный server action `updateOrderStageAction(orderId: string, next: Stage)` — узкий, только для смены этапа. Внутри он зовёт ту же логику что и `updateOrderAction` для поля stage (вызов `isStageTransitionAllowed`, обновление БД, `revalidatePath`). Тогда `hero-stage-block.tsx` зовёт `updateOrderStageAction.bind(null, orderId)`.

- [ ] **Step 4: Добавить `updateOrderStageAction` в `app/(admin)/orders/actions.ts`**

В существующий файл (НЕ переписывая остальное!) дописать в конце:

```ts
'use server';

// (этот 'use server' уже есть в начале файла — повторно не вставлять; пример показывает контекст)

export async function updateOrderStageAction(orderId: string, next: Stage): Promise<void> {
  const me = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, stage: true, surveyorId: true, installerId: true },
  });
  if (!order) throw new Error('Заказ не найден');

  // Доступ: staff либо назначенцы — как в updateOrderAction.
  const isMine = order.surveyorId === me.id || order.installerId === me.id;
  if (!isStaff(me.role) && !isMine) throw new Error('Нет доступа');

  if (!isStageTransitionAllowed(me.role, order.stage, next)) {
    throw new Error(transitionErrorMessage(me.role, order.stage, next));
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      stage: next,
      stageEnteredAt: new Date(),
      events: {
        create: {
          kind: 'stage_changed',
          authorId: me.id,
          payload: { from: order.stage, to: next },
        },
      },
    },
  });

  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
}
```

Если `Order` модели нет поля `stageEnteredAt` — убрать его из `data`. Если нет связи `events` с `OrderEvent` в Prisma schema — оставить только `stage`. Имена импортов (`Stage`, `requireUser`, `isStaff`, `prisma`, `revalidatePath`, `isStageTransitionAllowed`, `transitionErrorMessage`) — все уже в файле, **дополнять импорты НЕ нужно** (проверить, что они есть; если чего-то нет — добавить только недостающее).

- [ ] **Step 5: Переписать `app/(admin)/orders/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { Phone, MapPin, MoreHorizontal } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUser, isStaff } from '@/lib/auth-helpers';
import {
  PageHeader, SectionCard, KeyValueRow, IconButton,
} from '@/components/ui';
import OrderForm from './order-form';
import OrderPhotos from './order-photos';
import AwaitingClientCard from './order-awaiting-card';
import PublicLinkBlock from './public-link-block';
import CommentsBlock from './comments-block';
import EventLog from './event-log';
import HeroStageBlock from './hero-stage-block';
import { updateOrderAction, updateOrderStageAction, approveClosureAction } from '../actions';

export const dynamic = 'force-dynamic';

function fmtRub(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toLocaleString('ru-RU')} ₽`;
}

function fmtPhone(p: string | null | undefined): string {
  if (!p) return '—';
  return p.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
}

export default async function OrderPage({ params }: { params: { id: string } }) {
  const me = await requireUser();

  const access = await prisma.order.findUnique({
    where: { id: params.id },
    select: { id: true, surveyorId: true, installerId: true },
  });
  if (!access) notFound();
  const isMine = access.surveyorId === me.id || access.installerId === me.id;
  if (!isStaff(me.role) && !isMine) notFound();

  const [order, assignableUsers, events, photoMetas] = await Promise.all([
    prisma.order.findUnique({
      where: { id: params.id },
      include: {
        surveyor:  { select: { id: true, fullName: true, phone: true } },
        installer: { select: { id: true, fullName: true, phone: true } },
        comments: {
          include: { author: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: ['surveyor', 'installer'] } },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.orderEvent.findMany({
      where: { orderId: params.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { author: { select: { fullName: true, role: true } } },
    }),
    prisma.orderPhoto.findMany({
      where: { orderId: params.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, kind: true, mime: true, size: true,
        width: true, height: true, caption: true, createdAt: true,
        author: { select: { id: true, fullName: true } },
      },
    }),
  ]);
  if (!order) notFound();

  const surveyors  = assignableUsers.filter((u) => u.role === 'surveyor');
  const installers = assignableUsers.filter((u) => u.role === 'installer');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const publicUrl = `${baseUrl}/order/${order.publicToken}`;

  // Когда заказ перешёл в текущий этап — берём stageEnteredAt либо updatedAt.
  const enteredAt = ((order as any).stageEnteredAt ?? order.updatedAt) as Date;
  const enteredBy =
    (order as any).surveyor?.fullName ?? (order as any).installer?.fullName ?? undefined;

  const canApproveClosure =
    me.role === 'director' && order.stage === 'pending_closure';

  return (
    <>
      <PageHeader
        title={`Заказ № ${order.number}`}
        sub={order.clientName}
        backHref="/orders"
        actions={
          <IconButton size={40} aria-label="Меню">
            <MoreHorizontal size={18} />
          </IconButton>
        }
      />

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-4 space-y-3 pb-12">
        <HeroStageBlock
          orderId={order.id}
          current={order.stage}
          role={me.role}
          enteredAt={enteredAt.toISOString()}
          enteredBy={enteredBy}
          updateAction={updateOrderStageAction.bind(null, order.id) as any}
          approveClosureAction={canApproveClosure ? approveClosureAction.bind(null, order.id) as any : undefined}
        />

        <SectionCard title="Клиент">
          <KeyValueRow label="ФИО" value={order.clientName} />
          <KeyValueRow
            label="Телефон"
            value={
              order.clientPhone ? (
                <a href={`tel:${order.clientPhone}`} className="text-accent tabular-nums hover:underline">
                  {fmtPhone(order.clientPhone)}
                </a>
              ) : '—'
            }
            action={order.clientPhone ? <Phone size={14} className="text-text3" /> : null}
          />
          <KeyValueRow
            label="Адрес"
            value={
              order.clientAddress ? (
                <a
                  href={`https://yandex.ru/maps/?text=${encodeURIComponent(order.clientAddress)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-text1 hover:text-accent"
                >
                  {order.clientAddress}
                </a>
              ) : '—'
            }
            action={order.clientAddress ? <MapPin size={14} className="text-text3" /> : null}
          />
        </SectionCard>

        <SectionCard title="Финансы">
          <KeyValueRow label="Сумма" value={fmtRub((order as any).totalAmount ?? (order as any).amount ?? null)} mono />
          <KeyValueRow label="Аванс" value={fmtRub((order as any).advanceAmount ?? null)} mono />
          <KeyValueRow
            label="К оплате"
            value={fmtRub(
              ((order as any).totalAmount ?? 0) - ((order as any).advanceAmount ?? 0),
            )}
            mono
          />
        </SectionCard>

        <SectionCard title="Замер">
          <KeyValueRow
            label="Замерщик"
            value={order.surveyor?.fullName ?? <span className="text-text3">не назначен</span>}
          />
          <KeyValueRow
            label="Дата замера"
            value={(order as any).surveyAt ? new Date((order as any).surveyAt).toLocaleString('ru-RU') : '—'}
            mono
          />
        </SectionCard>

        <SectionCard title="Установка">
          <KeyValueRow
            label="Установщик"
            value={order.installer?.fullName ?? <span className="text-text3">не назначен</span>}
          />
          <KeyValueRow
            label="Дата установки"
            value={(order as any).installAt ? new Date((order as any).installAt).toLocaleString('ru-RU') : '—'}
            mono
          />
        </SectionCard>

        <SectionCard title="Публичная ссылка">
          <PublicLinkBlock url={publicUrl} clientPhone={order.clientPhone} />
        </SectionCard>

        <SectionCard title="Фото">
          <OrderPhotos
            orderId={order.id}
            initial={photoMetas.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
          />
        </SectionCard>

        <SectionCard title="Полная форма">
          {/* OrderForm временно живёт здесь без визуального stepper'а — Stage 2 заменит */}
          <OrderForm
            order={order}
            action={updateOrderAction.bind(null, order.id)}
            surveyors={surveyors}
            installers={installers}
            role={me.role}
            mode="edit"
            hideStageStepper
            comments={<CommentsBlock orderId={order.id} comments={order.comments} />}
          />
        </SectionCard>

        <AwaitingClientCard
          orderId={order.id}
          initial={order.awaitingClient}
          initialNote={order.awaitingClientNote ?? ''}
          since={order.awaitingClientSince}
          until={order.awaitingClientUntil}
          disabled={order.stage === 'closed'}
          canSeeDecisions={true}
        />

        {isStaff(me.role) && <EventLog events={events} />}
      </div>
    </>
  );
}
```

Заметки:
- Имена полей (`totalAmount`, `advanceAmount`, `surveyAt`, `installAt`, `stageEnteredAt`) даны исходя из ожидаемой схемы. Если в `prisma/schema.prisma` имена отличаются — заменить на актуальные. Использован `as any` cast, чтобы typecheck не падал во время редизайна — это **временно** и должно быть удалено как только мы убедимся в актуальной схеме (см. Step 6).
- `approveClosureAction` — должен существовать в `app/(admin)/orders/actions.ts`. Если нет — создать аналогично `updateOrderStageAction`, со специальной логикой: разрешён только директору и только если `from === 'pending_closure'`.

- [ ] **Step 6: Сверить имена полей со схемой Prisma**

```
cmd /c "type prisma\schema.prisma" | findstr /N "model Order\|surveyAt\|installAt\|stageEnteredAt\|advanceAmount\|totalAmount"
```
Если каких-то полей нет — удалить соответствующие `<KeyValueRow>` или подменить на реальные имена. Cast `as any` использовать только там, где поле точно есть в БД, но Prisma client требует приведения из-за `include`.

- [ ] **Step 7: Если `approveClosureAction` не существует — создать**

В `app/(admin)/orders/actions.ts` дописать:

```ts
export async function approveClosureAction(orderId: string): Promise<void> {
  const me = await requireUser();
  if (me.role !== 'director') throw new Error('Только директор может закрыть заказ');

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, stage: true },
  });
  if (!order) throw new Error('Заказ не найден');
  if (order.stage !== 'pending_closure') {
    throw new Error('Закрыть можно только заказ в этапе «На закрытие»');
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      stage: 'closed',
      stageEnteredAt: new Date(),
      events: {
        create: {
          kind: 'stage_changed',
          authorId: me.id,
          payload: { from: 'pending_closure', to: 'closed' },
        },
      },
    },
  });
  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
}
```
(Если он уже есть — не дублировать.)

- [ ] **Step 8: typecheck + build**

```
cmd /c "npx tsc --noEmit"
cmd /c "npx next build"
```

- [ ] **Step 9: Локальная проверка**

`cmd /c "npm run dev"` → открыть существующий заказ. Проверить:
- Вверху HeroStage с «Этап N/8», progress rail, time-in-stage и кнопкой «Передать в …».
- Кнопка работает: меняет этап, страница ревалидируется.
- «Все этапы» открывает Sheet снизу (mobile) / centered modal (desktop) со списком этапов.
- Секции (Клиент / Финансы / Замер / Установка) рендерятся.
- Tap по телефону → `tel:`. Tap по адресу → Яндекс.Карты в новой вкладке.
- Внутри SectionCard «Полная форма» нет дублирующего horizontal stepper'а.
- Если роль = `director` и заказ в `pending_closure` — HeroStage с accent-soft фоном, primary CTA = «Закрыть заказ». Жмём — заказ переходит в `closed`.

- [ ] **Step 10: Commit**

```
git add app/(admin)/orders/[id]/page.tsx app/(admin)/orders/[id]/order-form.tsx app/(admin)/orders/[id]/hero-stage-block.tsx app/(admin)/orders/actions.ts
git -c user.email=dev@armora.local -c user.name=Armora commit -m "orders/detail: HeroStage + SectionCards + tap-actions"
git push origin main
```

---

### Task 20: (опц.) Bottom-sheet фильтр на мобиле для orders list

Сейчас на мобиле скрыты `AutoSubmitSelect` (этап / исполнитель) из-за `hidden sm:flex`. Добавляем кнопку «Фильтр» в `PageHeader`, которая на мобиле открывает Sheet с этими селектами.

**Files:**
- Create: `app/(admin)/orders/filter-sheet.tsx`
- Modify: `app/(admin)/orders/page.tsx`

- [ ] **Step 1: Создать `filter-sheet.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Sheet, IconButton } from '@/components/ui';

export default function FilterSheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton size={40} onClick={() => setOpen(true)} aria-label="Фильтр" className="sm:hidden">
        <SlidersHorizontal size={18} />
      </IconButton>
      <Sheet open={open} onClose={() => setOpen(false)} title="Фильтр заказов">
        <div className="space-y-3">{children}</div>
      </Sheet>
    </>
  );
}
```

- [ ] **Step 2: В `orders/page.tsx` подключить**

В `actions` `<PageHeader>` добавить:
```tsx
<FilterSheet>
  {/* те же AutoSubmitSelect — копией; они работают как в десктопной строке */}
  <AutoSubmitSelect name="stage" defaultValue={searchParams.stage ?? ''} preserve={['q', 'user', 'filter']}>
    <option value="">Все этапы</option>
    {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
  </AutoSubmitSelect>
  <AutoSubmitSelect name="user" defaultValue={searchParams.user ?? ''} preserve={['q', 'stage', 'filter']}>
    <option value="">Все исполнители</option>
    {assignable.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
  </AutoSubmitSelect>
</FilterSheet>
```

И импорт `import FilterSheet from './filter-sheet';`.

- [ ] **Step 3: typecheck + build**

```
cmd /c "npx tsc --noEmit"
cmd /c "npx next build"
```

- [ ] **Step 4: Локальная проверка на мобиле (DevTools)**

Открыть iPhone 13 viewport. В шапке `Заказы` справа должна быть иконка фильтра — тап → bottom-sheet с двумя селектами. Применение селекта сразу применяет фильтр (через `AutoSubmitSelect`) и закрывает sheet через `router.refresh()` (стандартное поведение).

- [ ] **Step 5: Commit**

```
git add app/(admin)/orders/filter-sheet.tsx app/(admin)/orders/page.tsx
git -c user.email=dev@armora.local -c user.name=Armora commit -m "orders: mobile filter bottom-sheet"
git push origin main
```

---

### Task 21: Финальная регрессионная проверка

- [ ] **Step 1: Полный билд**
```
cmd /c "npx tsc --noEmit"
cmd /c "npx next build"
```
Expected: всё проходит, warning Sentry/OpenTelemetry — игнорировать.

- [ ] **Step 2: Smoke в браузере (dev)**

`cmd /c "npm run dev"`.

Прогнать каждой ролью (director, manager, surveyor, installer):
1. `/orders` — список рисуется, pill-tabs работают, фильтр-sheet на мобиле.
2. `/orders/[id]` — HeroStage CTA меняет этап, StageLadder открывается через «Все этапы».
3. `/calendar` — старая страница продолжает работать (новый shell + старый внутренний UI, временная неоднородность — допустимо).
4. `/leads`, `/closures`, `/users` — то же; навигация работает.
5. Мобильный viewport: bottom tab-bar 64px виден, активный таб подсвечен accent.
6. Desktop ≥ 1024px: белый sidebar, аватар внизу, logout работает.
7. Хоткеи `?` / `g o` / `g c` (если есть `KeyboardShortcuts`) — продолжают работать.

- [ ] **Step 3: Закрыть dev-server. Если что-то поломалось — починить отдельным коммитом перед прод-пушем.**

(Push в main уже был после каждой задачи — Timeweb автоматически передеплоит.)

- [ ] **Step 4: Прод-smoke**

После последнего пуша подождать 1–2 минуты, открыть https://xn--80aa0aebnli8b.xn--p1ai/orders с продовым логином (директор, замерщик), повторить ключевые сценарии:
- список заказов рисуется,
- HeroStage меняет этап,
- approveClosure (если есть pending_closure) работает.

---

## Out of scope (Stage 1)

- Inline per-field edit (sheet на тап одного значения) — оставлено `OrderForm` как есть в SectionCard «Полная форма». Stage 2 разобьёт форму.
- Swipe-actions на карточках orders list — добавить в Stage 2 через framer-motion drag.
- Server-логика для `filter=today|waiting` — pill-tabs готовы, но фильтры пока работают только для `mine`. Stage 2 расширит `listOrders`.
- Pull-to-refresh — нативный браузер уже это поддерживает; кастомного индикатора не делаем.
- Calendar, Leads, Closures, Users редизайн — Stage 2/3.
- Удаление `components/admin-shell.tsx`, `sidebar.tsx`, `stage-badge.tsx`, `stage-stepper.tsx`, `page-shell.tsx` — после Stage 2, когда все экраны перейдут на новые primitives.

---

## Self-review checklist (выполнено перед сдачей плана)

- **Spec coverage:**
  - Tokens — Task 1 ✓
  - Mobile shell (bottom tab-bar) — Task 8 ✓
  - Desktop shell (white sidebar) — Task 9 ✓
  - AppShell composer + layout swap — Task 10, 16 ✓
  - ProgressChip — Task 11 ✓
  - HeroStage + StageLadder — Task 12, 13 ✓
  - Orders list cards — Task 18 ✓
  - Order detail HeroStage + SectionCards — Task 19 ✓
  - Mobile filter sheet — Task 20 ✓
- **Placeholders:** Все шаги содержат рабочий код. Один `// ...props as before...` помечен явно как контекст внутри уже существующего файла (`order-form.tsx`); инструкция «обернуть условием» — конкретна.
- **Type consistency:** Имена компонентов и пропсов сверены: `HeroStage` всегда принимает `current/role/enteredAt/enteredBy/onStageChange/onApproveClosure`. `OrderCard` всегда — `href/number/clientName/address/stage/daysInStage/phone/amount`. `ProgressChip` — `stage/daysInStage`. `Sheet` — `open/onClose/title/footer`. Консистентно.
- **Ambiguity:** Имена полей `Order` (totalAmount, advanceAmount, surveyAt, installAt, stageEnteredAt) — отмечены явно как «сверить со схемой» в Step 6 Task 19 с инструкцией «удалить ряд или подменить» при расхождении.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-11-armora-crm-redesign-stage-1.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — диспатчу fresh subagent на каждую задачу, ревью между задачами, быстрая итерация.
2. **Inline Execution** — выполняю задачи в этой же сессии через `executing-plans`, batch с чекпойнтами для ревью.
