'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { MessageSquare, Send, AlertCircle } from 'lucide-react';
import type { Role } from '@prisma/client';
import { Card, Input } from '@/components/ui';
import { ROLE_LABEL } from '@/lib/labels';
import { fmtDateTime } from '@/lib/format';
import { addCommentAction, type CommentActionState } from '../actions';

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
      aria-label="Отправить комментарий"
      className="inline-flex items-center justify-center gap-1.5 w-10 h-10 rounded-md
                 text-[14px] bg-text1 text-white
                 hover:bg-text1/90 disabled:opacity-50 transition-colors shrink-0"
    >
      <Send size={14} />
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

  // Биндим orderId в server action; форма получает (state, fd)
  const action = addCommentAction.bind(null, orderId);
  const [state, formAction] = useFormState<CommentActionState, FormData>(action, undefined);

  // При успешной отправке чистим форму. Если ошибка — оставляем текст,
  // чтобы пользователь не потерял написанное.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <Card title="Комментарии исполнителей" icon={<MessageSquare size={12} />}>
      {comments.length === 0 ? (
        <div className="text-[13px] text-text3 mb-3">Комментариев пока нет —</div>
      ) : (
        <ul className="divide-y divide-borderc/60 text-[14px] mb-3 -mt-1">
          {comments.map((c) => (
            <li key={c.id} className="py-2.5 first:pt-1">
              <div className="text-[12px] text-text3 tabular-nums">
                <span className="font-medium text-text1">{c.author.fullName}</span>
                <span> · {ROLE_LABEL[c.author.role].toLowerCase()} · {fmtDateTime(c.createdAt)}</span>
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words text-text1">{c.text}</div>
            </li>
          ))}
        </ul>
      )}

      {state && !state.ok && (
        <div className="mb-2 flex items-start gap-2 rounded-md bg-bad2-soft border border-bad2/20 px-3 py-2 text-[13px] text-bad2">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex gap-2">
        <Input
          name="text"
          required
          maxLength={2000}
          placeholder="Добавить комментарий..."
          aria-label="Текст комментария"
          className="h-10"
        />
        <SubmitBtn />
      </form>
    </Card>
  );
}
