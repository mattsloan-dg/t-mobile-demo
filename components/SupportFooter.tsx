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
    <footer className="mt-12 bg-[#1d1d1f] text-white">
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <div className="grid gap-6 border-b border-white/15 pb-5 md:grid-cols-3">
          {FOOTER_COLUMNS.map((column) => (
            <section key={column.title}>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70">
                {column.title}
              </h2>
              <ul className="mt-2 space-y-1">
                {column.items.map((item) => (
                  <li key={item} className="text-[11px] text-white/85">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="pt-4">
          <p className="max-w-4xl text-[10px] leading-5 text-white/70">
            This help center is for demo purposes and references publicly
            available T-Mobile support content. T-Mobile and related marks are
            property of their owners.
          </p>
          <p className="mt-3 text-[10px] text-white/60">
            © 2026 T-Mobile demo experience.
          </p>
        </div>
      </div>
      <div className="px-4 pb-2 text-[72px] font-semibold leading-none tracking-tight text-tm-magenta">
        T-Mobile
      </div>
    </footer>
  );
}
