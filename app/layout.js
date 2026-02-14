import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata = {
  title: "JMR Punto de Venta",
  description: "Sistema de gestión comercial — Marroquinería JMR",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <AuthProvider>
          <Sidebar />
          {/* 
            lg: empuja el contenido a la derecha del sidebar colapsado (w-16 = 64px)
            mobile: agrega padding-top para la topbar fija (h-14 = 56px)
            
            ✅ ELIMINADO padding px-4 py-6 para que /login no tenga scroll
          */}
          <main className="lg:pl-16 pt-14 lg:pt-0 min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}