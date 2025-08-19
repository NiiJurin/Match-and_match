// components/Header.tsx
import Link from "next/link";
import { useRouter } from "next/router";

export default function Header() {
  const { pathname } = useRouter(); // ← コンポーネントの中で呼ぶ

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" className="brand">Match to Match</Link>
        <nav className="nav">
          <Link href="/matches" className={isActive("/matches") ? "active" : ""}>試合を探す</Link>
          <Link href="/create_match" className={isActive("/create_match") ? "active" : ""}>試合作成</Link>
          <Link href="/applications" className={isActive("/applications") ? "active" : ""}>応募管理</Link>
          <Link href="/my_applications" className={isActive("/my_applications") ? "active" : ""}>自分の応募</Link>
          <Link href="/profile" className={isActive("/profile") ? "active" : ""}>プロフィール</Link>
          <Link href="/login" className={isActive("/login") ? "active" : ""}>ログイン</Link>
        </nav>
      </div>
    </header>
  );
}
