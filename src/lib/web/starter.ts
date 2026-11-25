export type StarterSystem = { slug: string; title: string; tagline: string; category: string; artefacts: readonly string[] };
export type StarterIdentity = { name: string; description: string; accent: string };

export function starterIdentity(system: StarterSystem, value?: Partial<StarterIdentity> | null): StarterIdentity {
  return {
    name: typeof value?.name === 'string' ? value.name.slice(0, 80) : system.title,
    description: typeof value?.description === 'string' ? value.description.slice(0, 500) : system.tagline,
    accent: /^#[0-9a-f]{6}$/i.test(value?.accent ?? '') ? value!.accent! : '#9c6bff',
  };
}

function escape(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

/** A first-party standalone starter, built from the published system registry. */
export function starterDocument(system: StarterSystem, input: StarterIdentity, direction: 'ltr' | 'rtl' = 'ltr', language: 'en' | 'ar' | 'ur' = direction === 'rtl' ? 'ar' : 'en') {
  const identity = starterIdentity(system, input);
  const name = escape(identity.name), description = escape(identity.description);
  const channels = identity.accent.slice(1).match(/../g)!.map((part) => parseInt(part, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const luminance = .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  const actionText = luminance > .179 ? '#000000' : '#ffffff';
  return `<!doctype html><html lang="${language}" dir="${direction}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>${name}</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#0c0916;color:#f5f1ff;font:16px/1.65 system-ui,sans-serif;overflow-wrap:anywhere}a{color:inherit}header,main,footer{width:min(1120px,90%);margin:auto}header{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:24px 0;border-bottom:1px solid #ffffff20}nav{display:flex;gap:20px}nav a{text-decoration:none}header strong{font-size:20px;min-width:0}.hero{padding:100px 0 80px;max-width:820px}.eyebrow{color:#d5c2f4;letter-spacing:.15em;text-transform:uppercase;font-size:12px}h1{font-size:clamp(38px,6vw,76px);line-height:1.06;letter-spacing:-.045em;margin:20px 0}p{color:#cfc5e3}.action{display:inline-block;margin-top:18px;padding:12px 22px;border-radius:10px;background:${identity.accent};color:${actionText};font-weight:700;text-decoration:none}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;padding-bottom:70px}.card{padding:24px;border:1px solid #b088ff45;border-radius:16px;background:linear-gradient(145deg,#241436,#120d20);min-width:0}.card span{color:#d5c2f4;font-size:12px}.card h2{font-size:21px;line-height:1.3}.note{padding:30px 0 60px;border-top:1px solid #ffffff20}footer{padding:24px 0;border-top:1px solid #ffffff20;color:#b9a9d0;font-size:13px}a:focus-visible{outline:3px solid white;outline-offset:5px}@media(max-width:650px){header{align-items:flex-start;flex-direction:column;gap:12px}.hero{padding:55px 0}.grid{grid-template-columns:1fr}nav{flex-wrap:wrap}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style></head><body><header><strong>${name}</strong><nav aria-label="Page sections"><a href="#details">Explore</a><a href="#next">Next steps</a></nav></header><main><section class="hero"><span class="eyebrow">${escape(system.category)} · FIRST-PARTY STARTER</span><h1>${name}</h1><p>${description}</p><a class="action" href="#details">Explore the layout ↓</a></section><section class="grid" id="details" aria-label="Included sections">${system.artefacts.slice(0, 6).map((item, index) => `<article class="card"><span>0${index + 1}</span><h2>${escape(item)}</h2><p>Replace this section with your project content before publishing.</p></article>`).join('')}</section><section class="note" id="next"><h2>Your next chapter.</h2><p>This starter is editable HTML and CSS. It contains no account, checkout, backend service or third-party assets. Connect and test the integrations your project needs before publishing.</p><a href="#top">Back to top ↑</a></section></main><footer>${name} · Local starter document</footer></body></html>`;
}
