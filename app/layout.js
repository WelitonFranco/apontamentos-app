import "./globals.css";

export const metadata = {
  title: "QA Timer - Apontamentos",
  description: "Controle de tempo por issue",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}