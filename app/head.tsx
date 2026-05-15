export default function Head() {
  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <link rel="icon" href="/icons/icon-192.png" />
      {/* M55 brand surface color — synced with dark-plum header */}
      <meta name="theme-color" content="#1c1630" />
      {/* PWA / standalone: iOS web app capabilities */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="M55" />
    </>
  );
}
