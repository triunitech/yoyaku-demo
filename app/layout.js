import './globals.css';

export const metadata = {
  title: '予約管理デモ | TRIUNITECH',
  description: '小規模店舗向けの予約管理デモです（TRIUNITECH 自社制作。受託案件ではありません）。',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
