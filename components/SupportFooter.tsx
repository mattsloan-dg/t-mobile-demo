import Link from "next/link";

const FOOTER_COLUMNS = [
  {
    title: "Services",
    items: ["Plans", "Devices", "Home Internet", "Business", "Prepaid"],
  },
  {
    title: "Company",
    items: ["About T-Mobile", "Careers", "Newsroom", "Investor Relations"],
  },
  {
    title: "Support & Legal",
    items: ["Contact Us", "Community", "Coverage Map", "T-Mobile App"],
  },
];

export default function SupportFooter() {
  return (
    <footer className="border-t border-gray-200 bg-[#1a1a1a] text-white">
      <div className="mx-auto max-w-[1280px] px-6 py-10">
        <div className="flex items-center gap-2 pb-8">
          <span className="text-[24px] font-extrabold tracking-tight text-tm-magenta">
            T-Mobile
          </span>
        </div>

        <div className="grid gap-8 border-b border-white/10 pb-8 md:grid-cols-3">
          {FOOTER_COLUMNS.map((column) => (
            <section key={column.title}>
              <h2 className="text-[12px] font-semibold uppercase tracking-wider text-white/50">
                {column.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {column.items.map((item) => (
                  <li key={item}>
                    <span className="text-[14px] text-white/70 transition-colors hover:text-white cursor-default">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-[13px] leading-6 text-white/50">
            This help center is for demo purposes and references publicly
            available T-Mobile support content. T-Mobile and related marks are
            property of their owners.
          </p>
          <p className="text-[13px] text-white/40">
            © 2026 T-Mobile demo experience.
          </p>
        </div>
      </div>
    </footer>
  );
}
