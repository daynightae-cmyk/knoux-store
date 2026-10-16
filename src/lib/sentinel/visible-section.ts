/** Explicit opt-in reads published prose only; never controls, forms or hidden content. */
export function visibleSectionText(section: Element): string {
  const excluded = 'form,input,textarea,select,button,script,style,nav,[hidden],[aria-hidden="true"],[inert],[contenteditable],[data-private]';
  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
  const fragments: string[] = [];
  let examined = 0;
  while (walker.nextNode() && examined++ < 1200) {
    const element = walker.currentNode.parentElement;
    if (!element || !element.closest('h1,h2,h3,p,li') || element.closest(excluded) || !element.getClientRects().length) continue;
    let visible = true;
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) { visible = false; break; }
    }
    const content = walker.currentNode.textContent?.trim();
    if (visible && content) fragments.push(content);
    if (fragments.join('\n').length >= 2400) break;
  }
  return fragments.join('\n').slice(0, 2400);
}
