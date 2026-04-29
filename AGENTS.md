# AGENTS.md — Armora

Этот файл — стартовый брифинг для любого ИИ-ассистента (Kilo, Claude, Cursor,
Copilot и т.д.), работающего с проектом. Прочитай его целиком перед началом
любой задачи.

---

## Что это

**Armora** — внутреннее веб-приложение для учёта заказов металлических входных
дверей. Команда: 4 сотрудника. Работа с компьютера и телефона.

- Прод: **https://pravdivets1-svg-armora-6743.twc1.net**
- Репо: **https://github.com/pravdivets1-svg/armora** (приватный, ветка `main`)
- Папка локально: `C:\Users\Mi\приложение`
- Хостинг: **Timeweb Cloud Apps** (Россия, 152-ФЗ, ~600₽/мес)
- Автодеплой: push в `main` → Timeweb сам собирает и передеплоивает за 3–7 мин.

## Стек

- **Next.js 14** (App Router, Server Actions)
- **PostgreSQL 16** (managed на Timeweb)
- **Prisma 5** (ORM + миграции)
- **NextAuth v5** (Credentials, JWT, без email-провайдера)
- **Tailwind CSS** + **lucide-react** + **Inter font**
- **TypeScript strict**, **bcryptjs**, **zod**

## Важные конвенции проекта

1. **Логин = 6 символов латиницей**, пароль = 5 символов. На странице логина
   пользователь вводит только короткий логин (`dir001`), сервер сам подставляет
   `@armora.local` при поиске в БД (см. `auth.ts`).
2. **UI для управления пользователями НЕТ.** Только CLI скрипты в `scripts/`.
3. **4 роли:** `director` | `manager` | `surveyor` | `installer`.
   Доступы разделены в `lib/auth-helpers.ts` и `lib/orders.ts`.
4. **Глобально отключены анимации/переходы** через `globals.css` (`* { animation: none; transition: none }`).
   Не возвращать без явной просьбы.
5. **Не использовать смайлики/эмоджи** в UI и коде, кроме функциональных
   (например, иконки lucide).
6. **Стиль:** Modern 2026 — кремовый фон `#fafaf7`, чёрный акцент, индиго-опционально,
   бейджи с цветными точками. Палитра в `tailwind.config.ts`.
7. **Public link** для клиента: `/order/{token}` — токен хранится в `orders.publicToken`,
   срок жизни ставится при переводе в этап «Закрыта» (+90 дней).
8. **Любые правки структуры БД** требуют миграции Prisma. После создания
   миграции локально — обязательно применить на проде.

## Команда (актуальные пользователи прода)

| Роль | Имя | Логин | Пароль |
|---|---|---|---|
| Руководитель | Владимир Сергеевич | `dir001` | `a4dvh` |
| Менеджер | Арина | `mgr001` | `DVtVB` |
| Замерщик | Али | `srv001` | `Tg5Bs` |
| Установщик | Арсен | `ins001` | `3acvH` |

Пароли хранятся в `prisma/seed.ts` для первого сидинга. После смены через CLI
файл seed.ts уже не отражает реальные пароли.

## Окружение

### Локальная разработка

```powershell
cd C:\Users\Mi\приложение
docker start stal-pg          # Postgres 16 локально, port 5432
npm run dev                   # http://localhost:3000
```

