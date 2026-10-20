import type { GuideEntry, GuideLanguage } from './guide';
import { guideEntryLabel } from './guide';

// Only a published route can cause a hint. No DOM text, inputs or inferred intent.
const hints: Record<GuideLanguage, { engineering: string; solutions: string; template: (label: string) => string }> = {
  en: {
    engineering: 'Want to explore the published engineering approach?',
    solutions: 'Choose your goal to explore the published solutions.',
    template: label => `Want to explore ${label}?`,
  },
  ar: {
    engineering: 'هل تريد أن أشرح منهج الهندسة المنشور؟',
    solutions: 'اختر احتياجك لنستكشف الحلول المنشورة.',
    template: label => `هل تريد استكشاف ${label}؟`,
  },
  ur: {
    engineering: 'کیا آپ شائع شدہ انجینیئرنگ کے طریقہ کار کو دیکھنا چاہتے ہیں؟',
    solutions: 'شائع شدہ حل دیکھنے کے لیے اپنا مقصد منتخب کریں۔',
    template: label => `کیا آپ ${label} دیکھنا چاہتے ہیں؟`,
  },
};
export function contextPrompt(entry: GuideEntry, language: GuideLanguage): string {
  // Urdu is Nastaliq-script RTL. It is a distinct language, not a dialect of
  // Arabic, so it never inherits the Arabic wording.
  const set = hints[language] ?? hints.en;
  if (entry.route === '/engineering') return set.engineering;
  if (entry.route === '/solutions') return set.solutions;
  return set.template(guideEntryLabel(entry, language));
}
export class HintPolicy {
  /**
   * Declared explicitly rather than as a constructor parameter property.
   *
   * The unit tests import this module through Node's strip-only TypeScript mode,
   * which removes type annotations but does not apply the type-directed
   * transforms. A parameter property is a type-directed construct — it silently
   * creates and assigns `this.cooldownMs` — so `private cooldownMs` in the
   * constructor signature fails to parse there with
   * ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX, which surfaced as a whole-file test
   * failure rather than a single assertion. An explicit field is plain syntax and
   * behaves identically under both loaders.
   */
  private cooldownMs: number;
  private seen = new Set<string>();
  private last = new Map<string,number>();
  private dismissals = 0;
  constructor(cooldownMs=30000){ this.cooldownMs = cooldownMs; }
  allow(page: string, route: string, now: number): boolean {
    if (this.dismissals >= 3 || this.seen.has(`${page}:${route}`) || now - (this.last.get(page) ?? -Infinity) < this.cooldownMs) return false;
    this.seen.add(`${page}:${route}`); this.last.set(page,now); return true;
  }
  dismiss() { this.dismissals++; }
}
