'use client';

export default function PageWrapper({ children }) {
  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6">
      {children}
    </div>
  );
}