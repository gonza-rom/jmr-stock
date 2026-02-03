import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "JMR Stock - Sistema de Control de Stock",
  description: "Sistema para gestión de inventario y control de stock",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}