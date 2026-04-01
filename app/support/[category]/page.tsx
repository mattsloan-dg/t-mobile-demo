import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getCategoryBySlug } from "@/lib/articles";

// Render on-demand instead of static generation for faster builds
export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const category = getCategoryBySlug(categorySlug);

  if (!category || category.articles.length === 0) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-[900px] px-5 pb-14 pt-6">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#65707e]">
        Help center
      </p>
      <h1 className="mt-2 text-[44px] font-semibold tracking-tight text-[#1b2128]">
        {category.name}
      </h1>

      <ul className="mt-6 columns-1 gap-x-10 space-y-2 sm:columns-2">
        {category.articles.map((article) => (
          <li key={article.slug} className="break-inside-avoid">
            <Link
              href={`/support/articles/${article.slug}`}
              className="block py-0.5 text-[11px] text-[#2f3945] transition hover:text-black"
            >
              {article.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
