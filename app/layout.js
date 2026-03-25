import "./globals.css";

export const metadata = {
  title: "Apontamentos App",
  description: "Projeto iniciado do zero"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
