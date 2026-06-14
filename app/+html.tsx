// 웹(PWA) 루트 HTML — Expo Router가 정적 내보내기 시 모든 페이지를 이 틀로 감쌈
// PWA 설치에 필요한 manifest / 아이콘 / 테마색 / 서비스워커 등록을 여기서 주입
import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* PWA 설치 메타 */}
        <link rel="manifest" href="/acoach/manifest.json" />
        <meta name="theme-color" content="#208AEF" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="에이코치" />
        <link rel="apple-touch-icon" href="/acoach/icon-192.png" />

        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: swRegister }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// 서비스워커 등록 (페이지 로드 후)
const swRegister = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/acoach/sw.js').catch(function () {});
  });
}`;
