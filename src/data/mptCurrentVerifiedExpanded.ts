import type { BankQuestion } from './mcq.ts'

// Completed-event and published-report facts checked against the issuing
// organisations. Source URLs remain attached for post-paper review.
type Row = [string, [string, string, string, string], number, string, string, string]

const wef = 'https://www.weforum.org/publications/global-gender-gap-report-2026/in-full/benchmarking-gender-gaps-2026/'
const fifa = 'https://inside.fifa.com/organisation/media-releases/updated-world-cup-2026-match-schedule-venues-kick-off-times-104-matches'
const olympics = 'https://www.olympics.com/en/news/milano-cortina-2026-numbers-records-milestones-moments'
const olympicSports = 'https://support.olympics.com/hc/en-gb/articles/43002641636755-What-new-sports-will-be-at-the-Olympic-Winter-Games-Milano-Cortina-2026'
const unga = 'https://www.un.org/en/desa/un-general-assembly-elects-bangladeshs-rahman-as-next-president'
const ungaDialogue = 'https://indico.un.org/event/1023119/'

const rows: Row[] = [
  ['On what date was the WEF Global Gender Gap Report 2026 published?', ['16 September 2026', '1 July 2026', '8 March 2026', '31 December 2025'], 0, 'WEF 2026', 'The WEF publication page dates the report to 16 September 2026.', wef],
  ['The 2026 Global Gender Gap Report was which edition of the WEF index?', ['15th', '18th', '20th', '25th'], 2, 'WEF 2026', 'The report describes 2026 as the index’s 20th edition.', wef],
  ['How many economies had appeared in every WEF Global Gender Gap Index edition from 2006 through 2026?', ['78', '87', '97', '107'], 2, 'WEF 2026', 'A constant set of 97 economies appears across all 20 editions.', wef],
  ['Which pair re-entered the WEF Global Gender Gap Index in 2026?', ['Malawi and Qatar', 'Ethiopia and Guinea', 'Sudan and Uganda', 'Nicaragua and Ethiopia'], 0, 'WEF 2026', 'The report states that Malawi and Qatar re-entered the index.', wef],
  ['Which economy was omitted from the 2026 WEF index because of data constraints after appearing in the previous edition?', ['Finland', 'Nicaragua', 'Australia', 'Namibia'], 1, 'WEF 2026', 'Nicaragua was among five economies omitted because of data constraints.', wef],
  ['How many economies were common to the 2025 and 2026 WEF gender-gap editions?', ['137', '140', '143', '145'], 2, 'WEF 2026', 'The year-on-year comparison uses a common cohort of 143 economies.', wef],
  ['Which economy recorded the largest year-on-year gender-parity improvement in the 2026 WEF report?', ['Angola', 'Guatemala', 'Maldives', 'Namibia'], 2, 'WEF 2026', 'Maldives had the largest reported gain, at 4.4 percentage points.', wef],
  ['Which economy gained the most ranking places in the 2026 WEF index?', ['Kenya', 'Ghana', 'Guatemala', 'Czechia'], 0, 'WEF 2026', 'Kenya recorded the largest rank improvement, rising 33 places.', wef],
  ['What parity score did Iceland record while ranking first in the 2026 WEF index?', ['87.2%', '90.0%', '93.0%', '95.4%'], 2, 'WEF 2026', 'Iceland’s overall index score was 93.0%.', wef],
  ['By 2026, for how many consecutive years had Iceland held first place in the WEF gender-gap ranking?', ['10 years', '12 years', '15 years', '17 years'], 3, 'WEF 2026', 'The report notes Iceland’s 17-year hold on the top rank.', wef],
  ['What score placed Finland second in the WEF Global Gender Gap Index 2026?', ['84.5%', '85.7%', '87.2%', '93.0%'], 2, 'WEF 2026', 'Finland ranked second with 87.2%.', wef],
  ['What score placed Norway third in the WEF Global Gender Gap Index 2026?', ['81.9%', '84.2%', '85.7%', '87.2%'], 2, 'WEF 2026', 'Norway ranked third with 85.7%.', wef],
  ['Which economy ranked fifth in the WEF Global Gender Gap Index 2026?', ['United Kingdom', 'New Zealand', 'Sweden', 'Germany'], 0, 'WEF 2026', 'The United Kingdom ranked fifth with 84.2%.', wef],
  ['Which economy made its first appearance in the WEF gender-gap top ten in 2026?', ['Ireland', 'Germany', 'Australia', 'Namibia'], 2, 'WEF 2026', 'Australia rose to eighth and made its top-ten debut.', wef],
  ['Which economy ranked ninth in the 2026 WEF gender-gap index?', ['Australia', 'Germany', 'Ireland', 'Sweden'], 1, 'WEF 2026', 'Germany occupied ninth place.', wef],
  ['Which economy completed the 2026 WEF gender-gap top ten in tenth place?', ['Ireland', 'Moldova', 'United Kingdom', 'New Zealand'], 0, 'WEF 2026', 'Ireland ranked tenth.', wef],
  ['What was Pakistan’s rank in the WEF Global Gender Gap Index 2026?', ['140th', '141st', '143rd', '145th'], 2, 'WEF 2026', 'Pakistan ranked 143rd among the 145 economies.', wef],
  ['Which economy ranked last in the WEF Global Gender Gap Index 2026?', ['Pakistan', 'Iran', 'Chad', 'Algeria'], 2, 'WEF 2026', 'Chad ranked 145th.', wef],
  ['How many high-income economies were covered by the WEF gender-gap index in 2026?', ['40', '45', '53', '58'], 2, 'WEF 2026', 'The income grouping included 53 high-income economies.', wef],
  ['How many upper-middle-income economies were included in the 2026 WEF gender-gap index?', ['38', '40', '45', '53'], 1, 'WEF 2026', 'The report included 40 upper-middle-income economies.', wef],
  ['How many lower-middle-income economies were included in the 2026 WEF gender-gap index?', ['14', '32', '38', '40'], 2, 'WEF 2026', 'The report included 38 lower-middle-income economies.', wef],
  ['How many low-income economies were included in the 2026 WEF gender-gap index?', ['10', '12', '14', '18'], 2, 'WEF 2026', 'The report included 14 low-income economies.', wef],
  ['What global parity score did the WEF report for Educational Attainment in 2026?', ['61.7%', '69.2%', '96.2%', '96.9%'], 2, 'WEF 2026', 'Educational Attainment stood at 96.2% globally.', wef],
  ['What global parity score did the WEF report for Health and Survival in 2026?', ['69.2%', '90.8%', '96.2%', '96.9%'], 3, 'WEF 2026', 'Health and Survival stood at 96.9% globally.', wef],
  ['What global parity score did the WEF report for Economic Participation and Opportunity in 2026?', ['22.1%', '54.9%', '61.7%', '73.7%'], 2, 'WEF 2026', 'Economic Participation and Opportunity stood at 61.7%.', wef],
  ['How many economies achieved full parity in the WEF Health and Survival subindex in 2026?', ['12', '16', '19', '32'], 1, 'WEF 2026', 'Sixteen economies achieved the subindex benchmark described as full parity.', wef],
  ['How many economies achieved full parity in the WEF Educational Attainment subindex in 2026?', ['16', '24', '32', '45'], 2, 'WEF 2026', 'Thirty-two economies achieved full parity in Educational Attainment.', wef],
  ['How many of the 145 economies in the WEF 2026 index had closed more than 90% of their Health and Survival gender gap?', ['97', '125', '143', '145'], 3, 'WEF 2026', 'All 145 economies had closed more than 90% of the Health and Survival gap.', wef],
  ['How many economies had closed at least 80% of their Educational Attainment gender gap in the WEF 2026 index?', ['97', '125', '143', '145'], 2, 'WEF 2026', 'The report states that 143 of 145 economies had closed at least 80% of the Educational Attainment gap.', wef],
  ['Which economy recorded the highest Economic Participation and Opportunity score in the WEF 2026 index?', ['Ghana', 'Iceland', 'Finland', 'Norway'], 0, 'WEF 2026', 'Ghana recorded the highest score in this subindex at 85.9%.', wef],
  ['Which economy recorded the lowest Economic Participation and Opportunity score in the WEF 2026 index?', ['Chad', 'Pakistan', 'Iran', 'Nigeria'], 2, 'WEF 2026', 'Iran recorded the lowest score in this subindex at 35.1%.', wef],
  ['What was the global parity score for representation in parliamentary positions in the WEF 2026 Political Empowerment subindex?', ['14.4%', '23.7%', '32.0%', '50.0%'], 2, 'WEF 2026', 'Global parity in parliamentary representation was 32.0%.', wef],
  ['What was the global parity score for representation in ministerial positions in the WEF 2026 Political Empowerment subindex?', ['14.4%', '23.7%', '32.0%', '37.0%'], 1, 'WEF 2026', 'Global parity in ministerial representation was 23.7%.', wef],
  ['How many of the 145 economies in the WEF 2026 index had recorded no female head of state during the preceding 50 years?', ['32', '48', '64', '97'], 2, 'WEF 2026', 'The report states that 64 economies had no female head of state during the 50-year period used by the index.', wef],
  ['Which region led the WEF 2026 regional ranking for Political Empowerment?', ['Europe', 'Northern America', 'Southern Asia', 'Central Asia'], 0, 'WEF 2026', 'Europe led the regional Political Empowerment ranking with a 37.0% parity score.', wef],
  ['What overall gender-parity score did the Middle East and Northern Africa region record in the WEF 2026 report?', ['58.5%', '62.5%', '69.2%', '70.3%'], 1, 'WEF 2026', 'Middle East and Northern Africa recorded an overall parity score of 62.5%.', wef],
  ['What overall gender-parity score did Eastern Asia and the Pacific record in the WEF 2026 report?', ['62.5%', '69.2%', '70.3%', '77.1%'], 2, 'WEF 2026', 'Eastern Asia and the Pacific recorded an overall parity score of 70.3%.', wef],

  ['How many matches comprised the expanded 2026 FIFA World Cup?', ['80', '96', '104', '112'], 2, 'FIFA World Cup 2026', 'FIFA’s final schedule covered 104 matches.', fifa],
  ['How many teams took part in the first 48-team FIFA World Cup in 2026?', ['32', '40', '48', '64'], 2, 'FIFA World Cup 2026', 'The 2026 edition was the first 48-team World Cup.', fifa],
  ['How many countries co-hosted the 2026 FIFA World Cup?', ['Two', 'Three', 'Four', 'Five'], 1, 'FIFA World Cup 2026', 'Canada, Mexico and the United States were the three hosts.', fifa],
  ['How many host cities were used for the 2026 FIFA World Cup?', ['12', '14', '16', '18'], 2, 'FIFA World Cup 2026', 'The tournament used 16 host cities.', fifa],
  ['Which country opened the 2026 FIFA World Cup on 11 June?', ['Canada', 'Mexico', 'United States', 'Brazil'], 1, 'FIFA World Cup 2026', 'Mexico played the opening match in its capital.', fifa],
  ['Who faced Mexico in the opening match of the 2026 FIFA World Cup?', ['Japan', 'Paraguay', 'South Africa', 'Tunisia'], 2, 'FIFA World Cup 2026', 'Mexico opened against South Africa.', fifa],
  ['In which city was the opening match of the 2026 FIFA World Cup played?', ['Toronto', 'Los Angeles', 'Mexico City', 'Monterrey'], 2, 'FIFA World Cup 2026', 'The opening fixture was staged in Mexico City.', fifa],
  ['Which fixture was designated as the 1,000th match in FIFA World Cup history?', ['Brazil v Morocco', 'Tunisia v Japan', 'Germany v Curaçao', 'England v Croatia'], 1, 'FIFA World Cup 2026', 'FIFA identified Tunisia v Japan as the 1,000th World Cup match.', fifa],
  ['Which city hosted the 1,000th match in FIFA World Cup history in June 2026?', ['Dallas', 'Houston', 'Monterrey', 'Toronto'], 2, 'FIFA World Cup 2026', 'Monterrey hosted Tunisia v Japan, the 1,000th match.', fifa],
  ['Against which team did the United States begin its home campaign at the 2026 World Cup?', ['Croatia', 'Paraguay', 'Morocco', 'Japan'], 1, 'FIFA World Cup 2026', 'The United States opened its home campaign against Paraguay.', fifa],
  ['Which country became the smallest ever to appear at a FIFA World Cup in 2026?', ['Curaçao', 'Iceland', 'Qatar', 'Cape Verde'], 0, 'FIFA World Cup 2026', 'FIFA described Curaçao as the smallest country ever to feature at the tournament.', fifa],
  ['Brazil’s group-stage match against Morocco at the 2026 World Cup was assigned to which venue area?', ['Toronto', 'Mexico City', 'New York New Jersey', 'Los Angeles'], 2, 'FIFA World Cup 2026', 'FIFA placed Brazil v Morocco at New York New Jersey Stadium.', fifa],

  ['On which dates were the Milano Cortina 2026 Olympic Winter Games held?', ['1–16 February', '6–22 February', '10–26 February', '15 February–1 March'], 1, 'Milano Cortina 2026', 'The Games ran from 6 to 22 February 2026.', olympics],
  ['How many teams participated in the Milano Cortina 2026 Olympic Winter Games?', ['88', '90', '93', '96'], 2, 'Milano Cortina 2026', 'The official Games page records 93 teams.', olympics],
  ['How many Olympic disciplines featured at Milano Cortina 2026?', ['14', '15', '16', '18'], 2, 'Milano Cortina 2026', 'The programme comprised 16 disciplines.', olympics],
  ['How many medal events were contested at Milano Cortina 2026?', ['104', '110', '116', '120'], 2, 'Milano Cortina 2026', 'The programme contained 116 medal events.', olympics],
  ['Approximately how many athletes were welcomed to the Milano Cortina 2026 Olympic Winter Games?', ['2,500', '2,700', '2,900', '3,200'], 2, 'Milano Cortina 2026', 'The official opening programme welcomed about 2,900 athletes.', 'https://gstatic.olympics.com/s3/mc2026/press/Press%20Kit/Press%20Kit%20Olympic%20Opening%20Ceremony/MICO26_CER_OOC_Programme%20%281%29.pdf'],
  ['Which sport made its Olympic debut at Milano Cortina 2026?', ['Ice climbing', 'Ski mountaineering', 'Winter triathlon', 'Snow volleyball'], 1, 'Milano Cortina 2026', 'Ski mountaineering was the sole debuting sport.', olympicSports],
  ['How many ski-mountaineering medal events were on the Milano Cortina 2026 programme?', ['Two', 'Three', 'Four', 'Five'], 1, 'Milano Cortina 2026', 'Men’s sprint, women’s sprint and mixed relay made three events.', olympicSports],
  ['What share of athletes at Milano Cortina 2026 were women, according to the official Games figures?', ['42%', '45%', '47%', '50%'], 2, 'Milano Cortina 2026', 'Women accounted for 47% of athletes.', olympics],
  ['How many competition venues were listed for Milano Cortina 2026?', ['10', '11', '13', '16'], 2, 'Milano Cortina 2026', 'The official information listed 13 competition venues.', olympics],
  ['Which new luge event appeared at Milano Cortina 2026?', ['Women’s doubles', 'Mixed singles', 'Men’s sprint', 'Team downhill'], 0, 'Milano Cortina 2026', 'Women’s doubles was added to the luge programme.', olympicSports],
  ['Which new ski-jumping event appeared at Milano Cortina 2026?', ['Men’s normal hill', 'Women’s large hill', 'Mixed downhill', 'Women’s team sprint'], 1, 'Milano Cortina 2026', 'Women’s large hill was a new medal event.', olympicSports],
  ['Which new skeleton event appeared at Milano Cortina 2026?', ['Women’s doubles', 'Men’s relay', 'Mixed team', 'Team combined'], 2, 'Milano Cortina 2026', 'A mixed-team skeleton event was introduced.', olympicSports],
  ['Which freestyle-skiing event was newly added at Milano Cortina 2026?', ['Dual moguls', 'Team downhill', 'Mixed slalom', 'Cross-country relay'], 0, 'Milano Cortina 2026', 'Men’s and women’s dual moguls were added.', olympicSports],
  ['Where was the opening ceremony of Milano Cortina 2026 staged?', ['Arena di Verona', 'San Siro Stadium', 'Stadio Olimpico', 'Cortina Ice Stadium'], 1, 'Milano Cortina 2026', 'The opening ceremony took place at Milan’s San Siro Stadium.', 'https://newsroom.olympics.com/record/1883/media_id/5458'],
  ['Where was the closing ceremony of Milano Cortina 2026 staged?', ['San Siro Stadium', 'Arena di Verona', 'Turin Olympic Stadium', 'Cortina Ice Stadium'], 1, 'Milano Cortina 2026', 'The Arena di Verona served as the Verona Olympic Arena for the closing ceremony.', 'https://newsroom.olympics.com/record/3177'],

  ['Who was elected President of the 81st session of the UN General Assembly in June 2026?', ['Khalilur Rahman', 'Andreas Kakouris', 'Annalena Baerbock', 'Dennis Francis'], 0, 'UNGA 81', 'The General Assembly elected Khalilur Rahman.', unga],
  ['Khalilur Rahman, elected President of UNGA 81, represented which country?', ['Cyprus', 'Bangladesh', 'Pakistan', 'Malaysia'], 1, 'UNGA 81', 'Khalilur Rahman represented Bangladesh.', unga],
  ['On what date was the President of the UN General Assembly’s 81st session elected?', ['13 May 2026', '2 June 2026', '8 September 2026', '24 October 2026'], 1, 'UNGA 81', 'The election took place on 2 June 2026.', unga],
  ['Which diplomat was the other candidate in the election for President of UNGA 81?', ['Andreas Kakouris', 'Csaba Kőrösi', 'Volkan Bozkır', 'Abdulla Shahid'], 0, 'UNGA 81', 'Cypriot diplomat Andreas Kakouris was the other candidate.', ungaDialogue],
  ['Andreas Kakouris, a candidate for the UNGA 81 presidency, represented which country?', ['Greece', 'Malta', 'Cyprus', 'Georgia'], 2, 'UNGA 81', 'Andreas Kakouris represented Cyprus.', ungaDialogue],
  ['From which regional group was the President of UNGA 81 due to be elected under rotation?', ['African Group', 'Asia-Pacific Group', 'Eastern European Group', 'Latin American and Caribbean Group'], 1, 'UNGA 81', 'The established rotation allocated the election to the Asia-Pacific Group.', ungaDialogue],
]

export const expandedVerifiedMptCurrentQuestions: BankQuestion[] = rows.map(([q, o, a, s, e, sourceUrl], index) => ({
  id: `mpt-current-expanded-${String(index + 1).padStart(3, '0')}`,
  q, o, a, s, e, sourceUrl, d: 'Intermediate',
}))
