"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Category } from "@/lib/articles";
import { cn } from "@/lib/utils";

interface SidebarProps {
  categories: Category[];
}

export default function Sidebar({ categories }: SidebarProps) {
  const pathname = usePathname();

  if (pathname === "/support") {
    return null;
  }

  const essentialGuides =
    categories.find((category) => category.slug === "getting-started")
      ?.articles ?? [];

  return (
    <aside className="sticky top-11 hidden h-[calc(100vh-2.75rem)] w-[188px] shrink-0 overflow-y-auto border-r border-[#e6e8eb] px-3 py-4 lg:block">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#65707e]">
        Help center
      </p>

      <section className="mt-5">
        <h2 className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#65707e]">
          Essential guides
        </h2>
        <ul className="mt-2.5 space-y-1.5">
          {essentialGuides.slice(0, 4).map((article) => (
            <li key={article.slug}>
              <Link
                href={`/support/articles/${article.slug}`}
                className="line-clamp-2 text-[10px] text-[#1d2329] transition-colors hover:text-black"
              >
                {article.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#65707e]">
          Categories
        </h2>
        <nav className="mt-2.5 space-y-1">
          {categories.map((category) => {
            const isActive =
              pathname === `/support/${category.slug}` ||
              pathname.startsWith(`/support/${category.slug}/`);

            return (
              <Link
                key={category.slug}
                href={`/support/${category.slug}`}
                className={cn(
                  "block rounded px-1.5 py-1 text-[10px] transition-colors",
                  isActive
                    ? "bg-[#ebedf0] font-semibold text-black"
                    : "text-[#1d2329] hover:bg-[#f0f2f4] hover:text-black"
                )}
              >
                {category.name}
              </Link>
            );
          })}
        </nav>
      </section>
    </aside>
  );
}
