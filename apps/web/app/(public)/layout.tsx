import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <nav>
        <Link href="/">VoxVerity</Link>
        <Link href="/help">Help</Link>
        <Link href="/status">Status</Link>
        <Link href="/login">Sign In</Link>
        <Link href="/register">Register</Link>
      </nav>
      {children}
    </div>
  );
}
