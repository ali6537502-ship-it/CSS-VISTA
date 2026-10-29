/** Stop serving publisher artwork whose reproduction permission is unverified.
 * The repository originals stay available for provenance and later review.
 */
export function protectUnverifiedBookCovers(htaccess) {
  const rule = '  RewriteRule ^book-summaries/covers(?:/|$) - [G,L,NC]'
  if (htaccess.includes(rule)) return htaccess
  if (!/RewriteEngine\s+On/i.test(htaccess)) throw new Error('Book-cover policy requires the existing rewrite engine')
  return htaccess.replace(/RewriteEngine\s+On/i, (engine) => `${engine}\n\n  # Unverified publisher artwork is withheld; original summaries remain public.\n${rule}`)
}
