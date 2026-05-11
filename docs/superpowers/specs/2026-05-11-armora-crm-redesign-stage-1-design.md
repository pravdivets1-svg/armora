# Armora CRM Redesign — Stage 1 design

**Date:** 2026-05-11
**Stage:** 1 of 3 (Foundation + mobile shell + Orders + status visualization)
**Status:** Draft for review

---

## 1. Goal

Поднять админскую часть Armora CRM до premium-soft (Linear/Vercel-style) уровня и сделать её mobile-first, потому что все роли сотрудников (директор, менеджер, замерщик, установщик) работают преимущественно с телефона.

Решаемые pain points:

- **Плотность и информативность** — мало данных на экран, лишний скролл.
- **Статусы заказов** — текущие `StageBadge` (6-цветные) и горизонтальный 8-сегментный stepper плохо читаются; непонятно, где «застрял» заказ.
- **Mobile UX** — текущая админка desktop-first с мобильным drawer'ом сверху; навигация неудобная на телефоне.

Stage 1 строит фундамент (дизайн-система + shell) и применяет его к самому используемому экрану — Orders (список + детальная карточка) + новую визуализацию статусов. Calendar / Leads / Closures / Users подключаются в Stage 2–3 в отдельных спеках.

## 2. Constraints

- Стек фиксирован: Next.js 14 App Router, Tailwind, Prisma, NextAuth v5.
- **Не трогаем:** `auth.ts`, `middleware.ts`, `lib/stage-transitions.ts`, `next.config.js`.
- Без эмоджи в UI и коде.
- Шрифт — Inter (уже подключён через `var(--font-inter)`).
- Windows / PowerShell: команды через `cmd /c "npx ..."`, перед коммитом `tsc --noEmit` + `next build`.
- Фото — BYTEA в Postgres (не меняем хранение).
- Старые экраны (calendar/leads/closures/users) на время Stage 1 остаются в текущем стиле; новые primitives совместимы со старыми через алиасы в tailwind.

## 3. Design tokens

### Палитра

```
Neutrals (cool slate):
  bg-app        #FAFAFB
  bg-card       #FFFFFF
  bg-subtle     #F4F5F7
  border        #ECEEF1
  border-strong #DDE1E6
  text-1        #0B0D12
  text-2        #4B5260
  text-3        #8A93A1

Brand accent:
  accent        #2563EB
  accent-soft   #EFF6FF
  accent-deep   #1D4ED8

Status (desaturated):
  ok            #2A9D6A  on  #ECF7F0
  warn          #B6781A  on  #FBF3E2
  bad           #C9384B  on  #FCEBED
  info          #2462C7  on  #E8F0FB
```

Tailwind: добавить новые ключи рядом с существующими (`canvas`, `page`, `line` оставить как алиасы для совместимости со старыми экранами; новые primitives используют `bg-app`, `bg-card`, `border` etc).

### Типографика

```
display 24/32 -0.02em  weight 650   крупные числа в hero и stat-картах
h1      20/28 -0.015em weight 600   заголовок страницы
h2      16/22 -0.01em  weight 600   заголовок секции, карточки
body    14/20  0       weight 450   основной текст
meta    13/18  0       weight 500   подписи, мета
mono    13/18  tnum    tabular      все числа, телефоны, ID, время
```

### Радиусы, тени, motion

```
radius:  6 / 10 / 14 / 20   (chip / control / card / sheet)
shadow:
  card    0 1px 2px rgba(15,23,42,.04), 0 1px 1px rgba(15,23,42,.03)
  popover 0 12px 32px -8px rgba(15,23,42,.16), 0 2px 6px rgba(15,23,42,.06)
motion:
  fast    120ms cubic-bezier(.2,.8,.2,1)   hover, focus
  base    180ms cubic-bezier(.2,.8,.2,1)   nav, sheet enter
  slow    260ms cubic-bezier(.2,.8,.2,1)   sheet content, list reflow
focus-ring: 2px solid accent, 2px transparent offset
```

Принципы: 1px-границы вместо теней; тени только на поднимаемых поверхностях (sheet, popover, hover-карточки); никаких декоративных градиентов.

## 4. Shell architecture

### Mobile (< 1024px)

