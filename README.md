# СтальДверь — учёт заказов

MVP для компании по продаже и установке металлических входных дверей.
Команда из 7 человек: директор, 2 менеджера, 2 замерщика, 2 установщика.

## Возможности

- **Заказы**: карточка с клиентом, дверью, оплатой, назначениями и комментариями
- **Список** с поиском (ФИО/телефон) и фильтрами по этапу и сотруднику
- **Календарь** замеров и установок на 21 день вперёд
- **Публичная ссылка** для клиента: `/order/{token}` — статус, прогресс, контакты
- **4 роли**: директор / менеджер / замерщик / установщик (доступы разделены)
- **Кнопка WhatsApp**: отправить ссылку клиенту в один тап

## Стек

- Next.js 14 (App Router, Server Actions)
- PostgreSQL + Prisma 5
- NextAuth v5 (Credentials, JWT)
- Tailwind CSS (тема Arctic Frost Dark)
- Lucide иконки, Inter шрифт

---

## Локальный запуск

### 1. Установка

```powershell
cd C:\Users\Mi\приложение
npm install
```

### 2. База данных

Подними локальный PostgreSQL (Docker / Postgres.app / нативно).
Создай пустую БД `stal_dveri`.

### 3. Переменные окружения

Скопируй шаблон и заполни:

```powershell
copy .env.example .env
```

Минимум, что нужно прописать в `.env`:

