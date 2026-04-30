// Public-key для клиента (доступен на этапе сборки и в браузере).
// VAPID_PUBLIC_KEY должен начинаться с "B" и быть base64url-строкой ~88 символов.
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
