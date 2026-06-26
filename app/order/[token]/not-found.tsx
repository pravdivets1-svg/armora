import { Phone, AlertCircle } from 'lucide-react';
import { phoneDigits } from '@/lib/format';

export default function NotFound() {
  const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '+7 (495) 123-45-67';
  const companyPhoneDigits =
    process.env.NEXT_PUBLIC_COMPANY_PHONE_DIGITS ?? phoneDigits(companyPhone);

  return (
    <main className="min-h-screen bg-app flex items-center justify-center px-5">
      <div className="max-w-sm w-full bg-card border border-borderc rounded-md p-7 text-center">
        <AlertCircle size={20} className="mx-auto text-bad2" />
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-text1">Заказ не найден</h1>
        <p className="mt-2 text-sm text-text3">
          Проверьте ссылку. Если уверены, что она правильная — позвоните в компанию.
        </p>
        <a
          href={`tel:+${companyPhoneDigits}`}
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-md
                     bg-accent hover:bg-accent/90 text-white font-medium text-sm tabular-nums
                     transition-colors"
        >
          <Phone size={14} /> {companyPhone}
        </a>
      </div>
    </main>
  );
}