`.env` (локально, НЕ коммитится):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stal_dveri
AUTH_SECRET=<любая длинная строка для разработки>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_COMPANY_NAME=Armora
NEXT_PUBLIC_COMPANY_PHONE=+7 (495) 123-45-67
NEXT_PUBLIC_COMPANY_PHONE_DIGITS=74951234567
```

### Прод (Timeweb)

БД (Timeweb managed Postgres):
```
host:     85.239.55.23
port:     5432
user:     gen_user
password: vovka2183
db:       default_db
URL:      postgresql://gen_user:vovka2183@85.239.55.23:5432/default_db?sslmode=require
```

Env vars в Timeweb Cloud App:
```
DATABASE_URL                     postgresql://gen_user:vovka2183@85.239.55.23:5432/default_db?sslmode=require
AUTH_SECRET                      uoQtINfRlC8dUz8f4bzk0Je7chWacqYJDWI2z5sBY+c=
AUTH_URL                         https://pravdivets1-svg-armora-6743.twc1.net
AUTH_TRUST_HOST                  true
NEXT_PUBLIC_APP_URL              https://pravdivets1-svg-armora-6743.twc1.net
NODE_ENV                         production
NEXT_PUBLIC_COMPANY_NAME         Armora
NEXT_PUBLIC_COMPANY_PHONE        +7 (495) 123-45-67
NEXT_PUBLIC_COMPANY_PHONE_DIGITS 74951234567
```

## Особенности окружения разработки (Windows)

- ОС: **Windows + PowerShell 5.1** — НЕТ оператора `&&`. Использовать `;` или
  `; if ($?) { ... }`.
- npm-скрипты запускать через `cmd /c "npm ..."` либо `npx ...` напрямую,
  иначе PowerShell блокирует `npm.ps1`.
- Путь содержит **кириллицу** (`приложение`) — работает, но всегда экранировать
  кавычками.
- Node v24, Docker Desktop установлен, Postgres-контейнер `stal-pg` (postgres:16,
  пароль postgres, БД stal_dveri).
- `git` есть, `gh` (GitHub CLI) НЕТ. PR-ы через веб GitHub.

## Цикл изменений

```
1. Изменить файлы локально
2. (если меняли схему БД) npx prisma migrate dev --name <name>
3. npx tsc --noEmit                         # проверка типов
4. cmd /c "npx next build"                   # проверка сборки
5. (если меняли схему) применить миграцию на проде:
     $env:DATABASE_URL="postgresql://gen_user:...@85.239.55.23:5432/default_db?sslmode=require"
     cmd /c "npx prisma migrate deploy"
6. git add -A
   git -c user.email=dev@armora.local -c user.name=Armora commit -m "<msg>"
   git push
7. Подождать 3–7 мин — Timeweb сам соберёт и передеплоит.
8. Проверить на https://pravdivets1-svg-armora-6743.twc1.net
```

## Полезные команды

```powershell
# Управление пользователями (локально или с прод-DATABASE_URL в env)
npm run user:list
npm run user:add -- "<login6>@armora.local" "<ФИО>" <role> "<phone>" "<pass5>"
npm run user:set-password -- "<login6>@armora.local" "<новый-пароль>"
npm run user:disable -- "<login6>@armora.local"

# База
npm run db:studio                # GUI Prisma Studio
npm run db:seed                  # пересидить пользователей (опасно на проде!)
npm run db:migrate               # создать миграцию (dev)

