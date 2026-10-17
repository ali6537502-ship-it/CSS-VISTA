/** Public post metadata, shared by static HTML and the existing client reader. */
export function vistagramArticleStructuredData(post, siteOrigin) {
  const origin = new URL(siteOrigin).origin
  const canonical = `${origin}/vistagram/${post.slug}`
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: post.title, description: post.excerpt.slice(0, 200),
    url: canonical, mainEntityOfPage: canonical,
    datePublished: post.publishedAt, dateModified: post.updatedAt || post.publishedAt,
    publisher: { '@type': 'Organization', name: 'CSS Vista', url: origin },
    about: [post.category, post.topic, ...post.tags],
  }
}
