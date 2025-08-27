export const metadata = {
  title: "Ombrello Admin",
  description: "Admin dashboard for Ombrello",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