```
┌──────────────────────────────────┐
│ ◀ Заказы              ⌕  ⋯       │  56px sticky top-bar
│   3 новых                        │  опц. подзаголовок-метрика
├──────────────────────────────────┤
│  основной контент                │
│  (скроллится, safe-area top)     │
├──────────────────────────────────┤
│  ⊞      ◷       ✉       ☑     ⚙  │  64px fixed bottom tab-bar
│ Заказы Расп.  Заявки  Закр.  Ещё │  safe-area-inset-bottom
└──────────────────────────────────┘
```

- **Top-bar** 56px sticky, белый, `border-b 1px`. Слева — back-arrow на вложенных страницах, на корне — заголовок. Справа — 1–2 экшна (поиск, фильтр, ⋯). Подзаголовок-метрика опционален.
- **Bottom tab-bar** 64px + safe-area, fixed, `border-t 1px`, blur backdrop. 4 основных таба + «Ещё» для остального (Closures, Users — по роли). Активный — иконка accent + лейбл accent + 2px индикатор сверху. Иконки `lucide-react` stroke 1.5, размер 22.
- **Sheet вместо новой страницы** для форм/фильтров. Slide-up, drag-to-dismiss, max-height 92vh, sticky CTA внизу.
- Контент внутри скролл-контейнера (а не body), `safe-area-inset-top/bottom`.

### Desktop (≥ 1024px)

```
┌──────────┬──────────────────────────────────────────┐
│  Armora  │  Заказы                          + Новый │  64px page header
│          ├──────────────────────────────────────────┤
│ ▢ Заказы │                                          │
│ ◷ Расп.  │  основной контент                        │
│ ✉ Заявки │                                          │
│ ☑ Закр.  │                                          │
│ ⊙ Сотр.  │                                          │
│          │                                          │
│  ──────  │                                          │
│  User ⌄  │                                          │
└──────────┴──────────────────────────────────────────┘
   240px                  flex-1
```

- Sidebar **белый** (не navy), `border-r 1px`, ширина 240px. Активный пункт — `bg-accent-soft text-accent`. Иконки тонкие.
- Внизу sidebar — pill с аватаром/именем/ролью + меню (профиль, logout).
- Page header 64px sticky, заголовок + правые экшны (фильтр, primary CTA).
- На вложенных страницах header превращается в breadcrumb + back.

### Адаптивность

Единый `<AppShell>` с `useMediaQuery('lg')` рендерит два разных layout. Без «desktop-with-hidden-sidebar». Sheet vs Modal — одна и та же абстракция: Sheet снизу на мобиле, centered Modal на десктопе.

Бейджи (`newLeads`, `pendingClosures`) — accent dot 8px над иконкой в tab-bar / sidebar; tnum-число рядом.

## 5. Status visualization

В пайплайне 8 этапов: `new → survey_scheduled → survey_done → production → ready_to_install → installed → pending_closure → closed`. Текущий 8-квадратный stepper на мобиле нечитаем.

### 5.1 ProgressChip — в списках

```
●●●●○○○○  Производство · 3 дня в этапе
```

- 8 точек = 8 этапов `PIPELINE`. Точки с индексом `< currentIdx` — залиты accent (пройденные). Точка `currentIdx` — outlined accent (текущая). Остальные — `bg-border` (будущие). `currentIdx = PIPELINE.indexOf(stage)`.
- Лейбл этапа + relative duration «N дней в этапе» (`text-3`, mono число).
- Высота 18px, ширина ~120px.
- Long-duration coloring: > 5 дней — meta `warn`, > 14 дней — `bad`.

### 5.2 HeroStage — вверху order detail

```
┌──────────────────────────────────────────────┐
│  ЭТАП 4 ИЗ 8                                 │  meta uppercase, text-3
│  Производство                                │  display-24, text-1
│  ────────●─────────────────                  │  2px progress rail, accent pin
│  Перешёл сюда 3 дня назад · zub@armora       │  text-3 mono
│                                              │
│  [ Передать в «Готова к установке»     → ]   │  primary CTA, full-width на mob
│  └ Откатить назад   └ Все этапы              │  ghost secondary actions
└──────────────────────────────────────────────┘
```

- «Step N of 8» — мгновенный ответ на «где сейчас».
- Тонкий progress rail (2px высоты) с pin-маркером.
- Time in stage + кто перевёл (последняя запись `OrderEvent` для смены этапа).
- Один primary CTA выбирается по правилу: если `+1` сосед в `PIPELINE` разрешён для текущей роли (по `isStageTransitionAllowed`) — это и есть primary. Если нет — primary не показывается, вместо него состояние `Ожидает действия директора` с `warn-soft` фоном. Откат назад и прыжки на дальние этапы — через secondary `Все этапы` (StageLadder).
- «Все этапы» раскрывает StageLadder.

