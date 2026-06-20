import Link from 'next/link';
import { LogOut, Users as UsersIcon, ChevronRight } from 'lucide-react';
import type { Role } from '@prisma/client';
import { requireUser } from '@/lib/auth-helpers';
import { ROLE_LABEL } from '@/lib/labels';
import { PageHeader, SectionCard, KeyValueRow, Button } from '@/components/uikit';
import { logoutAction } from '@/app/(auth)/actions';
import { getRolePrefs } from '@/lib/notification-events';
import { prisma } from '@/lib/prisma';
import NotificationsBlock from './notifications-block';
import DirectorNotificationsBlock from './director-notifications-block';
import ControlRemindersBlock from './control-reminders-block';

export const metadata = { title: 'Профиль — Armora' };
export const dynamic = 'force-dynamic';

function loginOf(email: string | null | undefined): string {
  if (!email) return '—';
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(0, at) : email;
}

function ruCount(n: number): string {
  if (n === 1) return 'учётная запись';
  if (n >= 2 && n <= 4) return 'учётные записи';
  return 'учётных записей';
}

export default async function SettingsPage() {
  const me = await requireUser();
  const isDirector = me.role === 'director';
  const [matrix, usersCount, controlCfg] = await Promise.all([
    isDirector ? getRolePrefs() : Promise.resolve(null as Record<Role, Record<string, boolean>> | null),
    isDirector ? prisma.user.count() : Promise.resolve(0),
    isDirector
      ? prisma.controlReminderConfig.upsert({
          where:  { id: 'default' },
          update: {},
          create: { id: 'default' },
        })
      : Promise.resolve(null),
  ]);

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

        {isDirector && (
          <SectionCard title="Управление">
            <Link
              href="/users"
              className="flex items-center gap-3 px-1 py-2 min-h-[44px] -mx-1
                         rounded-md hover:bg-subtle/60 active:bg-subtle
                         transition-colors group"
            >
              <UsersIcon size={16} className="text-text3 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-text1 text-[14px]">Сотрудники</div>
                <div className="text-meta text-text3">
                  {usersCount} {ruCount(usersCount)} · логины, пароли, роли
                </div>
              </div>
              <ChevronRight size={14} className="text-text3 shrink-0" />
            </Link>
          </SectionCard>
        )}

        {isDirector && controlCfg && (
          <ControlRemindersBlock
            initial={{
              productionStaleEnabled:     controlCfg.productionStaleEnabled,
              productionStaleDays:        controlCfg.productionStaleDays,
              installedNoCloseEnabled:    controlCfg.installedNoCloseEnabled,
              installedNoCloseDays:       controlCfg.installedNoCloseDays,
              pendingClosureStaleEnabled: controlCfg.pendingClosureStaleEnabled,
              pendingClosureStaleDays:    controlCfg.pendingClosureStaleDays,
            }}
          />
        )}

        {isDirector && matrix && (
          <DirectorNotificationsBlock initialMatrix={matrix} />
        )}

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
