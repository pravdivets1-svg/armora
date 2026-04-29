import { Phone, AlertCircle } from 'lucide-react';
import { phoneDigits } from '@/lib/format';

export default function NotFound() {
  const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '+7 (495) 123-45-67';
  const companyPhoneDigits =
    process.env.NEXT_PUBLIC_COMPANY_PHONE_DIGITS ?? phoneDigits(companyPhone);

  return (
    <main className="min-h-screen bg-base flex items-center justify-center px-5">
      <div className="max-w-sm w-full rounded-md border border-border bg-surface p-7 text-center shadow-e2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-bad-soft border border-bad/25 text-bad">
          <AlertCircle size={18} strokeWidth={1.75} />
        </div>
        <h1 className="mt-4 text-[18px] font-semibold tracking-tight text-fg">Заказ не найден</h1>
        <p className="mt-2 text-[13.5px] text-muted">
          Проверьте ссылку. Если уверены, что она правильная — позвоните в компанию.
        </p>
        <a
          href={`tel:+${companyPhoneDigits}`}
          className="inline-flex items-center gap-2 mt-5 px-4 h-9 rounded-md
                     bg-accent hover:bg-accent-hover text-white font-medium text-[13px] transition-colors duration-150"
        >
          <Phone size={14} strokeWidth={2} /> {companyPhone}
        </a>
      </div>
    </main>
  );
}
