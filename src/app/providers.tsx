'use client';

import { ChartProvider } from '@/context/ChartContext';
import { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return <ChartProvider>{children}</ChartProvider>;
}
