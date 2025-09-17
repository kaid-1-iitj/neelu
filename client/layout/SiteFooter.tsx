export default function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="container py-8 text-sm text-foreground/70 flex flex-col md:flex-row items-center justify-between gap-4">
        <p>
          © {new Date().getFullYear()} Society Ledgers. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <a
            href="#privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </a>
          <a href="#terms" className="hover:text-foreground transition-colors">
            Terms
          </a>
          <a href="#contact" className="hover:text-foreground transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
