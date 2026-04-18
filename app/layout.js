export const metadata = {
  title: "Verona — Angelica",
  description: "Find love worth dying for.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; overflow-x: hidden; }
          body { height: 100dvh; }
          input, textarea { font-size: 16px; }
          #app-shell {
            max-width: 480px;
            margin: 0 auto;
            height: 100dvh;
            position: relative;
            box-shadow: 0 0 40px rgba(0,0,0,0.08);
          }
          @media (max-width: 480px) {
            #app-shell { box-shadow: none; }
          }
        `}</style>
      </head>
      <body><div id="app-shell">{children}</div></body>
    </html>
  );
}
