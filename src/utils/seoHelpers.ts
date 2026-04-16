// Re-export JSON-LD helpers for use outside seo.ts

export function removeJsonLd() {
  document.querySelectorAll('script[type="application/ld+json"][data-seo]').forEach(el => el.remove());
}

export function addJsonLd(data: Record<string, unknown>) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-seo', 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}
