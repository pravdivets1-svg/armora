'use client';

import { useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { MessageSquare, Send } from 'lucide-react';
import type { Role } from '@prisma/client';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ds/card';
import { ROLE_LABEL } from '@/lib/labels';
import { fmtDateTime } from '@/lib/format';
import { addCommentAction } from '../actions';

type Comment = {
  id: string;
  text: string;
  createdAt: Date;
  author: { fullName: string; role: Role };
};

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md
                 bg-accent hover:bg-accent-hover text-white
                 disabled:opacity-50 transition-colors duration-150"
      title="Отправить"
    >
      <Send size={14} strokeWidth={2} />
    </button>
  );
}

export default function CommentsBlock({
  orderId,
  comments,
}: {
  orderId: string;
  comments: Comment[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(formData: FormData) {
    await addCommentAction(orderId, formData);
    formRef.current?.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <MessageSquare size={11} strokeWidth={1.75} /> Комментарии исполнителей
        </CardTitle>
      </CardHeader>
      <CardBody>
        {comments.length === 0 ? (
          <div className="text-[13px] text-subtle mb-3">Комментариев пока нет</div>
        ) : (
          <ul className="space-y-3 text-[13px] mb-3">
            {comments.map((c) => (
              <li key={c.id} className="border-l-2 border-border pl-3">
                <div className="text-[12px] text-muted">
                  <span className="font-medium text-fg">{c.author.fullName}</span>
                  <span> · {ROLE_LABEL[c.author.role].toLowerCase()} · {fmtDateTime(c.createdAt)}</span>
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words text-fg/90">{c.text}</div>
              </li>
            ))}
          </ul>
        )}

        <form ref={formRef} action={handleAction} className="flex gap-2">
          <input
            name="text"
            required
            maxLength={2000}
            placeholder="Добавить комментарий..."
            className="flex-1 bg-base border border-border text-fg
                       rounded-md px-3 h-9 text-[13px] placeholder:text-subtle
                       focus:outline-none focus:border-accent transition-colors duration-150"
          />
          <SubmitBtn />
        </form>
      </CardBody>
    </Card>
  );
}