### 5.3 StageLadder — expandable

```
✓ Новая                     5 апр · Иванов
✓ Замер запланирован        6 апр · Сидоров
✓ Замер завершён            7 апр · Сидоров
● Производство              8 апр · текущий, 3 дня
○ Готова к установке        —
○ Установлена               —
○ На закрытие               —
○ Закрыт                    —
```

- Прошедшие — `text-2` + Check icon, текущий — accent + pulse-dot, будущие — `text-3` outlined.
- Кликабельные строки — для ролей с правами (через `isStageTransitionAllowed`).
- Без confirm-диалога для discrete переходов; перевод в `closed` идёт через отдельный server action `approveClosure` (как сейчас).

### 5.4 Special case — `pending_closure` для директора

HeroStage фон полностью `accent-soft`; primary CTA = `Закрыть заказ →` (вызывает `approveClosure`). Это единственный action-state, который выделяется сильно.

### 5.5 Что убираем

- `components/stage-badge.tsx` — везде заменяется `<ProgressChip>`.
- Текущий `components/stage-stepper.tsx` — заменяется `<HeroStage>` + `<StageLadder>`.
- `animate-pulse` остаётся только для `pending_closure`.

## 6. Orders list

```
┌──────────────────────────────────┐
│ Заказы              ⌕  ⊟ Фильтр  │
│ 12 активных                      │
├──────────────────────────────────┤
│ [Все] [Мои] [Сегодня] [Ждут]     │ pill-tabs scroll-x
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Иванов А.                    │ │
│ │ ул. Ленина 4, кв 12          │ │
│ │ ●●●●○○○○ Производство · 3д  │ │
│ │ +7 925 ··· · 24 500 ₽        │ │
│ │ Сегодня в 14:00              │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

- Карточка ≈ 130px, `bg-card`, `border 1px`, `radius 14`, `p-4`, gap 12px между карточками.
- 4 строки: имя + адрес / ProgressChip / phone + сумма / actionable date (если есть, accent цветом).
- Tap → `/orders/[id]`.
- Над списком pill-tabs (Все / Мои / Сегодня / Ждут действия). Через query-param `?filter=`.
- Поиск и расширенные фильтры — bottom-sheet (открывается кнопкой `⊟ Фильтр`). Поля: статус (multi), исполнитель, период, тип. Применяется через query-params.
- Swipe-right на карточке → quick action «передать на следующий этап» (если разрешено ролью). Swipe-left → `tel:` для звонка. Реализация через framer-motion drag.
- Pull-to-refresh: использовать нативный CSS overscroll + reload через `router.refresh()`.
- Desktop ≥ 1280px: те же карточки в 2 колонках (`grid-cols-2`). Без таблиц — единая ментальная модель.

## 7. Order detail

```
┌──────────────────────────────────┐
│ ◀ Заказ #1042         ⋯           │  sticky top-bar
├──────────────────────────────────┤
│ HeroStage block                  │
├──────────────────────────────────┤
│ Клиент                           │  section header text-3 uppercase
│ Иванов Алексей                   │  display-24
│ +7 925 123 45 67  [позвонить]    │
│ ул. Ленина 4, кв 12  [карта]     │
├──────────────────────────────────┤
│ Замер                            │
│ 12 апр 14:00 · Сидоров           │
│ 3 фото · 2 двери                 │
│ [Открыть детали замера →]        │
├──────────────────────────────────┤
│ Финансы                          │
│ Сумма          24 500 ₽          │
│ Аванс           7 000 ₽          │
│ К оплате       17 500 ₽          │
├──────────────────────────────────┤
│ Установка                        │
├──────────────────────────────────┤
│ История  ⌄                       │
└──────────────────────────────────┘
```

- Sticky top-bar 56px: back-arrow + ID заказа + ⋯ меню (удалить, дублировать, экспорт).
- HeroStage всегда вверху.
- 5 секций: Клиент, Замер, Финансы, Установка, История. Каждая — `<SectionCard>` с заголовком (meta-uppercase) и key-value строками.
- Mobile: одна колонка, gap 8px. Desktop: bento 2 колонки (Клиент+Финансы | Замер+Установка), История — на всю ширину под.
- **Inline-editable**: tap на значение → bottom-sheet с одним полем + Save. Не вся форма сразу. Иконка ✎ справа от значения только для ролей с правом редактирования.
- Tap-actions: телефон → `tel:`, адрес → яндекс/гугл-карты.
- При скролле top-bar показывает имя клиента + текущий этап (sticky context).
- Sticky CTA внизу на мобиле — дублирует primary CTA из HeroStage, чтобы не скроллить наверх. На десктопе не нужен (HeroStage всегда виден).

## 8. UI-примитивы

Новая папка `components/ui/` с переработанными компонентами:

| Компонент | Назначение | Замещает |
|---|---|---|
| `<AppShell>` | Mobile-first shell | `admin-shell.tsx` |
| `<MobileTabBar>` | Нижний таб-бар | — |
| `<DesktopSidebar>` | Светлый sidebar | `sidebar.tsx` |
| `<PageHeader>` | Sticky top-bar / page header | inline в layout |
| `<Sheet>` | Bottom-sheet / centered modal | — |
| `<Card>` | Базовая карточка | inline tailwind |
| `<OrderCard>` | Карточка в списке заказов | — |
| `<ProgressChip>` | 8-точечный chip + лейбл | `StageBadge` |
| `<HeroStage>` | Hero stage block с CTA | вершина `stage-stepper` |
| `<StageLadder>` | Вертикальный expandable ladder | `stage-stepper` |
| `<KeyValueRow>` | Строка с лейблом и значением | — |
| `<SectionCard>` | Карточка-секция с заголовком | — |
| `<Button>` | primary / secondary / ghost / link | `ui.tsx` Button |
| `<IconButton>` | 36/40/44px touch-target | — |
| `<PillTabs>` | Pill-стиль табы scroll-x | обобщение `CalendarUserFilter` |
| `<Empty>` | Пустые состояния | `EmptyState` |

Сохраняем как есть: `LiveSearch`, `AutoSubmitSelect`, `CopyPhone`, `lib/push.ts`, `lib/max.ts`, `lib/telegram.ts`, `lib/stage-transitions.ts`.

## 9. Migration strategy (Stage 1)

1. Расширить `tailwind.config.ts` новыми tokens; старые ключи (`canvas`, `page`, `line`, `sidebar.*`, `ink.*`, `accent.*`) сохранить как алиасы для неотредизайненных экранов.
2. Создать `components/ui/` со всеми новыми primitives.
3. Заменить `<AdminShell>` на `<AppShell>` в `app/(admin)/layout.tsx`. Старые экраны автоматически получают новый shell, их внутренности временно сосуществуют с новым стилем — приемлемая визуальная неоднородность до Stage 2.
4. Полностью переделать `app/(admin)/orders/*` — список + детальная + формы (использовать новые primitives).
5. Глобально заменить `<StageBadge>` → `<ProgressChip>` (используется на нескольких страницах, не только в orders) — статусы подтянутся на всех экранах сразу.
6. `cmd /c "npx tsc --noEmit"` + `cmd /c "npx next build"` перед коммитом. Ручная проверка orders + регрессионная проверка всех остальных экранов (shell-уровень).

## 10. Motion policy

- Hover/focus: 120ms.
- Sheet enter: 220ms slide+fade.
- List enter: 180ms stagger 30ms.
- Stage progress fill: 260ms cubic-bezier при смене этапа.
- Pull-to-refresh: нативный CSS overscroll.
- Никаких декоративных анимаций; motion = функциональная обратная связь.

## 11. Testing / verification

- Browser smoke test: Chrome DevTools mobile (375×812 iPhone 13) + 1440×900 desktop.
- Прод-проверка после деплоя: пройти полный путь lead → order → stage transitions ролями director и manager.
- `cmd /c "npx tsc --noEmit"` + `cmd /c "npx next build"` обязательно перед коммитом.
- Юнит-тесты на UI не вводим (их в проекте нет, инфраструктуру под одну спеку не добавляем).

## 12. Out of scope (Stage 1)

- Calendar — Stage 2.
- Leads (список и детальная) — Stage 2.
- Closures, Users — Stage 3.
- Order public view (`app/order/[token]/*`) — Stage 3.
- Тёмная тема — позже, не в Stage 1.
- Графики и аналитика — позже.
- i18n — позже, пока только ru-RU.
