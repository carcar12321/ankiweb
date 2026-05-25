"use client";

import {
  BookOpen,
  Bot,
  FileUp,
  Home,
  Moon,
  NotebookPen,
  PanelTop,
  RotateCcw,
  Shuffle,
  Sparkles,
  Table2
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SelectionMemoMenu } from "@/components/selection-memo-menu";

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
  { href: "/random-study", label: "랜덤학습", icon: Shuffle },
  { href: "/review", label: "복습하기", icon: RotateCcw },
  { href: "/ai-study", label: "AI 학습", icon: Bot },
  { href: "/memos", label: "메모장", icon: NotebookPen },
  { href: "/upload", label: "업로드", icon: FileUp },
  { href: "/wrong-notes", label: "오답노트", icon: BookOpen },
  { href: "/generated-questions", label: "AI 초안", icon: Sparkles }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<ThemeMode>("default");

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
        </div>
      </header>
      {children}
      <SelectionMemoMenu />
    </div>
  );
}
