import Link from "next/link";

const NAV_LINKS = [
  "Plans",
  "Devices",
  "Deals",
  "Coverage",
  "Support",
];

export default function TopNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-black">
      <div className="mx-auto flex h-11 max-w-[1280px] items-center justify-between px-4">
        <Link href="/support" className="flex items-center gap-1.5">
          <span className="text-[14px] font-bold tracking-tight text-tm-magenta">
            T-Mobile
          </span>
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-[10px] font-medium text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm"
            >
              {item}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="rounded-full border border-white/30 px-3 py-1 text-[10px] font-medium text-white transition hover:border-white">
            Log in
          </button>
          <button className="rounded-full bg-tm-magenta px-3 py-1 text-[10px] font-semibold text-white transition hover:bg-tm-magenta-hover">
            Sign up
          </button>
        </div>
      </div>
    </header>
  );
}
