/**
 * Keep large secondary navigation lists out of prerendered HTML and the
 * initially closed menus. The links mount when a visitor opens the menu.
 */
export function shouldRenderDrawerLinks(isOpen: boolean): boolean {
  return typeof window !== 'undefined' && isOpen
}
