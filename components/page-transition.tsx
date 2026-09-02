'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

const variants = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  enter:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } },
  exit:    { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const } },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        ref={ref}
        key={pathname}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
        onAnimationComplete={(definition) => {
          if (definition === 'enter' && ref.current) {
            ref.current.style.transform = '';
            ref.current.style.filter = '';
          }
        }}
        style={{ minHeight: '100%', width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
