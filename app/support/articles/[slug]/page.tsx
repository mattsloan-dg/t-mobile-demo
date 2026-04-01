import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import {
  CATEGORY_NAMES,
  getAllSlugs,
  getArticleBySlug,
} from "@/lib/articles";

// Render on-demand instead of static generation for faster builds
export const dynamic = "force-dynamic";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1
      id={buildHeadingId(children)}
      className="mt-8 text-[28px] font-bold tracking-tight text-[#1a1a1a]"
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      id={buildHeadingId(children)}
      className="mt-7 text-[24px] font-bold tracking-tight text-[#1a1a1a]"
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      id={buildHeadingId(children)}
      className="mt-6 text-[20px] font-semibold tracking-tight text-[#1a1a1a]"
    >
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mt-3 text-[15px] leading-7 text-gray-600">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-3 list-decimal space-y-2 pl-6 text-gray-600">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-[15px] leading-7">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-tm-magenta underline underline-offset-2 hover:text-tm-magenta-hover"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-4 border-tm-magenta/30 bg-gray-50 py-3 pl-4 text-gray-600">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[14px] text-gray-700">
      {children}
    </code>
  ),
};

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const categoryName =
    CATEGORY_NAMES[article.category] ?? article.category.replace(/-/g, " ");

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-14 pt-10">
      <nav className="text-[13px] text-gray-500">
        <Link href="/support" className="hover:text-tm-magenta">
          Support
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/support/${article.category}`} className="hover:text-tm-magenta">
          {categoryName}
        </Link>
      </nav>

      <h1 className="mt-4 text-[36px] font-bold tracking-tight text-[#1a1a1a]">
        {article.title}
      </h1>

      <article className="mt-6 max-w-[820px]">
        <ReactMarkdown components={markdownComponents}>
          {sanitizeArticleContent(article.content, article.title)}
        </ReactMarkdown>
      </article>

      <section className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-6">
        <h2 className="text-[16px] font-semibold text-[#1a1a1a]">
          Was this article helpful?
        </h2>
        <div className="mt-3 flex gap-3">
          <button className="rounded-full border border-gray-300 px-5 py-2 text-[14px] font-medium text-gray-600 transition hover:border-tm-magenta hover:text-tm-magenta">
            Yes
          </button>
          <button className="rounded-full border border-gray-300 px-5 py-2 text-[14px] font-medium text-gray-600 transition hover:border-tm-magenta hover:text-tm-magenta">
            No
          </button>
        </div>
      </section>
    </div>
  );
}

function sanitizeArticleContent(content: string, title: string): string {
  const lines = content.split("\n");
  const cleaned: string[] = [];
  let skippedTitle = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      cleaned.push(line);
      continue;
    }

    if (trimmed.startsWith("< [")) {
      continue;
    }

    if (
      /^(\[Help Center\]|\[Support\]|\[Account\]|\[Getting started\])/i.test(
        trimmed
      )
    ) {
      continue;
    }

    if (!skippedTitle && trimmed.toLowerCase() === title.toLowerCase()) {
      skippedTitle = true;
      continue;
    }

    cleaned.push(line);
  }

  return cleaned.join("\n").trim();
}

function buildHeadingId(children: ReactNode): string {
  return slugify(extractText(children));
}

function extractText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(extractText).join("");
  }

  if (!children || typeof children !== "object") {
    return "";
  }

  if ("props" in children) {
    const props = (children as { props?: { children?: ReactNode } }).props;
    return extractText(props?.children);
  }

  return "";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
