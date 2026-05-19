"use client";

import {
  BookOpen,
  FileUp,
  Home,
  LogOut,
  Moon,
  PanelTop,
  Table2
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ThemeMode = "default" | "dark" | "excel";

const themeModes: Array<{
  value: ThemeMode;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { value: "default", label: "기본", icon: PanelTop },
  { value: "dark", label: "다크", icon: Moon },
  { value: "excel", label: "엑셀", icon: Table2 }
];

const navItems = [
  { href: "/", label: "대시보드", icon: Home },
  { href: "/upload", label: "업로드", icon: FileUp },
  { href: "/wrong-notes", label: "오답노트", icon: BookOpen }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeMode>("default");
  const isLogin = pathname === "/login";

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("ooo-theme") as ThemeMode;
    if (["default", "dark", "excel"].includes(storedTheme)) {
      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
    } else {
      document.documentElement.dataset.theme = "default";
    }
  }, []);

  function changeTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("ooo-theme", nextTheme);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <BookOpen size={18} />
          </span>
          <span>OOO Interview</span>
        </Link>

        <nav className="nav" aria-label="주요 메뉴">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`nav-link${active ? " active" : ""}`}
                href={item.href}
                key={item.href}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="shell-actions">
          <div className="theme-toggle" aria-label="화면 모드">
            {themeModes.map((mode) => {
              const Icon = mode.icon;

              return (
                <button
                  className={`theme-button${theme === mode.value ? " active" : ""}`}
                  key={mode.value}
                  onClick={() => changeTheme(mode.value)}
                  title={`${mode.label} 모드`}
                  type="button"
                >
                  <Icon size={15} />
                  {mode.label}
                </button>
              );
            })}
          </div>
          <button
            className="icon-button"
            onClick={logout}
            title="로그아웃"
            type="button"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
