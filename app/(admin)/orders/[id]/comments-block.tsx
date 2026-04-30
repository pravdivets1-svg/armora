'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { MessageSquare, Send, AlertCircle } from 'lucide-react';
import type { Role } from '@prisma/client';
import { Card } from '@/components/ui';
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
      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md
                 text-sm bg-white hover:bg-canvas text-ink-900 border border-line
                 disabled:opacity-50"
      title="Отправить"
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
        <div className="text-sm text-ink-400 mb-3">Комментариев пока нет</div>
      ) : (
        <ul className="space-y-3 text-sm mb-3">
          {comments.map((c) => (
            <li key={c.id} className="border-l-2 border-line pl-3">
              <div className="text-xs text-ink-500">
                <span className="font-medium text-ink-900">{c.author.fullName}</span>
                <span> · {ROLE_LABEL[c.author.role].toLowerCase()} · {fmtDateTime(c.createdAt)}</span>
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words text-ink-900">{c.text}</div>
            </li>
          ))}
        </ul>
      )}

      {state && !state.ok && (
        <div className="mb-2 flex items-start gap-2 rounded-md bg-bad/5 border border-bad/20 px-3 py-1.5 text-[13px] text-bad">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex gap-2">
        <input
          name="text"
          required
          maxLength={2000}
          placeholder="Добавить комментарий..."
          className="flex-1 bg-white border border-line text-ink-900
                     rounded-md px-3 py-1.5 text-sm placeholder:text-ink-400
                     focus:outline-none focus:border-ink-700"
        />
        <SubmitBtn />
      </form>
    </Card>
  );
}
