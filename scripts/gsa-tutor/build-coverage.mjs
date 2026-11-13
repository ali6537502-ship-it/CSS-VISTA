import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
const read=p=>JSON.parse(readFileSync(p,'utf8'))
const syllabus=read('public/fpsc-syllabus.json')
const provided=read('docs/gsa-tutor/sources/provided-fpsc-syllabus.json')
const subject={sections:[{},...provided.domains]}
const catalog=read('public/gsa-tutor/content/catalog.json')
const draftUnits=readdirSync('content/gsa-tutor/draft-units').filter(f=>f.endsWith('.json')).map(f=>read('content/gsa-tutor/draft-units/'+f));
const unitIds=new Set(draftUnits.map(u=>u.lessonId));
const chapters=catalog.chapters.map(c=>read(`public/gsa-tutor/content/chapter-${String(c.id).padStart(2,'0')}.json`))
// Editorial mapping candidates, never inferred by keyword matching. Content depth
// and individual claims still need independent review against the original PDF.
const mappings=[
 [[1,2,3],'Universe; galaxies; light-year; astronomical unit; Sun; Earth; solar system','Check units, distance versus time, stellar evidence and prerequisite explanations.'],
 [[3,4],'Eclipses; rotation; revolution; temperature; pressure; circulation; precipitation; humidity; weather variation','Check eclipse inclination, axial tilt, pressure gradients, saturation and causal explanations.'],
 [[5],'Earthquakes; volcanoes; tsunami; flood; avalanche; tropical and mid-latitude cyclones; tornado; drought; wildfire; urban fire; disaster risk','Review each named hazard, especially mid-latitude cyclones and hazard versus vulnerability.'],
 [[7,8],'Renewable and non-renewable energy; LED efficiency; solar; wind; conservation; sustainable use','Clarify that LEDs conserve energy; they are not primary renewable energy sources. The supplied PDF does say “LED Energy”; preserve this wording while explaining LED lighting as efficiency technology. Independent interpretation remains pending.'],
 [[6],'Atomic structure; chemical bonding; electromagnetic radiation','Only one MCQ for five lessons; add reviewed bond, spectrum and application checks and written models.'],
 [[8,13],'Ceramics; plastics; semiconductors; antibiotics; vaccines; fertilizers; pesticides','Review ceramics depth and distinctions among medicines, agricultural chemicals and electronic materials.'],
 [[9],'Cell structure; nucleus; mitochondria; ribosomes; organelle functions','Review cell prerequisites and organelle structure-function reasoning.'],
 [[10,21],'Proteins; lipids; carbohydrates; enzymes','Check molecular structure, functions, enzyme specificity and temperature/pH mechanisms.'],
 [[11],'Plant and animal diversity; similarities and differences','Three MCQs and no written model; add reviewed comparisons rather than lists alone.'],
 [[12],'Human physiology; digestion; circulation; respiration; excretion; nervous and endocrine control; reproduction; immunity','No written models; review integrated homeostasis and prerequisite explanations.'],
 [[13],'Polio; diarrhoea; malaria; hepatitis; dengue; causes; prevention','Check each named disease, transmission routes, prevention and current medical claims individually.'],
 [[14],'Biofuel production; fermentation; transesterification; anaerobic digestion; emerging methods','Only one MCQ and no model; teach feedstock-to-product mechanisms and limitations.'],
 [[15],'Atmosphere layers and composition; hydrosphere compartments and water cycle; biosphere biomes; lithosphere minerals, rocks and tectonics','Review every named Earth sphere and causal links; do not count title mentions as complete coverage.'],
 [[16],'COx; particulate matter; NOx; SOx; tropospheric ozone; VOCs; dioxins; acid rain; ozone depletion; greenhouse effect; warming; Montreal and Kyoto Protocols','Verify named pollutants, mechanisms, health effects and the distinction between ozone depletion and warming.'],
 [[17],'Synthetic organics; oxygen demand; nutrients; thermal pollution; pathogens; sediments; radioactivity; metals; acids','36 MCQs concentrated here; review distractors and redistribute future assessment effort.'],
 [[17,18],'Drinking-water quality; standards; multiple treatment barriers','Verify numerical standards by authority, date and jurisdiction; treatment diagrams do not certify safety.'],
 [[18],'Land pollution; solid waste management; disposal','Review waste hierarchy, treatment limitations and local claims.'],
 [[19],'Remote sensing; GIS; environmental applications','Add reviewed interpretation exercises for resolution, spectral evidence and spatial analysis.'],
 [[20],'Population planning; demographic change; resource pressure','Check population planning coverage beyond population growth; no in-chapter source links in original audit.'],
 [[21,22],'Balanced diet; vitamins; carbohydrates; proteins; fats and oils; minerals; fibre','No written models in either chapter; review physiological roles and deficiency claims.'],
 [[22,23,24],'Nutrient bioavailability; appearance; texture; flavour; packed and frozen food; additives; preservatives; antioxidants','Check every sensory/processing subtopic and distinguish quality, safety and bioavailability.'],
 [[23,24],'Food deterioration; adulteration; preservation','Review microbial, chemical and physical causes and mechanism-specific controls.'],
 [[25,26,27,28],'Hardware; software; input/output; processing; storage; networking; internet standards; applications; business software; social media; information systems; AI','Separate official core from enrichment; add scientific reasoning and reviewed IT source references.'],
 [[19,26],'Wireless; mobile; satellite; surveillance; GPS; optical fibre','Review signal transmission, positioning versus communication and fibre guidance.']
]
let index=0
const rows=[]
for(const section of subject.sections.slice(1,6)){
 // Preserve paragraph boundaries from the existing FPSC transcription.
 const starts={
  'I. Physical Sciences':['Constituents and Structure','Process of Nature','Natural Hazards and Disasters','Energy Resources','Atomic Structure','Modern Materials/Chemicals'],
  'II. Biological Sciences':['The Basis of Life','Biomolecules:','Plant and Animal Kingdom','A Brief Account','Common Diseases','New Model Concept'],
  'III. Environmental Science':['Environment:','Atmospheric Pollution','Water Pollution','Drinking water','Land Pollution','Role of Remote','Population Planning'],
  'IV. Food Science':['Concept of Balance','Quality of Food','Food Deterioration'],
  'V. Information Technology':['Computer (','Telecommunications:']
 }[section.title]
 const text=section.items.join(' '),positions=starts.map(s=>text.indexOf(s))
 if(positions.some((p,i)=>p<0||(i>0&&p<=positions[i-1])))throw Error('Source headings changed')
 const paragraphs=positions.map((p,i)=>text.slice(p,positions[i+1]??text.length))
 for(const prescribed of paragraphs){
  const map=mappings[index++];if(!map)throw Error('Syllabus paragraph boundaries changed')
  const [chapterIds,concepts,gaps]=map
  const mapped=chapters.filter(c=>chapterIds.includes(c.id))
  rows.push({id:`GS-I-${String(index).padStart(2,'0')}`,domain:section.title,exactPrescribedTopic:prescribed.trim(),essentialConcepts:concepts.split('; '),chapterIds,lessonIds:catalog.chapters.flatMap(c=>c.sections).filter(s=>s.syllabusRefs?.includes(`GS-I-${String(index).padStart(2,'0')}`)).map(s=>s.id),mappingStatus:'candidate-not-independently-reviewed',existingCoverage:'Relevant manuscript sections present; instructional completeness not established.',missingInstructionalMaterial:'Requires objective-by-objective review of teaching, examples, visual explanations, checks and answer-writing rubrics.',expansionRequired:gaps,verifiedPastPaperQuestions:(catalog.pastPaperQuestions||[]).filter(q=>q.syllabusRefs.includes(`GS-I-${String(index).padStart(2,'0')}`)),pastPaperStatus:'2025 linked question text checked against the CSS VISTA archived scan. Publisher-origin reconfirmation from FPSC remains unavailable; no approved answer inferred.',sources:[{...syllabus.source,providedDocument:provided.originalFilename,sha256:provided.sha256,printedPages:[7,8]}],editorialVerification:'compared-to-provided-PDF; independent-curriculum-review-pending'})
 }
}
if(index!==mappings.length)throw Error(`Expected ${mappings.length} topics, found ${index}`)
const report={version:1,scope:'General Science Part I, 60 marks; General Ability Part II excluded',source:syllabus.source,sourceRetrieval:{checkedOn:'2026-11-12',status:'provided-FPSC-PDF-inspected',document:provided,limitation:'User-supplied FPSC PDF directly inspected. Live FPSC endpoints still return HTTP 503; latest online revision not independently confirmed.'},academicApproval:'WITHHELD',rows}
const audit=chapters.map(c=>({chapter:c.id,title:c.title,lessons:c.sections.map(s=>({id:s.id,title:s.title,words:s.text.trim().split(/\s+/).length,contentHash:createHash('sha256').update(s.html).digest('hex'),instructionalStagesReviewed:false,scientificReview:'pending'})),mcqs:c.questions.length,writtenModels:c.analytical.length,questionsWithExplicitLessonMapping:c.questions.filter(q=>q.lessonId&&q.conceptId).length,questionsWithShortExplanations:c.questions.filter(q=>q.explanation.trim().split(/\s+/).length<15).length,approvedAssessments:0,releaseBlockers:['Scientific claim and formula verification pending','Lesson objectives, prerequisites and eight teaching stages need independent review','Question mapping, distractors, explanations and answer keys need review',...(c.analytical.length===0?['No original analytical model answers']:['Written models lack independent rubric approval'])]}))
const unitProgress={date:draftUnits.flatMap(u=>(u.reviewLog||[]).map(r=>r.date)).filter(Boolean).sort().at(-1)||null,scope:'Whole existing course, including enrichment',academicApproval:'WITHHELD',totals:{originalLessons:141,draftUnits:draftUnits.length,lessonsWithoutRebuiltDraft:141-unitIds.size,approvedUnits:draftUnits.filter(u=>u.status==='approved').length,newDraftQuestions:draftUnits.reduce((n,u)=>n+u.stages.activeUnderstanding.questions.length,0),draftWrittenModels:draftUnits.length},lessons:catalog.chapters.flatMap(c=>c.sections.map(s=>{const u=draftUnits.find(u=>u.lessonId===s.id);return {id:s.id,chapter:c.id,title:s.title,domain:c.part,courseScope:s.courseScope,draftStatus:u?.status||'no-rebuilt-unit-yet',unitVersion:u?.version||null,unitHash:u?createHash('sha256').update(JSON.stringify(u)).digest('hex'):null,independentReview:'pending',originalSourceRemainsAvailable:true}}))};
const outputs={
 'docs/gsa-tutor/teaching-unit-progress.json':JSON.stringify(unitProgress,null,2)+'\n',
 'docs/gsa-tutor/syllabus-coverage.json':JSON.stringify(report,null,2)+'\n',
 'docs/gsa-tutor/chapter-audit.json':JSON.stringify({version:1,baseline:'Original manuscript; chapter 25 HTML formula transcription repaired against unchanged canonical text; no answer-key changes',chapters:audit},null,2)+'\n',
 'docs/gsa-tutor/syllabus-coverage.md':'# General Science Part I coverage register\n\nStatus: **syllabus text checked against the user-supplied FPSC PDF; teaching completeness not certified**. The supplied extract contains 23 bullets; water-pollution and drinking-water standards are split for 24 traceability rows. Live FPSC endpoints remain unavailable. Part II is excluded. Sixteen 2025 science questions were transcribed and visually checked against the archived scan; publisher-origin confirmation from FPSC remains unavailable. No answer key or reviewed model is inferred from these links. Required content and enrichment remain separate classifications, without removing broader course material.\n\nSource: '+syllabus.source.url+'\n\n| ID | Domain | Prescribed topic (supplied PDF transcription) | Candidate chapters | Required review / expansion |\n|---|---|---|---|---|\n'+rows.map(r=>`| ${r.id} | ${r.domain} | ${r.exactPrescribedTopic.replaceAll('|','/')} | ${r.chapterIds.join(', ')} | ${r.expansionRequired} |`).join('\n')+'\n\nSee `syllabus-coverage.json` for essential concepts, lesson IDs, source and verification status, and `chapter-audit.json` for all 141 lesson hashes and chapter assessment gaps. Automated inventory cannot establish scientific or pedagogical completeness.\n'
}
for(const [path,content] of Object.entries(outputs)){
 if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==content)throw Error('Stale coverage artifact: '+path)}
 else{mkdirSync('docs/gsa-tutor',{recursive:true});writeFileSync(path,content)}
}
console.log(`Coverage register: ${rows.length} prescribed topic groups; ${audit.length} chapters; academic approval withheld.`)
if(process.argv.includes('--release')){console.error('RELEASE BLOCKED: independent curriculum/science/assessment review, learner trials and owner release authorization are pending. The supplied FPSC syllabus has been inspected.');process.exitCode=1}
