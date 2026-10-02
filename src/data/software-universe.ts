export type SoftwareUniverseKind = 'product' | 'signal' | 'research';

export type SoftwareUniverseProduct = {
  id: string;
  index: string;
  name: string;
  slogan: string;
  image: string;
  route: string;
  kind: SoftwareUniverseKind;
};

export const softwareUniverseProducts: readonly SoftwareUniverseProduct[] = [
  { id: 'knoux-one', index: '01', name: 'KNOUX ONE', slogan: 'One Core. Total Command.', image: '/knoux-universe/knoux-one.webp', route: '/products/knoux-one', kind: 'product' },
  { id: 'knoux-forge', index: '02', name: 'KNOuX Forge', slogan: 'Build. Shape. Ship.', image: '/knoux-universe/knoux-forge.webp', route: '/products/kforge', kind: 'product' },
  { id: 'knoux-repair', index: '03', name: 'KNOuX Repair', slogan: 'Fix Smart. Work Better.', image: '/knoux-universe/knoux-repair.webp', route: '/products/knoux-repair', kind: 'product' },
  { id: 'knoux-smartorganizer', index: '04', name: 'KNOuX SmartOrganizer', slogan: 'Organize Everything Beautifully.', image: '/knoux-universe/knoux-smartorganizer.webp', route: '/products/knoux-smartorganizer', kind: 'product' },
  { id: 'knoux-rec', index: '05', name: 'KNOuX REC', slogan: 'Capture. Cut. Create.', image: '/knoux-universe/knoux-rec.webp', route: '/products/knoux-rec', kind: 'product' },
  { id: 'knoux-player-x', index: '06', name: 'KNOuX Player X', slogan: 'Play Smooth. Control More.', image: '/knoux-universe/knoux-player-x.webp', route: '/products/knoux-x', kind: 'product' },
  { id: 'knoux-clipboard-ai', index: '07', name: 'KNOuX Clipboard AI', slogan: 'Capture Context. Recall Instantly.', image: '/knoux-universe/knoux-clipboard-ai.webp', route: '/products/knoux-clipboard-ai', kind: 'product' },
  { id: 'knoux-signal', index: '08', name: 'KNOuX Signal', slogan: 'Connect. Notify. Respond.', image: '/knoux-universe/knoux-signal.webp', route: '/signal', kind: 'signal' },
  { id: 'knoux-quill', index: '09', name: 'KNOuX Quill', slogan: 'Write Sharp. Publish Clear.', image: '/knoux-universe/knoux-quill.webp', route: '/labs#lab-quill', kind: 'research' },
  { id: 'knoux-crypt', index: '10', name: 'KNOuX Crypt', slogan: 'Secure Everything. Unlock Trust.', image: '/knoux-universe/knoux-crypt.webp', route: '/labs#lab-crypt', kind: 'research' },
];

export function softwareUniverseProductById(id: string): SoftwareUniverseProduct | undefined {
  return softwareUniverseProducts.find((product) => product.id === id);
}
