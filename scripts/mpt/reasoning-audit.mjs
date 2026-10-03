// Independent checks from the delivered text, not generator parameters or its
// explanation. Exhaust all Venn-region models and seating permutations.
const modelCache = new Map()
const statement = (text) => {
  const m = /^(all|no|some) (\w+) are (not )?(\w+)$/i.exec(text.trim().replace(/[.;]$/, ''))
  return m && { kind: m[1].toLowerCase(), x: m[2].toLowerCase(), y: m[4].toLowerCase(), not: !!m[3] }
}
const evalStatement = (s, mask, terms) => {
  const x = 1 << terms.indexOf(s.x), y = 1 << terms.indexOf(s.y)
  let overlap = false, outside = false
  for (let region = 1; region < 1 << terms.length; region++) {
    if (!(mask & (1 << (region - 1))) || !(region & x)) continue
    if (region & y) overlap = true
    else outside = true
  }
  return s.kind === 'all' ? !outside : s.kind === 'no' ? !overlap : s.not ? outside : overlap
}

export function checkCategorical(q) {
  let text = q.q
  const nonempty = text.startsWith('Assume every named category has at least one member. ')
  text = text.replace(/^Assume every named category has at least one member\. /, '')
  let premises, conclusions = [], mode
  if (/^Statements:/.test(text)) {
    premises = [...text.matchAll(/(?:I|II|III)\. ((?:All|No|Some) \w+ are (?:not )?\w+)\./g)].map((m) => statement(m[1]))
    mode = /does NOT follow/.test(text) ? 'not-follow' : 'follow'
    conclusions = q.o.map(statement)
  } else if (/^\(i\)/.test(text)) {
    const rows = [...text.matchAll(/\(([iv]+)\) ((?:All|No|Some) \w+ are (?:not )?\w+)\./g)]
    const n = /first three statements/.test(text) ? 3 : 2
    premises = rows.slice(0, n).map((m) => statement(m[2]))
    conclusions = rows.slice(n).map((m) => statement(m[2]))
    mode = 'combo'
  } else if (/^If it is true that /.test(text)) {
    premises = text.slice(19, text.indexOf(', which')).split(' and ').map(statement)
    conclusions = q.o.map(statement)
    mode = 'false'
  } else throw new Error(`${q.id}: unsupported categorical wording`)
  if (!premises?.length || [...premises, ...conclusions].some((s) => !s)) throw new Error(`${q.id}: unparsed categorical statement`)
  const terms = [...new Set([...premises, ...conclusions].flatMap((s) => [s.x, s.y]))].sort()
  if (terms.length > 4) throw new Error(`${q.id}: too many categories`)
  const cacheKey = JSON.stringify([terms, premises, nonempty])
  let live = modelCache.get(cacheKey)
  if (!live) {
    live = []
    for (let mask = 0; mask < 1 << ((1 << terms.length) - 1); mask++) {
      if (nonempty && terms.some((_, t) => {
        for (let r = 1; r < 1 << terms.length; r++) if ((r & (1 << t)) && (mask & (1 << (r - 1)))) return false
        return true
      })) continue
      if (premises.every((s) => evalStatement(s, mask, terms))) live.push(mask)
    }
    modelCache.set(cacheKey, live)
  }
  if (!live.length) throw new Error(`${q.id}: contradictory premises`)
  const classify = (s) => {
    const n = live.filter((mask) => evalStatement(s, mask, terms)).length
    return n === live.length ? 'true' : n === 0 ? 'false' : 'uncertain'
  }
  const classes = conclusions.map(classify)
  const valid = mode === 'combo' ? q.o.map((o, i) => {
    const labels = [...o.matchAll(/is (true|false|uncertain)/g)].map((m) => m[1])
    return labels.length === classes.length && labels.every((s, j) => s === classes[j]) ? i : -1
  }).filter((i) => i >= 0) : classes.flatMap((s, i) => (mode === 'follow' ? s === 'true' : mode === 'not-follow' ? s !== 'true' : s === 'false') ? [i] : [])
  return { valid, models: live.length, classes }
}

