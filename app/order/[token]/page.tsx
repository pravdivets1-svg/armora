// Публичная страница заказа /order/[token] — premium light, спокойный, без sidebar.

import { notFound } from 'next/navigation';
import { Phone, Check, Archive } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/labels';
import { fmtMoney, fmtFullDateTime, phoneDigits } from '@/lib/format';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ds/card';

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
    <main className="min-h-screen bg-base text-fg">
      <header className="sticky top-0 z-10 bg-base/85 backdrop-blur-xl border-b border-border">
        <div className="max-w-xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent-gradient flex items-center justify-center text-white font-mono font-semibold text-[13px]">
              {companyName[0]}
            </div>
            <div>
              <div className="text-[14px] font-semibold tracking-tight text-fg">{companyName}</div>
              <a href={`tel:+${companyPhoneDigits}`} className="text-[11px] text-muted hover:text-fg transition-colors duration-150">
                {companyPhone}
              </a>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-subtle">Статус</div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-5 py-6 space-y-3">
        <Card>
          <CardBody className="py-6">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted">
              Заказ № {order.number}
            </div>
            <h1 className="text-[24px] font-semibold tracking-tight text-fg mt-2">
              Здравствуйте, {firstName}
            </h1>
            <p className="text-[13.5px] text-muted mt-2">
              Здесь вы видите актуальный статус вашей двери.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="py-6">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted font-medium">
              <span>Текущий этап</span>
              <span className="font-mono normal-case tracking-normal">Шаг {stepNumber} из {STAGE_ORDER.length}</span>
            </div>
            <div className="mt-2 text-[18px] font-semibold tracking-tight text-fg">
              {STAGE_LABEL[order.stage]}
            </div>

            <div className="mt-4 h-1.5 w-full bg-base rounded-full overflow-hidden border border-border">
              <div className="h-full bg-accent-gradient rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>

            <ol className="mt-6 space-y-3 text-[13.5px]">
              {STAGE_ORDER.map((s, i) => {
                const done = i < currentStepIndex;
                const current = i === currentStepIndex;
                return (
                  <li
                    key={s}
                    className={
                      current ? 'flex items-center gap-3 font-medium text-fg' :
                      done ? 'flex items-center gap-3 text-muted' :
                      'flex items-center gap-3 text-subtle'
                    }
                  >
                    {done ? (
                      <span className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
                        <Check size={11} strokeWidth={2.5} />
                      </span>
                    ) : current ? (
                      <span className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[11px] font-mono font-semibold shrink-0">
                        {i + 1}
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-[11px] font-mono shrink-0">
                        {i + 1}
                      </span>
                    )}
                    <span>{STAGE_LABEL[s]}</span>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>

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

        <Card>
          <CardHeader><CardTitle>Оплата</CardTitle></CardHeader>
          <CardBody>
            <dl className="space-y-2.5 text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-muted">Сумма заказа</dt>
                <dd className="font-mono font-medium tnum text-fg">{fmtMoney(order.totalAmount as any)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Аванс</dt>
                <dd className="font-mono font-medium tnum text-fg">{fmtMoney(order.prepayment as any)}</dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-border">
                <dt className="text-fg">Остаток к оплате</dt>
                <dd className="font-mono font-bold text-[20px] tnum text-fg">{fmtMoney(remaining)}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <section className="text-center py-4">
          <div className="text-[13.5px] text-muted">Вопросы по заказу?</div>
          <a
            href={`tel:+${companyPhoneDigits}`}
            className="inline-flex items-center gap-2 mt-3 px-5 h-10 rounded-md
                       bg-accent hover:bg-accent-hover text-white font-medium text-[14px] shadow-e1 transition-colors duration-150"
          >
            <Phone size={14} strokeWidth={2} /> Позвонить в компанию
          </a>
          {order.tokenExpiresAt && (
            <div className="mt-6 text-[11px] text-subtle">
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
  const dot = kind === 'survey' ? 'bg-accent' : 'bg-ok';

  return (
    <Card>
      <CardBody className="py-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          {title}
        </div>
        {at && <div className="mt-2 text-[16px] font-semibold tracking-tight text-fg">{fmtFullDateTime(at)}</div>}
        {person && (
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted">{role}</div>
              <div className="font-medium mt-0.5 text-fg">{person.fullName}</div>
            </div>
            {person.phone && (
              <a
                href={`tel:+${phoneDigits(person.phone)}`}
                className="inline-flex items-center gap-2 px-3.5 h-9 rounded-md
                           bg-surface hover:bg-fg/5 text-fg border border-border hover:border-borderHover text-[13px] font-medium transition-colors duration-150"
              >
                <Phone size={14} strokeWidth={2} /> Позвонить
              </a>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function EmptyBlock({ kind }: { kind: 'survey' | 'install' }) {
  const title = kind === 'survey' ? 'Замер' : 'Установка';
  const text =
    kind === 'survey'
      ? 'Дата будет назначена в ближайшее время'
      : 'Дата будет назначена после готовности двери';

  return (
    <div className="rounded-md border border-dashed border-border bg-surface/50 p-5">
      <div className="text-[10px] uppercase tracking-wider text-muted font-medium">{title}</div>
      <div className="mt-1.5 text-[13.5px] text-muted">{text}</div>
    </div>
  );
}

function ExpiredView() {
  const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '+7 (495) 123-45-67';
  const companyPhoneDigits =
    process.env.NEXT_PUBLIC_COMPANY_PHONE_DIGITS ?? phoneDigits(companyPhone);

  return (
    <main className="min-h-screen bg-base flex items-center justify-center px-5">
      <Card className="max-w-sm w-full">
        <CardBody className="text-center py-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-base border border-border text-subtle">
            <Archive size={18} strokeWidth={1.75} />
          </div>
          <h1 className="mt-4 text-[18px] font-semibold tracking-tight text-fg">Срок ссылки истёк</h1>
          <p className="mt-2 text-[13.5px] text-muted">
            Заказ закрыт давно. Если у вас вопрос — позвоните в компанию.
          </p>
          <a
            href={`tel:+${companyPhoneDigits}`}
            className="inline-flex items-center gap-2 mt-5 px-4 h-9 rounded-md
                       bg-accent hover:bg-accent-hover text-white font-medium text-[13px] transition-colors duration-150"
          >
            <Phone size={14} strokeWidth={2} /> {companyPhone}
          </a>
        </CardBody>
      </Card>
    </main>
  );
}
