import Link from "next/link";

const FOOTER_NAV_LINKS = [
  { href: "/?category=TOPS", label: "Tops" },
  { href: "/?category=BOTTOMS", label: "Bottoms" },
  { href: "/?category=SHOES", label: "Shoes" },
  { href: "/?category=ACCESSORIES", label: "Accessories" },
  { href: "/account", label: "Account" },
];

export function StorefrontFooter() {
  return (
    <footer className="mt-3 bg-black text-white">
      <div className="mx-auto flex w-full max-w-none flex-col items-start gap-8 px-6 py-6 sm:px-8 sm:py-7 lg:flex-row lg:items-start lg:gap-12 lg:px-12">
        <Link
          href="/"
          className="inline-flex w-fit flex-col text-4xl font-semibold uppercase leading-[0.88] tracking-[0.22em] sm:text-5xl"
          aria-label="Shop Template home"
        >
          <span>Shop</span>
          <span>Template</span>
        </Link>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center justify-start gap-6 text-left text-sm uppercase tracking-[0.18em]"
        >
          {FOOTER_NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-white/85 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