const permutations = (items) => items.length ? items.flatMap((x, i) => permutations(items.filter((_, j) => j !== i)).map((p) => [x, ...p])) : [[]]
const wrap = (x, n) => (x % n + n) % n
const distanceWords = { immediate: 1, immediately: 1, next: 1, second: 2, third: 3 }

export function checkSeating(q) {
  const [intro, ...tail] = q.q.split('. ')
  const body = tail.join('. ')
  const circle = /circle|circular|round table|ring/.test(intro)
  const left = /facing south|outward|away from the centre/.test(intro) ? 1 : -1
  const head = intro.replace(/^(?:At a family dinner|For a team photograph), /, '')
    .replace(/^(?:Five|Six) (?:friends|students|colleagues|guards|children|panellists), /, '')
    .split(/ (?:sit|stand|are)\b/)[0].replace(/,$/, '')
  const names = head.split(/,\s*| and /).filter(Boolean)
  if (names.length < 5 || names.length > 6 || new Set(names).size !== names.length || names.some((s) => !/^[A-Z][a-z]*$/.test(s))) throw new Error(`${q.id}: unparsed seating names: ${head}`)
  const n = names.length
  const clauses = body.split(/; |\. (?=Who|What|Which)/)
  const ask = clauses.pop().replace(/^and /, '')
  const at = (m, name) => m.indexOf(name)
  const offset = (m, name, d) => circle ? m[wrap(at(m, name) + d, n)] : m[at(m, name) + d]
  const dist = (m, a, b) => circle ? Math.min(wrap(at(m,a)-at(m,b),n),wrap(at(m,b)-at(m,a),n)) : Math.abs(at(m,a)-at(m,b))
  const tests = clauses.map((c) => {
    c = c.replace(/^and /, '').replace(/\.$/, '')
    let m
    if (m = /^(\w+) (?:sits|is seated) immediately between (\w+) and (\w+)$/.exec(c)) return (p) => dist(p,m[1],m[2])===1 && dist(p,m[1],m[3])===1
    if (m = /^exactly one person sits between (\w+) and (\w+)$/i.exec(c)) return (p) => dist(p,m[1],m[2])===2
    if (/ (?:sits|is seated) between /.test(c)) throw new Error(`${q.id}: “between” does not explicitly mean immediate neighbours`)
    if (m = /^(\w+) (?:sits |is |is to the )?(immediately|immediate|next|second|third)(?: to the| to)? (left|right) of (\w+)$/.exec(c)) return (p) => offset(p,m[4],distanceWords[m[2]]*left*(m[3]==='left'?1:-1))===m[1]
    if (m = /^(\w+) and (\w+) are not neighbours$/.exec(c)) return (p) => dist(p,m[1],m[2])>1
    if (m = /^(\w+) does not sit next to (\w+)$/.exec(c)) return (p) => dist(p,m[1],m[2])>1
    if (m = /^(\w+) (?:sits|is) (?:directly )?opposite (\w+)$/.exec(c)) return (p) => dist(p,m[1],m[2])===n/2
    if (m = /^(\w+) is not opposite (\w+)$/.exec(c)) return (p) => dist(p,m[1],m[2])!==n/2
    if (m = /^(\w+) and (\w+) sit side by side$/.exec(c)) return (p) => dist(p,m[1],m[2])===1
    if (m = /^(\w+) sits next to (\w+)$/.exec(c)) return (p) => dist(p,m[1],m[2])===1
    if (m = /^(\w+) sits somewhere to the (left|right) of (\w+)$/.exec(c)) return (p) => (at(p,m[1])-at(p,m[3]))*left*(m[2]==='left'?1:-1)>0
    if (m = /^(\w+) is at the extreme (left|right) end$/.exec(c)) return (p) => at(p,m[1])===(m[2]==='left'?(left<0?0:n-1):(left<0?n-1:0))
    if (m = /^(\w+) (does not sit at either end|sits at one of the ends)$/.exec(c)) return (p) => (at(p,m[1])===0||at(p,m[1])===n-1)===(m[2]==='sits at one of the ends')
    if (m = /^(\w+) and (\w+) are at the ends$/.exec(c)) return (p) => Math.min(at(p,m[1]),at(p,m[2]))===0 && Math.max(at(p,m[1]),at(p,m[2]))===n-1
    if (m = /^(\w+) and (\w+) are in the centre$/.exec(c)) return (p) => Math.min(at(p,m[1]),at(p,m[2]))===n/2-1 && Math.max(at(p,m[1]),at(p,m[2]))===n/2
    if (m = /^(\w+) sits in the middle of the row$/.exec(c)) return (p) => at(p,m[1])===(n-1)/2
    throw new Error(`${q.id}: unparsed seating clue: ${c}`)
  })
  const models = permutations(names).filter((p) => (!circle||p[0]===names[0]) && tests.every((t) => t(p)))
  if (!models.length) throw new Error(`${q.id}: no seating arrangement satisfies the clues`)
  const answer = (p) => {
    let m
    if (m=/^Who (?:sits|is) (?:to the )?(immediately|immediate|second) (?:to the )?(left|right) of (\w+)\?$/.exec(ask)) return offset(p,m[3],distanceWords[m[1]]*left*(m[2]==='left'?1:-1))
    if (m=/^Who sits opposite (\w+)\?$/.exec(ask)) return offset(p,m[1],n/2)
    if (m=/^Who are the immediate neighbours of (\w+)\?$/.exec(ask)) return [offset(p,m[1],1),offset(p,m[1],-1)].sort().join('&')
    if (m=/^What is the position of (\w+) with respect to (\w+)\?$/.exec(ask)) {
      let d=at(p,m[1])-at(p,m[2]);if(circle){d=wrap(d,n);if(d>n/2)d-=n;if(Math.abs(d)===n/2)return 'opposite'}
      return `${Math.abs(d)}-${d*left>0?'left':'right'}`
    }
    if (/^Who sits in the middle\?$/.test(ask)) return p[(n-1)/2]
    if (m=/^Who sits at the extreme (left|right) end\?$/.exec(ask)) return p[m[1]==='left'?(left<0?0:n-1):(left<0?n-1:0)]
    if (/^Which pair sits at the two ends\?$/.test(ask)) return [p[0],p[n-1]].sort().join('&')
    throw new Error(`${q.id}: unparsed seating question: ${ask}`)
  }
  const choices = q.o.map((o) => {
    if (/^(Between )?\w+ and \w+$/.test(o)) return o.replace(/^Between /,'').split(' and ').sort().join('&')
    const m=/^(Immediately|Second|Third) to the (left|right)$/.exec(o)
    return m?`${distanceWords[m[1].toLowerCase()]}-${m[2]}`:o.toLowerCase()==='opposite'?'opposite':o
  })
  const answers = new Set(models.map(answer))
  return { valid: choices.flatMap((c,i)=>answers.size===1&&answers.has(c)?[i]:[]), models: models.length, answers: [...answers] }
}

export function auditReasoning(papers) {
  const failures=[], historicalWarnings=[], checked={categorical:0,seating:0}
  papers.forEach((paper,i)=>paper.forEach((q)=>{
    const family=q.meta?.pattern_family??''
    const type=/ga\.deduction\.(?:categorical|syllogism)/.test(family)?'categorical':/ga\.seating/.test(family)?'seating':null
    if(!type)return
    checked[type]++
    try {
      const r=type==='categorical'?checkCategorical(q):checkSeating(q)
      if(r.valid.length!==1||r.valid[0]!==q.a)throw new Error(`${q.id}: unique keyed answer not entailed by the delivered text (${JSON.stringify(r)})`)
    } catch(e) {
      const message=`Mock ${i+11}: ${e.message}`
      ;(i+11<18?historicalWarnings:failures).push(message)
    }
  }))
  return {failures,historicalWarnings,checked}
}
