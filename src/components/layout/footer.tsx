export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8 text-sm text-muted-foreground">
        <div className="flex flex-col md:flex-row gap-6 justify-between">
          <div className="max-w-md">
            <p className="font-medium text-foreground mb-2">Global Creator Pages</p>
            <p>
              A global creator-publishing and traffic-monetization platform. Christmas 2026 is our
              flagship launch campaign — but the platform supports creators worldwide.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium text-foreground">Compliance</p>
            <p>The platform does not pay users. Earnings come from external ad networks.</p>
            <p>Users are responsible for their ad-network relationships and traffic quality.</p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-border text-xs">
          © 2026 Global Creator Pages. Christmas 2026 campaign active.
        </div>
      </div>
    </footer>
  )
}
