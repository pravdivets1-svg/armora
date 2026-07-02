'use client';

// Плавный fade при смене страниц внутри (admin) layout.
// AnimatePresence + key=pathname — каждая новая страница появляется fade+slide,
// предыдущая — мгновенно убирается (mode='wait' тут даёт лаг, не используем).

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    // 0.18s вместо 0.28s: переход на каждый тап по таб-бару — 280мс ощущалась
    // как пауза в полевом сценарии. reduced-motion глушится MotionConfig в layout.
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
