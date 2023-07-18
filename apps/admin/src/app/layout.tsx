import { Nav } from "./Nav";
import "./styles.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <div className="min-h-full">
          <Nav />
          <div className="py-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
          </div>
        </div>
      </body>
    </html>
  );
}
