// Layout админских роутов: Sidebar (240/64) + контент.

import { auth } from '@/auth';
import { ROLE_LABEL } from '@/lib/labels';
import { Sidebar } from '@/components/ds/sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user
    ? { fullName: session.user.name ?? '', role: ROLE_LABEL[session.user.role] }
    : null;

  return (
    <div className="min-h-screen flex bg-base text-fg">
      <Sidebar user={user} />
      <div className="flex-1 min-w-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}
