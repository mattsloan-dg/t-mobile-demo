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
    <section className="mx-auto max-w-[1280px] px-6 pb-14 pt-10">
      <nav className="text-[13px] text-gray-500">
        <Link href="/support" className="hover:text-tm-magenta">
          Support
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-900">{category.name}</span>
      </nav>

      <h1 className="mt-4 text-[36px] font-bold tracking-tight text-[#1a1a1a]">
        {category.name}
      </h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {category.articles.map((article) => (
          <Link
            key={article.slug}
            href={`/support/articles/${article.slug}`}
            className="group rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-md"
          >
            <span className="text-[15px] font-medium text-gray-800 transition-colors group-hover:text-tm-magenta">
              {article.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
