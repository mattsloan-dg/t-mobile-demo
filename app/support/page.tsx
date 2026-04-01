import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { getCategories, loadArticles } from "@/lib/articles";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "getting-started": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-8">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  "account-and-billing": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-8">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  "network-and-coverage": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-8">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" />
    </svg>
  ),
  devices: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-8">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "getting-started": "Set up your device, activate service, and get started with T-Mobile.",
  "account-and-billing": "Manage your account, view bills, make payments, and more.",
  "network-and-coverage": "Check coverage, troubleshoot connectivity, and learn about 5G.",
  devices: "Get help with your phone, SIM card, and device settings.",
};

export default function SupportHomePage() {
  const categories = getCategories().filter(
    (category) => category.articles.length > 0
  );
  const searchArticles = loadArticles().map((article) => ({
    slug: article.slug,
    title: article.title,
  }));

  // Use the top 3 categories with the most articles for the cards
  const topCategories = [...categories]
    .sort((a, b) => b.articles.length - a.articles.length)
    .slice(0, 3);

  return (
    <>
      {/* Hero section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#E20074] via-[#B8005D] to-[#860046]">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-white/10" />
          <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-white/5" />
        </div>

        <div className="relative mx-auto max-w-[1280px] px-6 pb-16 pt-20 text-center">
          <h1 className="text-[48px] font-extrabold leading-tight tracking-tight text-white md:text-[56px]">
            Welcome to Support
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[18px] font-medium text-white/80">
            Find answers, get help, and manage your T-Mobile account.
          </p>
          <div className="mx-auto mt-8 flex max-w-[600px] justify-center">
            <SearchBar articles={searchArticles} variant="hero" />
          </div>
        </div>
      </section>

      {/* Category cards */}
      <section className="relative z-10 mx-auto -mt-10 max-w-[1280px] px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {topCategories.map((category) => (
            <Link
              key={category.slug}
              href={`/support/${category.slug}`}
              className="group rounded-2xl border border-gray-100 bg-white p-8 shadow-lg shadow-black/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#FFF0F7] text-tm-magenta transition-colors group-hover:bg-tm-magenta group-hover:text-white">
                {CATEGORY_ICONS[category.slug]}
              </div>
              <h2 className="text-[20px] font-bold text-[#1a1a1a]">
                {category.name}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-500">
                {CATEGORY_DESCRIPTIONS[category.slug] ?? `Browse ${category.articles.length} help articles.`}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-tm-magenta">
                View articles
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 transition-transform group-hover:translate-x-1">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
