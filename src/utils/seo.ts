export function setPageMeta(title: string, description?: string, image?: string) {
  document.title = title ? `${title} | Arcana` : 'Arcana — Know yourself. One ritual a day.';

  const setMeta = (property: string, content: string) => {
    let el = document.querySelector(`meta[property="${property}"]`) ||
             document.querySelector(`meta[name="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      if (property.startsWith('og:')) {
        el.setAttribute('property', property);
      } else {
        el.setAttribute('name', property);
      }
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  if (description) {
    setMeta('description', description);
    setMeta('og:description', description);
  }

  setMeta('og:title', title || 'Arcana');
  setMeta('og:type', 'article');

  if (image) {
    setMeta('og:image', image);
  }

  setMeta('og:url', window.location.href);
}