# Подключение к проду одной командой
docker exec stal-pg psql "postgresql://gen_user:vovka2183@85.239.55.23:5432/default_db" -c "SELECT * FROM users;"
```

## Структура папок

```
приложение/
├── app/
│   ├── (auth)/login/                 # вход
│   ├── (admin)/
│   │   ├── orders/                   # список + new + [id]
│   │   └── calendar/                 # 21 день
│   ├── order/[token]/                # ПУБЛИЧНАЯ страница клиента
│   ├── api/auth/[...nextauth]/
│   ├── layout.tsx                    # Inter font, themeColor через viewport
│   ├── page.tsx                      # / → /orders
│   └── globals.css                   # Modern 2026 + global no-animation
├── components/                       # header, nav-link, stage-badge, ui
├── lib/                              # prisma, auth-helpers, orders, labels, format
├── prisma/
│   ├── schema.prisma                 # 5 таблиц: users, orders, order_comments,
│   │                                 #          company_settings, sessions
│   ├── migrations/                   # init
│   └── seed.ts                       # 4 пользователя Armora
├── scripts/                          # CLI: add/list/set-password/disable user
├── prototype/                        # старые HTML-макеты (для справки, не трогать)
├── auth.ts                           # NextAuth v5: Credentials, JWT, role в токене
├── middleware.ts                     # защита приватных роутов
├── next.config.js
├── tailwind.config.ts                # палитра Modern 2026
├── tsconfig.json                     # paths: "@/*": ["./*"]
├── package.json                      # build deps в dependencies (важно для Timeweb)
└── .env                              # НЕ коммитить
```

## Этапы заказа

1. Новая
2. Замер назначен
3. Замер сделан, аванс получен
4. В производстве
5. Готова к установке
6. Установлена
7. Закрыта (→ публичный токен получает срок жизни +90 дней)

## Что сознательно НЕ сделано (не предлагать без запроса)

- Финансовая аналитика, отчёты, графики
- Себестоимость, маржа
- SMS / email / push уведомления
- Онлайн-оплаты
- Загрузка файлов / фото
- Audit log (история изменений)
- Интеграции с 1С, телефонией, мессенджерами (кроме wa.me ссылки)
- UI управления пользователями
- Анимации и transitions

## Если что-то сломалось в проде

1. Откатить последний коммит: `git revert HEAD; git push` — Timeweb передеплоит.
2. Логи в панели Timeweb → приложение → «Логи».
3. Состояние БД: `npm run db:studio` с прод-DATABASE_URL.
4. Бэкапы Postgres — автоматические в Timeweb (вкладка «Бэкапы» БД).

---

**Не делай ничего, что меняет схему БД, env vars на проде или удаляет данные —
без явного подтверждения от пользователя.**

---

## Идеи в очереди (обсуждены, не реализованы)

### Электронный гарантийный талон по постоянной ссылке
**Статус:** одобрена пользователем, ждёт реализации.

Идея: использовать уже существующий `publicToken` как долгоживущую ссылку на
гарантийный талон. После закрытия заказа `/order/{token}` превращается в
«Гарантийный талон» вместо страницы трекинга.

План MVP:
1. Schema, новые поля в `Order`:
   - `warrantyMonths Int @default(12)` — срок гарантии в месяцах
   - `warrantyVoid Boolean @default(false)` — аннулирована ли
   - `warrantyVoidReason String?`
   - `installedAt DateTime?` — фактическая дата установки (для отсчёта гарантии;
     `installAt` = плановая)
2. `tokenExpiresFor('closed', …)`: вместо +90 дней — `warrantyMonths * 30 + 180`
   дней (срок гарантии + 6 мес. запаса).
3. Публичная страница `/order/[token]` — две версии:
   - До `closed`: текущий вид (трекинг этапов, оплаты)
   - После `closed`: «Гарантийный талон» — модель двери, дата установки, срок
     гарантии до DD.MM.YYYY, условия, телефон сервиса, кнопка «Скачать PDF»,
     кнопка «Заказать ещё». **Минимум ПДн: скрыть телефон клиента, маскировать
     адрес** (152-ФЗ, ссылка может утечь за годы).
   - Финансовый блок схлопнуть до «оплачено полностью».
4. В карточке заказа в админке: поле «Срок гарантии, мес», кнопка
   «Аннулировать гарантию» (только директор) с указанием причины.
5. Кнопка «Отправить талон клиенту» = `wa.me/<phone>?text=<url>`.

Что НЕ делаем в MVP: email-напоминания об истечении гарантии, QR-наклейки на
двери, личный кабинет клиента с авторизацией.

### Фото договоров и замеров / установки
**Статус:** одобрена пользователем, ждёт реализации. Заблокирована: нужен
S3-бакет в Timeweb и ключи доступа от пользователя.

Идея: к каждому заказу можно приложить фото (договор от менеджера, фото замера
от замерщика, фото установленной двери от установщика). Снято с телефона — сразу
загружается.

**Хранилище: Timeweb S3** (объектное, ~50₽/мес за 10 ГБ). Не Postgres bytea (раздует БД),
не локальный диск App (теряется при передеплое). Telegram-канал как костыль —
только если S3 окажется проблемой.

План MVP:
1. Schema: таблица `OrderAttachment` (id, orderId, kind, fileName, mimeType,
   sizeBytes, storageKey, uploadedById, createdAt). `kind` enum: `contract` |
   `survey_photo` | `install_photo` | `other`.
2. UI на странице заказа — блок «Документы и фото», кнопка «Добавить».
   На телефоне `<input type="file" accept="image/*" capture="environment">` —
   открывает камеру.
3. Клиентское сжатие: canvas → 1600px по большей стороне, JPEG q=82.
   Фото 4 МБ → ~300 КБ.
4. Загрузка: server action даёт presigned PUT URL → браузер льёт напрямую в S3 →
   сервер сохраняет запись в БД.
5. Просмотр: presigned GET URL на 5 минут (приватная отдача, не публичная).
6. Права:
   - Менеджер/директор: загружают и видят всё (договоры)
   - Замерщик: загружает фото замера, видит свои
   - Установщик: загружает фото установленной двери, видит свои
   - На публичной `/order/[token]` фото НЕ показываем
7. Удаление: только директор.
8. Env vars (Timeweb): `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`,
   `S3_ACCESS_KEY`, `S3_SECRET_KEY`.
9. Зависимости: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (Timeweb S3
   совместим с AWS S3 API).

Что НЕ делаем в MVP: OCR договора, электронная подпись клиентом, генерация PDF
договора, версионирование файлов.

Что нужно от пользователя перед стартом:
- Создать приватный бакет в Timeweb S3 (например `armora-uploads`)
- Прислать `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`,
  `S3_SECRET_KEY`
- Подтвердить: только фото (jpeg/png/heic) или ещё PDF/Word договоры?
