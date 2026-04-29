// Публичная страница заказа: /order/[token] — modern 2026 client view.

import { notFound } from 'next/navigation';
import { Phone, Check, Archive } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import { fmtMoney, fmtFullDateTime, phoneDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Статус заказа',
  robots: { index: false, follow: false },
};

export default async function PublicOrderPage({
  params,
}: {
  params: { token: string };
}) {
  const order = await prisma.order.findUnique({
    where: { publicToken: params.token },
    include: {
      surveyor:  { select: { fullName: true, phone: true } },
      installer: { select: { fullName: true, phone: true } },
    },
  });

  if (!order) notFound();
  if (order.tokenExpiresAt && order.tokenExpiresAt.getTime() < Date.now()) {
    return <ExpiredView />;
  }

  const companyName  = process.env.NEXT_PUBLIC_COMPANY_NAME  ?? 'Armora';
  const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '+7 (495) 123-45-67';
  const companyPhoneDigits =
    process.env.NEXT_PUBLIC_COMPANY_PHONE_DIGITS ?? phoneDigits(companyPhone);

  const currentStepIndex = STAGE_ORDER.indexOf(order.stage);
  const stepNumber = currentStepIndex + 1;
  const percent = (stepNumber / STAGE_ORDER.length) * 100;

  const remaining = Math.max(0, Number(order.totalAmount) - Number(order.prepayment));
  const firstName = order.clientName.split(/\s+/)[0] ?? order.clientName;

  return (
    <main className="min-h-screen bg-page">
      <header className="bg-white/95 backdrop-blur border-b border-line">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-ink-900">{companyName}</div>
            <a href={`tel:+${companyPhoneDigits}`} className="text-[12px] text-ink-500 hover:text-ink-900">
              {companyPhone}
            </a>
          </div>
          <div className="text-[11px] text-ink-500 uppercase tracking-wider">Статус</div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-5 py-6 space-y-3">

        <section className="bg-white border border-line rounded-lg p-6">
          <div className="text-[11px] text-ink-500 uppercase tracking-wide">Заказ № {order.number}</div>
          <h1 className="text-h1 text-ink-900 mt-2">
            Здравствуйте, {firstName}
          </h1>
          <p className="text-[14px] text-ink-500 mt-2">
            Здесь вы видите актуальный статус вашей двери.
          </p>
        </section>

        {/* Этап + прогресс */}
        <section className="bg-white border border-line rounded-lg p-6">
          <div className="flex items-center justify-between text-[11px] text-ink-500 uppercase tracking-wide">
            <span>Текущий этап</span>
            <span className="normal-case tracking-normal">Шаг {stepNumber} из {STAGE_ORDER.length}</span>
          </div>
          <div className="mt-2 text-[18px] font-semibold text-ink-900">
            {STAGE_LABEL[order.stage]}
          </div>

          <div className="mt-4 h-1.5 w-full bg-canvas rounded-full overflow-hidden">
            <div className="h-full bg-ink-900 rounded-full" style={{ width: `${percent}%` }} />
          </div>

          <ol className="mt-6 space-y-3 text-[14px]">
            {STAGE_ORDER.map((s, i) => {
              const done = i < currentStepIndex;
              const current = i === currentStepIndex;
              return (
                <li
                  key={s}
                  className={`flex items-center gap-3 ${
                    current ? 'font-medium text-ink-900' :
                    done ? 'text-ink-500' :
                    'text-ink-400'
                  }`}
                >
                  {done ? (
                    <span className="w-5 h-5 rounded-full bg-ink-900 text-white flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </span>
                  ) : current ? (
                    <span className="w-5 h-5 rounded-full bg-ink-900 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {i + 1}
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-white border border-line flex items-center justify-center text-[11px] shrink-0">
                      {i + 1}
                    </span>
                  )}
                  <span>{STAGE_LABEL[s]}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {(order.surveyor || order.surveyAt) ? (
          <PersonBlock kind="survey" at={order.surveyAt} person={order.surveyor} />
        ) : (
          <EmptyBlock kind="survey" />
        )}

        {(order.installer || order.installAt) ? (
          <PersonBlock kind="install" at={order.installAt} person={order.installer} />
        ) : (
          <EmptyBlock kind="install" />
        )}

        <section className="bg-white border border-line rounded-lg p-6">
          <div className="text-[11px] text-ink-500 uppercase tracking-wide mb-4">Оплата</div>
          <dl className="space-y-2.5 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-ink-500">Сумма заказа</dt>
              <dd className="font-medium tabular-nums text-ink-900">{fmtMoney(order.totalAmount as any)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Аванс</dt>
              <dd className="font-medium tabular-nums text-ink-900">{fmtMoney(order.prepayment as any)}</dd>
            </div>
            <div className="flex justify-between pt-3 border-t border-line">
              <dt className="text-ink-900">Остаток к оплате</dt>
              <dd className="font-bold text-[20px] tabular-nums text-ink-900">{fmtMoney(remaining)}</dd>
            </div>
          </dl>
        </section>

        <section className="text-center py-4">
          <div className="text-[14px] text-ink-500">Вопросы по заказу?</div>
          <a
            href={`tel:+${companyPhoneDigits}`}
            className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 rounded-md
                       bg-ink-900 hover:bg-black text-white font-medium text-[14px]"
          >
            <Phone size={14} /> Позвонить в компанию
          </a>
          {order.tokenExpiresAt && (
            <div className="mt-6 text-[12px] text-ink-400">
              Ссылка действительна до {fmtFullDateTime(order.tokenExpiresAt)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PersonBlock({
  kind,
  at,
  person,
}: {
  kind: 'survey' | 'install';
  at: Date | null;
  person: { fullName: string; phone: string | null } | null;
}) {
  const title = kind === 'survey' ? 'Замер' : 'Установка';
  const role = kind === 'survey' ? 'Замерщик' : 'Установщик';
  const dot = kind === 'survey' ? 'bg-blue-500' : 'bg-emerald-500';

  return (
    <section className="bg-white border border-line rounded-lg p-6">
      <div className="flex items-center gap-2 text-[11px] text-ink-500 uppercase tracking-wide">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {title}
      </div>
      {at && <div className="mt-2 text-[16px] font-semibold text-ink-900">{fmtFullDateTime(at)}</div>}
      {person && (
        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] text-ink-500">{role}</div>
            <div className="font-medium mt-0.5 text-ink-900">{person.fullName}</div>
          </div>
          {person.phone && (
            <a
              href={`tel:+${phoneDigits(person.phone)}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md
                         bg-white hover:bg-canvas text-ink-900 border border-line text-[14px] font-medium"
            >
              <Phone size={14} /> Позвонить
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function EmptyBlock({ kind }: { kind: 'survey' | 'install' }) {
  const title = kind === 'survey' ? 'Замер' : 'Установка';
  const text =
    kind === 'survey'
      ? 'Дата будет назначена в ближайшее время'
      : 'Дата будет назначена после готовности двери';

  return (
    <section className="bg-white border border-dashed border-line rounded-lg p-6">
      <div className="text-[11px] text-ink-500 uppercase tracking-wide">{title}</div>
      <div className="mt-1.5 text-ink-500 text-[14px]">{text}</div>
    </section>
  );
}

function ExpiredView() {
  const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '+7 (495) 123-45-67';
  const companyPhoneDigits =
    process.env.NEXT_PUBLIC_COMPANY_PHONE_DIGITS ?? phoneDigits(companyPhone);

  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-5">
      <div className="max-w-sm w-full bg-white border border-line rounded-lg p-7 text-center">
        <Archive size={20} className="mx-auto text-ink-500" />
        <h1 className="mt-4 text-[18px] font-semibold tracking-tight text-ink-900">Срок ссылки истёк</h1>
        <p className="mt-2 text-[14px] text-ink-500">
          Заказ закрыт давно. Если у вас вопрос — позвоните в компанию.
        </p>
        <a
          href={`tel:+${companyPhoneDigits}`}
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-md
                     bg-ink-900 hover:bg-black text-white font-medium text-[14px]"
        >
          <Phone size={14} /> {companyPhone}
        </a>
      </div>
    </main>
  );
}