- `DATABASE_URL` — строка подключения к Postgres
- `AUTH_SECRET` — случайная строка ≥32 символов (сгенерировать: `openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL` — для локалки `http://localhost:3000`
- `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_COMPANY_PHONE`, `NEXT_PUBLIC_COMPANY_PHONE_DIGITS`

### 4. Миграции и сидинг

```powershell
npm run db:migrate     # создаст таблицы
# отредактируй prisma/seed.ts — пропиши свою команду из 7 человек
npm run db:seed        # заведёт пользователей
```

### 5. Запуск

```powershell
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000), залогиниться под одним из созданных email.

---

## Управление пользователями (CLI)

UI для управления сотрудниками намеренно нет — всё через скрипты.

```powershell
# Список всех
npm run user:list

# Добавить нового
npm run user:add -- "petrov@stal-dveri.ru" "Пётр Петров" surveyor "+7 916 555-44-33" "Tmp-x9k2"

# Сменить пароль
npm run user:set-password -- "petrov@stal-dveri.ru" "новый-пароль"

# Отключить (мягкое удаление, заказы остаются связанными)
npm run user:disable -- "petrov@stal-dveri.ru"
```

Роли: `director` | `manager` | `surveyor` | `installer`.

---

## Деплой на Timeweb Cloud

### Шаг 1. Postgres (Timeweb Cloud → Облачные базы данных)

1. Создать инстанс **PostgreSQL 16**, минимальный тариф (1 CPU / 1 ГБ / 8 ГБ SSD).
2. В разделе «Доступ» включить **внешние подключения** (или внутреннюю сеть, если App в том же ДЦ).
3. Скопировать строку подключения вида
   `postgresql://gen_user:PASS@xxx.timeweb.cloud:5432/default_db?sslmode=require`.

### Шаг 2. Репозиторий (GitHub приватный)

```powershell
cd C:\Users\Mi\приложение
git init
git add .
git commit -m "init: Armora MVP"
git branch -M main
git remote add origin https://github.com/<USER>/armora.git
git push -u origin main
```

### Шаг 3. Приложение (Timeweb Cloud → Приложения → Создать)

1. Тип: **Backend → Next.js** (или Node.js).
2. Источник: **GitHub**, выбрать репозиторий, ветка `main`.
3. Настройки сборки:
   - **Node version**: 20
   - **Install command**: `npm ci`
   - **Build command**: `npm run build` (внутри уже `prisma generate && prisma migrate deploy && next build`)
   - **Start command**: `npm start`
   - **Порт**: `3000`
4. Environment variables (Variables → Добавить):
   - `DATABASE_URL` = строка из Шага 1
   - `AUTH_SECRET` = `openssl rand -base64 32` (или любой длинный random)
   - `AUTH_TRUST_HOST` = `true`
   - `AUTH_URL` = `https://<поддомен>.timeweb.cloud` (выдаст Timeweb после создания)
   - `NEXT_PUBLIC_APP_URL` = то же значение
   - `NEXT_PUBLIC_COMPANY_NAME` = `Armora`
   - `NEXT_PUBLIC_COMPANY_PHONE` = телефон с пробелами
   - `NEXT_PUBLIC_COMPANY_PHONE_DIGITS` = только цифры (для wa.me)
   - `NODE_ENV` = `production`
5. Запустить деплой. Build применит миграции автоматически.

### Шаг 4. Первый сидинг (один раз)

В консоли приложения на Timeweb:

```bash
npm run db:seed
```

Создаст 7 пользователей с дефолтными паролями. **Сразу смени их**:

```bash
npm run user:set-password -- dir001@armora.local НовыйПароль5
```

### Шаг 5. Проверка

Открыть выданный поддомен `https://<...>.timeweb.cloud`, залогиниться `dir001` + пароль.

### (Позже) Свой домен

Привязать в настройках приложения, SSL Let's Encrypt подключится автоматически.
После привязки **обновить** `AUTH_URL` и `NEXT_PUBLIC_APP_URL` на новый домен и передеплоить
— иначе ссылки `/order/{token}` для клиентов будут содержать старый адрес.

**Бюджет**: ~250₽ Postgres + ~350₽ App = **~600₽/мес.**

---

## Структура проекта

```
приложение/
├── app/
│   ├── (auth)/login/             # вход
│   ├── (admin)/
│   │   ├── orders/               # список + создание + карточка
│   │   └── calendar/             # календарь 21 день
│   ├── order/[token]/            # ПУБЛИЧНАЯ страница для клиента
│   ├── api/auth/[...nextauth]/   # endpoints NextAuth
│   ├── layout.tsx
│   ├── page.tsx                  # / → /orders
│   └── globals.css
├── components/
│   ├── header.tsx
│   ├── nav-link.tsx
│   ├── stage-badge.tsx
│   └── ui.tsx                    # Card, Input, Select, Button и т.д.
├── lib/
│   ├── prisma.ts
│   ├── auth-helpers.ts           # requireUser, requireRole, isStaff
│   ├── orders.ts                 # listOrders с учётом роли
│   ├── labels.ts                 # STAGE_LABEL, ROLE_LABEL
│   └── format.ts                 # fmtMoney, fmtDateTime, initials
├── prisma/
│   ├── schema.prisma             # 5 таблиц
│   └── seed.ts                   # 7 пользователей (отредактировать!)
├── scripts/                       # CLI для пользователей
├── prototype/                     # HTML-макеты Arctic Frost (для справки)
├── auth.ts                        # NextAuth конфиг
├── middleware.ts                  # защита приватных роутов
└── ...конфиги
```

---

## Этапы заказа

1. Новая
2. Замер назначен
3. Замер сделан, аванс получен
4. В производстве
5. Готова к установке
6. Установлена
7. Закрыта

При переводе в **Закрыта** публичная ссылка автоматически получает срок жизни **+90 дней**,
после чего перестаёт работать (показывает «срок ссылки истёк»).

---

## Что сознательно НЕ сделано

Эти вещи добавим, если реально понадобятся:

- ❌ Финансовые отчёты, графики, аналитика
- ❌ Себестоимость, маржа
- ❌ SMS / Email уведомления
- ❌ Онлайн-оплаты
- ❌ Загрузка фото / файлов
- ❌ История изменений (audit log)
- ❌ Интеграции с 1С, телефонией, мессенджерами
- ❌ Управление пользователями через UI (только CLI)

---

## Если что-то сломалось

```powershell
npm run db:studio       # GUI для базы (Prisma Studio)
npm run user:list       # проверить, есть ли активные пользователи
```

Пересоздать БД с нуля (УДАЛИТ ВСЕ ДАННЫЕ):

```powershell
npx prisma migrate reset
npm run db:seed
```
