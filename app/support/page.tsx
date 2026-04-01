import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { getCategories, loadArticles } from "@/lib/articles";

export default function SupportHomePage() {
  const categories = getCategories().filter(
    (category) => category.articles.length > 0
  );
  const searchArticles = loadArticles().map((article) => ({
    slug: article.slug,
    title: article.title,
  }));

  return (
    <section className="mx-auto max-w-[980px] px-4 pb-12 pt-8">
      <h1 className="max-w-xl text-balance text-[44px] font-semibold leading-[1.02] tracking-tight text-[#1b2128]">
        Hello!
        <br />
        How can we help?
      </h1>
      <div className="mt-5">
        <SearchBar articles={searchArticles} />
      </div>

      <div className="mt-8 grid gap-x-6 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <article key={category.slug}>
            <h2 className="text-[12px] font-semibold text-[#1e252c]">
              {category.name}
            </h2>
            <ul className="mt-2.5 space-y-1.5">
              {category.articles.slice(0, 3).map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/support/articles/${article.slug}`}
                    className="text-[11px] text-[#3f4955] transition-colors hover:text-black"
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={`/support/${category.slug}`}
              className="mt-2 inline-flex text-[11px] font-medium text-[#1f2630] hover:text-black"
            >
              View all
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
