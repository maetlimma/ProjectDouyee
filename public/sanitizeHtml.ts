// Allowlist sanitizer for rich-text paragraph HTML authored in the admin editor.
const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'span', 'font', 'div',
  'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr'
]);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'svg', 'math']);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  '*': new Set(['style']),
  a: new Set(['href', 'title', 'target', 'rel']),
  font: new Set(['color', 'size', 'face'])
};
const SAFE_URL = /^(https?:|mailto:|tel:|\/|#)/i;
const UNSAFE_STYLE = /(url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:)/i;

function clean(node: Element) {
  for (const child of Array.from(node.children)) {
    const tag = child.tagName.toLowerCase();
    if (DROP_WITH_CONTENT.has(tag)) { child.remove(); continue; }
    clean(child);
    if (!ALLOWED_TAGS.has(tag)) { child.replaceWith(...Array.from(child.childNodes)); continue; }
    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      const allowed = ALLOWED_ATTRS['*'].has(name) || ALLOWED_ATTRS[tag]?.has(name);
      const value = attr.value.trim();
      if (!allowed || (name === 'href' && !SAFE_URL.test(value)) || (name === 'style' && UNSAFE_STYLE.test(value))) {
        child.removeAttribute(attr.name);
      }
    }
    if (tag === 'a' && child.getAttribute('target') === '_blank') child.setAttribute('rel', 'noopener noreferrer');
  }
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  clean(doc.body);
  return doc.body.innerHTML;
}
