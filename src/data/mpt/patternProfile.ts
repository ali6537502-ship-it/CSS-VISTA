// MPT_PATTERN_PROFILE — question-by-question classification of the MPT papers
// held in this repository (public/past-papers/mpt/). It is the evidence base for
// the practice ranges in ./blueprint.ts.
//
// Provenance and limits (read before citing any number derived from this file):
// - FPSC does not publish MPT question booklets. All four papers are
//   compilations from candidate recollection or scans circulated after the test.
// - 2022: 200 items; Urdu 21–40 are images (read and classified by hand).
// - 2023 Special: 125 recalled items only (no Urdu section recovered).
// - 2024: original scanned booklet from Q17; Q1–6 reconstructed; Q7–16 missing;
//   Q100 and Q180 unreadable in the scan.
// - 2025: a solved compilation whose numbering mixes sections (Q49–58 are
//   General Ability items, Q95–180 interleave GK, Islamiat, vocabulary and
//   history); General Ability is largely missing. Treat 2025 counts as weak
//   evidence.
// - CSS MPT 2026 (held 9 November 2025): the circulated "solved paper"
//   (cssaspirants.pk, checked 26 Sep 2026) is not independent evidence. Its
//   Islamic Studies items are the ones profiled below under 2025, its English
//   passages, General Ability (Q91-150) and General Knowledge (Q151-200) repeat
//   the 2024 paper verbatim, and the publisher states that its Urdu and English
//   Q58-72 were written by the site. It confirms the unchanged 20/20/50/60/50
//   structure and style but is not profiled separately, to avoid double counting.
// - Difficulty (1 accessible · 2 moderate · 3 challenging) and mode are CSS
//   Vista's editorial judgement, not FPSC data.
//
// Line format: "<no>|<subtopic>|<mode>|<difficulty>|<flags>"
//   mode: R direct recall · C conceptual understanding · A application/computation
//   flags (comma-separated, optional): nt = source options include a catch-all
//   ("None of these"/"All of these"); tr = obscure numeric/source trivia;
//   fl = flawed item or wrong key in the source; sp = sports/celebrity/news minutiae;
//   lit = literature rather than language; ps = psychology/psychometrics theory;
//   gk = general knowledge outside the three MPT GK headings.
// Subtopic keys follow ./taxonomy.ts; profile-only keys (not used for new papers):
//   eng.analogy, urdu.literature, urdu.comprehension, ga.psychometrics,
//   gk.world, gk.books, gk.history.

export interface PatternRecord {
  year: number
  no: number
  section: string
  subtopic: string
  mode: 'R' | 'C' | 'A'
  difficulty: 1 | 2 | 3
  flags: string[]
}

interface PaperSource {
  year: number
  label: string
  file: string
  reliability: 'high' | 'medium' | 'low'
  sections: Array<[string, number, number]>
  lines: string
}

