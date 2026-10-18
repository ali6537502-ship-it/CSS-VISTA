export default function ArticleBody({ body, archive = false }: { body: string; archive?: boolean }) {
  const blocks = body
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (/^###\s+/.test(block)) {
          const Heading = archive ? 'h5' : 'h4'
          return <Heading key={index} className="pt-2 font-display text-lg font-bold text-pine">{block.replace(/^###\s+/, '')}</Heading>
        }
        if (/^##\s+/.test(block)) {
          const Heading = archive ? 'h4' : 'h3'
          return <Heading key={index} className="pt-3 font-display text-xl font-bold text-pine">{block.replace(/^##\s+/, '')}</Heading>
        }
        if (/^#\s+/.test(block)) {
          const Heading = archive ? 'h4' : 'h2'
          return <Heading key={index} className="pt-3 font-display text-2xl font-bold text-pine">{block.replace(/^#\s+/, '')}</Heading>
        }

        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
        if (lines.length > 0 && lines.every((line) => /^-\s+/.test(line))) {
          return (
            <ul key={index} className="list-disc space-y-2 pl-6 text-[15px] leading-7 text-foreground/90">
              {lines.map((line, lineIndex) => <li key={lineIndex}>{line.replace(/^-\s+/, '')}</li>)}
            </ul>
          )
        }

        if (lines.length > 0 && lines.every((line) => /^>\s?/.test(line))) {
          return (
            <blockquote key={index} className="border-l-4 border-emerald-700 bg-secondary/40 px-5 py-4 font-serif text-base italic leading-7 text-pine">
              {lines.map((line) => line.replace(/^>\s?/, '')).join(' ')}
            </blockquote>
          )
        }

        return <p key={index} className="whitespace-pre-line text-[15px] leading-8 text-foreground/90 sm:text-base">{block}</p>
      })}
    </div>
  )
}
