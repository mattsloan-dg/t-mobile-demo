"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Category } from "@/lib/articles";
import { cn } from "@/lib/utils";

interface TopNavProps {
  categories: Category[];
}

export default function TopNav({ categories }: TopNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40">
      {/* Primary nav bar */}
      <div className="bg-black">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
          <Link href="/support" className="flex items-center">
            <span className="text-[28px] font-extrabold tracking-tight text-tm-magenta">
              T-Mobile
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/support/${category.slug}`}
                className="text-[14px] font-medium text-white/80 transition-colors hover:text-white"
              >
                {category.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/support"
              className="rounded-full border border-white/30 px-5 py-2 text-[13px] font-medium text-white transition hover:border-white hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>

      {/* Support sub-nav breadcrumb strip */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-12 max-w-[1280px] items-center gap-6 px-6">
          <Link
            href="/support"
            className={cn(
              "text-[13px] font-semibold transition-colors",
              pathname === "/support"
                ? "text-tm-magenta"
                : "text-gray-600 hover:text-tm-magenta"
            )}
          >
            Support Home
          </Link>
          {categories.map((category) => {
            const isActive =
              pathname === `/support/${category.slug}` ||
              pathname.startsWith(`/support/${category.slug}/`);

            return (
              <Link
                key={category.slug}
                href={`/support/${category.slug}`}
                className={cn(
                  "hidden text-[13px] font-medium transition-colors md:block",
                  isActive
                    ? "text-tm-magenta"
                    : "text-gray-500 hover:text-tm-magenta"
                )}
              >
                {category.name}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
