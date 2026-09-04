import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <nav>
        <Link href="/">VoxVerity</Link>
      </nav>
      <main>{children}</main>
    </div>
  );
}
