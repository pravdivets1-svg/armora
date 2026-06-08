import { LogOut } from 'lucide-react';
import { requireUser } from '@/lib/auth-helpers';
import { ROLE_LABEL } from '@/lib/labels';
import { PageHeader, SectionCard, KeyValueRow, Button } from '@/components/uikit';
import { logoutAction } from '@/app/(auth)/actions';
import NotificationsBlock from './notifications-block';

export const metadata = { title: 'Профиль — Armora' };
export const dynamic = 'force-dynamic';

function loginOf(email: string | null | undefined): string {
  if (!email) return '—';
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(0, at) : email;
}

export default async function SettingsPage() {
  const me = await requireUser();

  return (
    <>
      <PageHeader title="Профиль" sub={me.name ?? me.email ?? ''} />

      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-4 space-y-2.5 pb-12">
        <SectionCard title="Аккаунт">
          <KeyValueRow label="Имя" value={me.name ?? '—'} />
          <KeyValueRow label="Логин" value={loginOf(me.email)} mono />
          <KeyValueRow label="Роль" value={ROLE_LABEL[me.role]} />
        </SectionCard>

        <NotificationsBlock />

        <SectionCard title="Сессия">
          <form action={logoutAction}>
            <Button type="submit" variant="secondary" block>
              <LogOut size={16} /> Выйти
            </Button>
          </form>
        </SectionCard>
      </div>
    </>
  );
}
