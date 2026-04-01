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
      className="mt-8 text-3xl font-semibold tracking-tight text-[#1b2128]"
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      id={buildHeadingId(children)}
      className="mt-7 text-[34px] font-semibold tracking-tight text-[#1b2128]"
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      id={buildHeadingId(children)}
      className="mt-6 text-[24px] font-semibold tracking-tight text-[#1b2128]"
    >
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mt-3 text-[12px] leading-5 text-[#303944]">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[#303944]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[#303944]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-[12px] leading-5">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-[#131920] underline underline-offset-2"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-2 border-[#c9ced6] pl-4 text-[#424d59]">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-[#e8ebef] px-1 py-0.5 text-[12px] text-[#27303b]">
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
    <div className="mx-auto max-w-[900px] px-5 pb-14 pt-6">
      <nav className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#65707e]">
        <Link href="/support" className="hover:text-black">
          Help center
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/support/${article.category}`} className="hover:text-black">
          {categoryName}
        </Link>
      </nav>

      <h1 className="mt-2 text-[44px] font-semibold tracking-tight text-[#1b2128]">
        {article.title}
      </h1>

      <article className="mt-4 max-w-[820px]">
        <ReactMarkdown components={markdownComponents}>
          {sanitizeArticleContent(article.content, article.title)}
        </ReactMarkdown>
      </article>

      <section className="mt-10 rounded-md border border-[#d8dde3] bg-[#f8f9fb] p-4">
        <h2 className="text-[13px] font-semibold text-[#1b2128]">
          Was this article helpful?
        </h2>
        <div className="mt-2 flex gap-2">
          <button className="rounded-full border border-[#c9ced6] px-3 py-1 text-[11px] text-[#2f3945] hover:text-black">
            Yes
          </button>
          <button className="rounded-full border border-[#c9ced6] px-3 py-1 text-[11px] text-[#2f3945] hover:text-black">
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
