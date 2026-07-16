type AppEntry = { description: string; href: string; icon: string; id: string; title: string };
type AppCatalog = { apps: AppEntry[]; defaultApp: string | null; navigationPosition: "left" | "right" };

const icons: Record<string, string> = { calculator: "%", chart: "▥", document: "▤", table: "▦" };

function publicHref(href: string): string {
  const upstream = ["https://tools", "jcem", "pro"].join(".");
  return location.protocol === "file:" ? `${upstream}${href}` : href;
}

function render(catalog: AppCatalog): void {
  const grid = document.querySelector<HTMLElement>("[data-app-grid]");
  if (!grid) return;
  document.documentElement.dataset.navPosition = catalog.navigationPosition;
  grid.innerHTML = catalog.apps.map((app) => `<a class="jcem-app-card" href="${publicHref(app.href)}"><span class="jcem-app-icon" aria-hidden="true">${icons[app.icon] ?? "◇"}</span><span><strong>${app.title}</strong><small>${app.description}</small></span></a>`).join("");
  if (catalog.defaultApp) {
    const selected = catalog.apps.find((app) => app.id === catalog.defaultApp);
    if (selected) location.replace(publicHref(selected.href));
  }
}

fetch("/assets/config/apps.json").then((response) => response.json()).then(render).catch(() => {
  document.querySelector<HTMLElement>("[data-app-grid]")?.setAttribute("data-load-error", "true");
});