const papers: PaperSource[] = [
  {
    year: 2022,
    label: 'CSS MPT 2022 (20 February 2022)',
    file: 'public/past-papers/mpt/CSS-MPT-2022.pdf',
    reliability: 'high',
    sections: [['Islamic Studies', 1, 20], ['Urdu', 21, 40], ['English', 41, 90], ['General Abilities', 91, 147], ['General Knowledge', 148, 200]],
    lines: `
1|isl.quran|R|1|nt
2|isl.quran|R|2|nt
3|isl.quran|R|2|nt
4|isl.law|C|1|nt
5|isl.economy|R|1|nt
6|isl.seerah-makkah|R|1|nt
7|isl.personalities|R|2|nt
8|isl.worship|C|1|nt
9|isl.worship|R|2|nt
10|isl.seerah-madinah|R|3|nt,tr
11|isl.law|R|1|nt
12|isl.social|C|1|nt
13|isl.seerah-madinah|R|1|nt
14|isl.seerah-madinah|R|3|nt,tr
15|isl.seerah-madinah|R|2|nt
16|isl.governance|R|1|nt
17|isl.quran|R|1|nt
18|isl.law|R|2|nt
19|isl.seerah-makkah|R|2|nt
20|isl.civilization|R|1|nt
21|urdu.grammar|R|1|
22|urdu.grammar|R|2|
23|urdu.grammar|R|1|
24|urdu.usage|R|2|
25|urdu.gender|R|2|
26|urdu.gender|R|2|
27|urdu.plural|R|2|
28|urdu.antonym|R|1|
29|urdu.antonym|R|1|
30|urdu.synonym|R|1|
31|urdu.sentence|C|1|nt
32|urdu.sentence|C|2|
33|urdu.synonym|R|1|
34|urdu.office-terms|R|1|
35|urdu.office-terms|R|1|
36|urdu.office-terms|R|2|
37|urdu.office-terms|R|1|
38|urdu.office-terms|R|2|nt
39|urdu.office-terms|R|2|
40|urdu.office-terms|R|2|nt
41|eng.vocab-context|C|2|
42|eng.vocab-context|C|2|
43|eng.vocab-context|C|2|
44|eng.vocab-context|C|2|
45|eng.vocab-context|C|2|
46|eng.comprehension|C|1|
47|eng.comprehension|C|1|
48|eng.comprehension|R|1|
49|eng.comprehension|R|1|
50|eng.comprehension|C|2|
51|eng.comprehension|C|3|
52|eng.sentence-correction|C|1|
53|eng.sentence-correction|C|2|
54|eng.sentence-correction|C|2|
55|eng.sentence-correction|C|1|
56|eng.sentence-correction|C|1|
57|eng.sentence-correction|C|2|
58|eng.sentence-correction|C|2|
59|eng.sentence-correction|C|2|
60|eng.sentence-correction|C|1|
61|eng.sentence-correction|C|3|
62|eng.sentence-correction|C|2|
63|eng.sentence-correction|C|3|
64|eng.sentence-correction|C|2|
65|eng.parts-of-speech|C|2|
66|eng.parts-of-speech|C|2|
67|eng.parts-of-speech|C|2|
68|eng.parts-of-speech|C|2|
69|eng.parts-of-speech|C|2|nt
70|eng.parts-of-speech|C|3|nt
71|eng.parts-of-speech|C|3|nt
72|eng.preposition|C|2|
73|eng.preposition|C|1|
74|eng.preposition|C|1|
75|eng.preposition|C|2|
76|eng.analogy|C|3|
77|eng.analogy|C|3|
78|eng.analogy|C|3|
79|eng.analogy|C|3|
80|eng.analogy|C|2|
81|eng.synonym|R|2|
82|eng.synonym|R|2|
83|eng.synonym|R|2|
84|eng.synonym|R|3|
85|eng.synonym|R|3|
86|eng.antonym|R|3|
87|eng.antonym|R|3|
88|eng.antonym|R|3|
89|eng.antonym|R|2|
90|eng.antonym|R|1|
91|ga.fractions|A|1|nt
92|ga.fractions|A|1|nt
93|ga.fractions|C|2|nt,fl
94|ga.equations|A|1|nt
95|ga.average|A|1|nt
96|ga.algebra|A|1|nt
97|ga.algebra|A|1|nt
98|ga.equations|A|1|nt
99|ga.algebra|A|2|nt
100|ga.geometry|R|1|nt
101|ga.geometry|R|1|nt
102|ga.geometry|A|1|nt
103|ga.geometry|R|1|nt
104|ga.geometry|R|1|nt
105|ga.geometry|R|1|nt
106|ga.geometry|R|1|nt
107|ga.geometry|R|1|nt
108|ga.geometry|R|1|nt
109|ga.deduction|R|2|nt
110|ga.psychometrics|R|3|nt,ps
111|ga.psychometrics|R|2|nt,ps
112|ga.psychometrics|R|3|nt,ps
113|ga.psychometrics|R|2|nt,ps
114|ga.psychometrics|R|2|nt,ps
115|ga.psychometrics|R|3|nt,ps
116|ga.psychometrics|R|3|nt,ps
117|ga.psychometrics|R|2|nt,ps
118|ga.psychometrics|R|2|nt,ps
119|ga.deduction|A|2|nt
120|ga.deduction|A|2|nt
121|ga.deduction|A|1|nt
122|ga.mental-ability|A|1|nt
123|ga.mental-ability|A|2|nt
124|ga.series|A|1|nt
125|ga.series|A|1|nt
126|ga.verbal-reasoning|C|1|nt
127|ga.verbal-reasoning|C|1|nt
128|ga.verbal-reasoning|C|1|nt
129|sci.it|R|1|nt,gk
130|ga.psychometrics|R|3|nt,gk
131|sci.environment|R|2|nt,gk
132|ga.verbal-reasoning|C|1|nt
133|ga.blood-relations|A|1|nt
134|ga.mental-ability|A|1|nt
135|ga.psychometrics|R|2|nt,ps
136|ga.psychometrics|R|3|nt,ps
137|ga.data|R|2|nt
138|ga.data|R|2|nt
139|ga.data|C|1|nt
140|ga.data|A|1|nt
141|ga.data|A|1|nt
142|ga.probability|R|1|nt
143|ga.average|A|1|nt
144|ga.data|R|2|nt
145|ga.psychometrics|R|2|nt,ps
146|ga.psychometrics|R|2|nt,ps
147|ga.data|R|3|nt
148|sci.chemistry|R|1|nt
149|sci.earth-space|R|1|nt
150|sci.human-body|R|2|nt
151|sci.nutrition|R|3|nt,fl
152|sci.nutrition|R|1|nt
153|sci.physics|R|1|nt
154|sci.chemistry|R|2|nt
155|sci.earth-space|R|1|nt
156|sci.units|R|1|nt
157|sci.nutrition|R|1|nt
158|gk.world|R|2|nt,gk
159|sci.physics|R|1|nt
160|sci.units|R|1|nt
161|sci.human-body|R|2|nt,fl
162|sci.plants-ecology|R|2|nt
163|sci.units|R|1|nt
164|sci.earth-space|R|1|nt
165|gk.world|R|2|nt,gk
166|sci.nutrition|R|2|nt
167|ca.global-issues|R|2|nt
168|ca.organisations|R|1|nt
169|gk.world|R|3|nt,fl,gk
170|gk.world|R|1|nt,gk
171|gk.world|R|2|nt,gk
172|gk.world|R|1|nt,gk
173|gk.world|R|1|nt,gk
174|ca.recent|R|1|nt
175|ca.recent|R|1|nt
176|ca.recent|R|3|nt,tr
177|ca.global-issues|R|1|nt
178|ca.organisations|R|1|nt
179|ca.organisations|R|1|nt
180|ca.global-issues|R|1|nt
181|ca.recent|R|2|nt
182|gk.books|R|3|nt,gk
183|pa.constitution|R|1|nt
184|pa.political-history|R|2|nt
185|pa.institutions|R|3|nt,tr
186|pa.resources|R|1|nt
187|pa.political-history|R|3|nt,tr
188|pa.political-history|R|2|nt
189|pa.constitution|R|1|nt
190|pa.movement|R|1|nt
191|pa.political-history|R|1|nt
192|pa.political-history|R|1|nt,fl
193|pa.geography|R|1|nt
194|pa.foreign-policy|R|1|nt
195|pa.geography|R|1|nt
196|pa.geography|R|1|nt
197|pa.society|R|2|nt
198|ca.recent|R|2|nt
199|ca.recent|R|1|nt,sp
200|pa.society|R|2|nt`,
  },
  {
    year: 2023,
    label: 'CSS MPT 2023 Special (21 May 2023), 125 recalled items',
    file: 'public/past-papers/mpt/CSS-MPT-2023-Special.pdf',
    reliability: 'medium',
    sections: [['Islamic Studies', 1, 19], ['English', 20, 59], ['General Abilities', 60, 81], ['General Knowledge', 82, 125]],
    lines: `
1|isl.personalities|R|1|
2|isl.personalities|R|2|
3|isl.seerah-madinah|R|2|
4|isl.caliphate|R|1|nt
5|isl.hadith|R|3|
6|isl.quran|R|1|
7|isl.quran|R|2|fl
8|isl.seerah-madinah|R|1|
9|isl.quran|R|1|
10|isl.civilization|R|2|nt
11|isl.seerah-madinah|R|3|tr
12|isl.seerah-makkah|R|2|tr
13|isl.civilization|R|3|
14|isl.seerah-madinah|R|3|nt,tr
15|isl.economy|R|3|nt,tr
16|isl.economy|R|2|nt
17|isl.personalities|R|1|nt
18|isl.seerah-madinah|R|3|nt
19|isl.seerah-madinah|R|2|nt
20|eng.article|C|1|
21|eng.phrasal-verb|C|2|
22|eng.preposition|C|2|
23|eng.tense|C|3|
24|eng.punctuation|C|2|
25|eng.vocab-context|C|2|
26|eng.synonym|R|2|nt
27|eng.synonym|R|2|
28|eng.synonym|R|1|
29|eng.synonym|R|1|
30|eng.antonym|R|2|
31|eng.antonym|R|1|
32|eng.antonym|R|2|nt
33|eng.antonym|R|2|
34|eng.analogy|C|2|
35|eng.vocab-context|C|2|
36|eng.vocab-context|C|3|
37|eng.vocab-context|C|3|
38|eng.vocab-context|C|2|
39|eng.vocab-context|C|1|
40|eng.vocab-context|C|2|
41|eng.pronoun|C|1|
42|eng.sentence-structure|C|1|
43|eng.tense|C|2|
44|eng.tense|C|2|
45|eng.sentence-correction|C|1|
46|eng.vocab-context|C|2|
47|eng.idiom|R|3|
48|eng.vocab-context|R|2|nt
49|eng.synonym|R|1|
50|eng.synonym|R|2|
51|eng.sentence-correction|C|1|
52|eng.sentence-correction|C|3|nt,fl
53|eng.sentence-correction|C|1|nt
54|eng.sentence-structure|C|2|
55|eng.preposition|C|2|
56|eng.preposition|C|1|
57|eng.preposition|C|1|nt
58|eng.preposition|C|2|nt
59|eng.preposition|C|2|
60|ga.fractions|A|2|nt
61|ga.ratio|A|1|nt
62|ga.mental-ability|A|2|nt
63|ga.series|A|2|nt
64|ga.average|A|1|
65|ga.fractions|A|1|nt
66|ga.geometry|A|1|nt
67|ga.geometry|A|2|nt
68|ga.percentage|A|2|nt
69|ga.equations|A|3|nt
70|ga.percentage|A|2|nt
71|ga.equations|A|1|nt
72|ga.series|A|2|nt
73|ga.directions|A|2|nt
74|ga.ordering|A|2|nt
75|ga.seating|A|2|nt
76|ga.verbal-reasoning|C|1|
77|ga.equations|A|3|nt
78|ga.average|A|2|nt
79|ga.ratio|A|3|nt
80|ga.blood-relations|A|2|nt
81|ga.coding|A|2|
82|sci.earth-space|C|1|nt
83|sci.physics|C|1|nt
84|sci.chemistry|C|2|nt
85|sci.chemistry|C|3|nt,fl
86|sci.climate|R|1|nt
87|sci.plants-ecology|C|1|nt
88|sci.health|C|1|nt
89|sci.it|R|2|nt
90|sci.it|R|3|nt
91|sci.earth-space|C|2|nt
92|sci.human-body|R|1|nt
93|ca.recent|R|3|nt,tr
94|ca.global-issues|R|2|nt
95|ca.organisations|R|2|nt,fl
96|ca.organisations|R|1|nt
97|gk.world|R|1|nt,gk
98|ca.recent|R|2|nt
99|ca.global-issues|R|1|nt
100|ca.global-issues|R|1|nt
101|pa.resources|R|1|nt
102|ca.pakistan-external|R|2|nt
103|ca.recent|R|3|nt,sp
104|ca.organisations|R|1|nt
105|gk.world|R|1|nt,gk
106|ca.global-issues|R|1|nt
107|ca.global-issues|R|1|nt
108|pa.foreign-policy|R|1|nt,fl
109|pa.political-history|R|2|nt
110|pa.foreign-policy|R|2|nt
111|pa.foreign-policy|R|2|nt
112|pa.foreign-policy|R|2|nt
113|pa.constitution|R|2|nt
114|pa.security|R|2|nt
115|pa.foreign-policy|R|3|nt,tr
116|pa.security|R|2|nt
117|pa.constitution|R|1|nt
118|pa.foreign-policy|R|2|nt
119|pa.movement|R|1|nt
120|pa.security|R|2|nt,fl
121|pa.economy|R|2|nt
122|pa.foreign-policy|R|1|nt
123|ca.recent|R|3|nt,sp
124|ca.organisations|R|1|nt
125|pa.resources|R|1|nt`,
  },
  {
    year: 2024,
    label: 'CSS MPT 2024 (19 November 2023)',
    file: 'public/past-papers/mpt/CSS-MPT-2024.pdf',
    reliability: 'high',
    sections: [['Islamic Studies', 1, 20], ['Urdu', 21, 40], ['English', 41, 90], ['General Abilities', 91, 150], ['General Knowledge', 151, 200]],
    lines: `
1|isl.quran|R|1|nt
2|isl.quran|R|1|nt
3|isl.seerah-makkah|R|2|nt
4|isl.seerah-makkah|R|2|nt
5|isl.seerah-madinah|R|2|nt
6|isl.hadith|R|2|nt
17|isl.worship|C|1|nt
18|isl.economy|C|1|nt
19|isl.personalities|R|2|
20|isl.civilization|R|2|
21|urdu.comprehension|C|1|
22|urdu.comprehension|C|2|
23|urdu.comprehension|C|2|
24|urdu.comprehension|C|2|
25|urdu.comprehension|C|2|
26|urdu.literature|R|1|lit
27|urdu.literature|R|2|lit
28|urdu.literature|R|2|lit
29|urdu.literature|R|3|lit
30|urdu.literature|R|2|lit
31|urdu.grammar|R|2|
32|urdu.grammar|R|2|
33|urdu.grammar|R|2|
34|urdu.grammar|R|2|
35|urdu.grammar|R|2|
36|urdu.plural|R|2|
37|urdu.plural|R|2|nt
38|urdu.translation|R|2|
39|urdu.translation|R|2|
40|urdu.idiom|R|2|
41|eng.synonym|R|2|
42|eng.synonym|R|3|
43|eng.synonym|R|2|
44|eng.synonym|R|2|
45|eng.synonym|R|2|
46|eng.synonym|R|3|
47|eng.antonym|R|3|
48|eng.antonym|R|3|
49|eng.antonym|R|3|
50|eng.antonym|R|2|
51|eng.antonym|R|2|
52|eng.antonym|R|3|
53|eng.idiom|R|2|
54|eng.idiom|R|2|
55|eng.idiom|R|1|
56|eng.idiom|R|2|
57|eng.idiom|R|2|
58|eng.idiom|R|2|
59|eng.idiom|R|1|
60|eng.preposition|C|3|
61|eng.preposition|C|3|
62|eng.preposition|C|3|
63|eng.preposition|C|3|
64|eng.preposition|C|3|
65|eng.preposition|C|3|
66|eng.preposition|C|3|
67|eng.sentence-correction|C|2|
68|eng.sentence-correction|C|2|
69|eng.sentence-correction|C|3|
70|eng.sentence-correction|C|2|
71|eng.sentence-correction|C|2|
72|eng.sentence-correction|C|3|
73|eng.sentence-correction|C|3|
74|eng.sentence-correction|C|2|
75|eng.error-identification|C|2|
76|eng.error-identification|C|2|
77|eng.error-identification|C|2|
78|eng.punctuation|C|2|
79|eng.punctuation|C|2|
80|eng.punctuation|C|2|
81|eng.comprehension|C|2|
82|eng.comprehension|C|2|
83|eng.comprehension|C|1|
84|eng.comprehension|C|2|
85|eng.comprehension|C|2|
86|eng.comprehension|C|1|
87|eng.comprehension|C|2|
88|eng.comprehension|C|2|
89|eng.comprehension|C|2|
90|eng.comprehension|C|2|nt
91|ga.fractions|A|1|nt
92|ga.algebra|A|2|nt
93|ga.work-time|A|3|nt
94|ga.speed-time|A|2|nt
95|ga.equations|A|2|nt
96|ga.equations|A|2|nt
97|ga.equations|A|2|nt
98|ga.equations|A|2|nt
99|ga.percentage|A|1|nt
101|ga.equations|A|2|nt
102|ga.series|A|3|nt
103|ga.equations|A|3|nt
104|ga.geometry|C|2|nt
105|ga.mensuration|A|2|nt
106|ga.mensuration|A|2|nt
107|ga.mensuration|A|2|nt
108|ga.sets|A|1|nt
109|ga.average|A|2|nt
110|ga.blood-relations|A|2|nt
111|ga.blood-relations|A|2|nt
112|ga.clock-calendar|A|2|nt
113|ga.ordering|A|2|nt
114|ga.directions|A|2|nt
115|ga.analytical|A|3|nt
116|ga.seating|A|3|nt
117|ga.speed-time|A|2|nt
118|ga.series|A|2|nt
119|ga.number-properties|A|1|nt
120|ga.verbal-reasoning|C|2|nt
121|ga.fractions|A|1|nt
122|ga.fractions|C|2|nt
123|ga.work-time|A|3|
124|ga.fractions|A|1|nt
125|ga.equations|A|2|nt
126|ga.equations|A|2|nt
127|ga.equations|A|3|nt
128|ga.equations|A|2|nt
129|ga.algebra|A|2|nt
130|ga.percentage|A|3|nt
131|ga.algebra|A|1|nt
132|ga.algebra|A|2|nt
133|ga.algebra|A|2|nt
134|ga.equations|A|2|nt
135|ga.geometry|A|1|nt
136|ga.mensuration|A|2|nt
137|ga.mensuration|A|2|nt
138|ga.sets|A|2|nt
139|ga.probability|A|1|nt
140|ga.blood-relations|A|2|
141|ga.mental-ability|A|1|
142|ga.ordering|A|2|nt
143|ga.ordering|A|2|nt
144|ga.series|A|2|nt
145|ga.clock-calendar|A|3|nt
146|ga.mental-ability|A|2|nt
147|ga.mental-ability|A|2|nt
148|ga.work-time|A|3|nt
149|ga.verbal-reasoning|C|2|
150|ga.series|A|2|nt
151|sci.physics|C|1|nt
152|sci.physics|C|2|nt
153|sci.climate|R|2|nt
154|sci.physics|R|2|nt
155|sci.physics|R|2|nt
156|sci.energy|C|1|nt
157|sci.biology|R|1|nt
158|sci.nutrition|R|1|nt
159|sci.chemistry|R|2|nt
160|sci.it|R|3|nt
161|sci.ai-digital|R|1|nt
162|sci.energy|C|1|nt
163|sci.earth-space|C|3|nt
164|sci.plants-ecology|C|2|nt
165|sci.chemistry|C|3|nt
166|sci.nutrition|C|2|nt
167|ca.global-issues|R|1|nt
168|ca.organisations|R|2|nt
169|ca.recent|R|3|nt,tr
170|ca.global-issues|C|2|nt
171|ca.organisations|R|1|nt
172|ca.organisations|R|2|
173|ca.global-issues|R|2|nt
174|ca.global-issues|R|2|nt
175|ca.recent|R|2|nt
176|ca.global-issues|R|1|nt
177|ca.global-issues|R|2|nt
178|ca.global-issues|R|2|nt
179|ca.global-issues|R|1|nt
181|ca.organisations|R|1|nt
182|ca.global-issues|R|2|nt
183|ca.global-issues|R|2|nt
184|ca.global-issues|R|1|nt
185|pa.security|R|2|nt
186|pa.geography|R|2|nt
187|pa.foreign-policy|C|1|nt
188|pa.foreign-policy|R|2|nt
189|pa.geography|R|3|nt,tr
190|pa.geography|R|2|nt
191|pa.constitution|R|3|nt
192|pa.security|C|3|nt
193|ca.recent|R|2|nt
194|pa.movement|R|1|
195|gk.books|R|2|nt,gk
196|pa.constitution|R|3|nt
197|pa.society|R|2|nt
198|gk.history|R|2|nt,gk
199|pa.political-history|R|1|nt
200|pa.constitution|R|2|nt`,
  },
  {
    year: 2025,
    label: 'CSS MPT 2025 (solved compilation, sections interleaved)',
    file: 'public/past-papers/mpt/CSS-MPT-2025.pdf',
    reliability: 'low',
    sections: [['Islamic Studies', 1, 20], ['Urdu', 21, 39], ['English', 40, 48], ['General Abilities', 49, 58], ['English', 59, 94], ['General Knowledge', 95, 180]],
    lines: `
1|isl.quran|R|2|
2|isl.quran|R|3|
3|isl.quran|R|3|tr
4|isl.quran|R|3|tr
5|isl.civilization|R|3|tr
6|isl.hadith|R|3|
7|isl.civilization|R|3|tr
8|isl.hadith|R|2|
9|isl.social|R|2|
10|isl.seerah-madinah|R|1|
11|isl.personalities|R|2|
12|isl.seerah-madinah|R|1|
13|isl.civilization|R|2|
14|isl.seerah-madinah|R|2|nt
15|isl.caliphate|R|2|nt
16|isl.caliphate|R|2|
17|isl.law|R|1|
18|isl.personalities|R|2|
19|isl.law|R|2|
20|isl.law|R|3|
21|urdu.literature|R|3|lit
22|urdu.literature|R|3|lit
23|urdu.literature|R|3|lit
24|urdu.literature|R|3|lit
25|urdu.usage|R|2|
26|urdu.grammar|R|2|
27|urdu.grammar|R|3|
28|urdu.grammar|R|3|
29|urdu.plural|R|2|
30|urdu.sentence|C|1|
31|urdu.sentence|C|1|nt
32|urdu.sentence|C|2|
33|urdu.idiom|R|2|
34|urdu.idiom|R|2|
35|urdu.literature|R|3|lit
36|urdu.translation|R|2|
37|urdu.translation|R|2|
38|urdu.translation|R|2|
39|urdu.translation|R|3|
40|eng.synonym|R|3|
41|eng.synonym|R|2|
42|eng.synonym|R|2|
43|eng.synonym|R|3|
44|eng.synonym|R|3|
45|eng.antonym|R|2|
46|eng.antonym|R|3|
47|eng.antonym|R|3|
48|eng.antonym|R|3|
50|ga.fractions|C|2|nt,fl
51|ga.equations|A|1|nt
52|ga.average|A|1|nt
53|ga.algebra|A|1|nt,fl
54|ga.ratio|A|1|nt
55|ga.ratio|A|2|nt
56|ga.ratio|A|3|nt
57|ga.equations|A|3|
58|ga.equations|A|2|
59|eng.sentence-correction|C|2|
60|eng.modifier|C|2|
61|eng.sentence-correction|C|2|
62|eng.sentence-correction|C|1|
63|eng.sentence-correction|C|3|fl
64|eng.sentence-correction|C|3|
65|eng.punctuation|C|3|nt
66|eng.punctuation|C|3|
67|eng.punctuation|C|3|
68|eng.error-identification|C|2|
69|eng.error-identification|C|3|fl
70|eng.error-identification|C|3|
71|eng.error-identification|C|3|fl
72|eng.punctuation|C|2|
73|eng.error-identification|C|3|fl
74|eng.sentence-structure|C|3|fl
75|eng.error-identification|C|2|
76|eng.error-identification|C|3|fl
77|eng.preposition|C|3|fl
78|eng.preposition|C|2|
79|eng.preposition|C|3|
80|eng.idiom|R|3|nt,fl
81|eng.idiom|R|3|fl
82|eng.idiom|R|3|fl
83|eng.idiom|R|1|
84|eng.idiom|R|3|fl
85|eng.comprehension|C|3|
86|eng.comprehension|C|2|
87|eng.comprehension|C|2|
88|eng.comprehension|C|3|
89|eng.comprehension|C|2|
90|eng.comprehension|C|3|fl
91|eng.comprehension|C|2|
92|eng.comprehension|C|2|
93|eng.comprehension|C|2|
94|eng.comprehension|R|1|
95|ca.recent|R|2|nt
96|ca.recent|R|1|nt
97|ca.organisations|R|3|nt,fl
98|ca.recent|R|3|nt
99|isl.personalities|R|1|nt
100|isl.law|R|3|tr
101|pa.geography|R|2|
102|isl.civilization|R|3|
103|isl.quran|R|2|nt
104|isl.civilization|R|3|
105|ca.recent|R|3|tr
106|isl.seerah-makkah|R|3|nt,fl
107|eng.vocab-context|R|1|
108|sci.earth-space|R|2|fl
109|pa.institutions|R|2|
110|pa.foreign-policy|R|3|nt
111|isl.seerah-madinah|R|2|
112|sci.energy|C|1|
113|gk.books|R|3|lit,gk
114|sci.physics|C|2|nt
115|isl.quran|R|2|
116|sci.it|R|1|nt
117|pa.foreign-policy|R|3|nt
118|pa.society|R|2|nt
119|pa.geography|R|1|nt
120|ca.recent|R|1|
121|gk.history|R|2|nt,gk
122|pa.movement|R|1|
123|eng.synonym|R|2|
124|pa.geography|R|1|
125|eng.vocab-context|R|1|
126|sci.earth-space|C|1|
127|ca.recent|R|2|
128|sci.biology|C|1|
129|sci.earth-space|R|1|
130|ca.recent|R|2|sp
131|gk.history|R|2|gk
132|isl.quran|R|2|
133|sci.earth-space|R|2|
134|pa.resources|R|1|
135|pa.society|R|2|
136|pa.society|R|3|fl
137|ca.organisations|R|2|
138|gk.history|R|1|nt,gk
139|sci.earth-space|R|1|
140|ca.global-issues|R|2|nt
141|ca.recent|R|3|tr
142|gk.history|R|2|gk
143|sci.climate|C|2|
144|sci.climate|R|2|nt
145|pa.economy|R|1|
146|pa.economy|R|1|
147|ca.recent|R|2|
148|pa.economy|R|2|nt
149|pa.movement|R|1|
150|ca.recent|R|3|tr
151|pa.society|R|2|nt,fl
152|pa.resources|R|2|
153|sci.it|R|1|
154|sci.ai-digital|R|1|nt
155|ca.recent|R|1|nt
156|ca.recent|R|2|nt
157|ca.recent|R|3|nt
158|ca.recent|R|1|nt,sp
159|ca.recent|R|3|nt,tr
160|ca.recent|R|3|nt,tr,sp
161|ca.recent|R|3|nt
162|ca.recent|R|2|nt
163|ca.recent|R|3|nt,sp
164|ca.recent|R|3|nt,sp
165|ca.recent|R|3|tr
166|ca.organisations|R|3|nt,tr
167|pa.security|R|2|nt
168|pa.economy|R|2|nt
169|pa.foreign-policy|R|1|nt
170|gk.history|R|3|nt,tr,gk
171|pa.geography|R|2|nt
172|gk.books|R|3|nt,gk
173|pa.movement|R|2|nt
174|gk.history|R|2|nt,gk
175|gk.history|R|2|nt,gk
176|pa.economy|R|2|nt
177|sci.chemistry|R|2|nt
178|sci.units|R|1|
179|sci.chemistry|C|3|
180|sci.physics|C|1|nt,fl`,
  },
]

function sectionOf(source: PaperSource, no: number) {
  return source.sections.find(([, from, to]) => no >= from && no <= to)?.[0] ?? 'Unclassified'
}

function sectionForRecord(source: PaperSource, no: number, subtopic: string) {
  // The 2025 compilation interleaves sections; classify by subtopic there.
  if (source.year === 2025 && no >= 95) {
    if (subtopic.startsWith('isl.')) return 'Islamic Studies'
    if (subtopic.startsWith('eng.')) return 'English'
    return 'General Knowledge'
  }
  return sectionOf(source, no)
}

export const MPT_PATTERN_SOURCES = papers.map(({ year, label, file, reliability }) => ({ year, label, file, reliability }))

export const MPT_PATTERN_PROFILE: PatternRecord[] = papers.flatMap((source) => source.lines.trim().split('\n').map((line) => {
  const [no, subtopic, mode, difficulty, flags] = line.split('|')
  return {
    year: source.year,
    no: Number(no),
    section: sectionForRecord(source, Number(no), subtopic),
    subtopic,
    mode: mode as PatternRecord['mode'],
    difficulty: Number(difficulty) as PatternRecord['difficulty'],
    flags: flags ? flags.split(',') : [],
  }
}))
