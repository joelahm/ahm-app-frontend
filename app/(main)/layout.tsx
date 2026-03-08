export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-screen flex-col">
      <main className="container mx-auto max-w-7xl flex-grow px-6 pt-16">
        {children}
      </main>
    </div>
  );
}
