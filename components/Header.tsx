// components/Header.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Header() {
  const { pathname } = useRouter();

  // サーバ/クライアントで同一になる固定配列（順序も固定）
  const NAV = [
    { href: "/matches",        label: "試合を探す" },
    { href: "/create_match",   label: "試合作成" },
    { href: "/applications",   label: "応募管理" },
    { href: "/my_applications",label: "自分の応募" },
    { href: "/create_team",    label: "チーム作成" },
    { href: "/join_team",      label: "チームに参加" },
    { href: "/profile",        label: "プロフィール" },
    { href: "/login",          label: "ログイン" },
  ] as const;

  // もし将来「ログインで文言を変える」等をしたい場合の型崩れ防止
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" className="brand">Match to Match</Link>

        {/* 形を固定したままクラスだけ切り替える ⇒ Hydration差異が出ない */}
        <nav className="nav" suppressHydrationWarning>
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={mounted && isActive(item.href) ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
