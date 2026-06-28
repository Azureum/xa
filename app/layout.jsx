import "./globals.css";

export const metadata = {
  title: "XA",
  description: "A Vercel-ready webapp starter."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
