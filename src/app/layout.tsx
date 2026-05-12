import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'EasyGraph — AI 데이터 시각화',
  description: '엑셀 파일만 업로드하면 전문가 수준의 차트를 자동으로 생성해드립니다. AI 인사이트, 누적 평균, 증감 분석까지.',
  keywords: ['데이터 시각화', '엑셀 차트', 'AI 분석', '그래프 생성'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
