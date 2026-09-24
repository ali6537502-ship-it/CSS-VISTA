import type { BankQuestion } from './mcq'

// Original short passages: no unverifiable real-world statistic is asserted.
// Each pair tests an inference and a qualification or term in context.
type Item = [string, [string, string, string, string], number, string]
type Passage = [string, Item, Item]
const passages: Passage[] = [
  [
    'A district office moved its forms online. Applications arrived faster, but residents without reliable internet often needed help at a crowded service desk. The director kept the digital system and added a staffed counter in each rural centre.',
    ['Why were the rural counters added?', ['To abolish online applications', 'To assist residents who faced a digital access barrier', 'To reduce the number of centres', 'To charge for paper forms'], 1, 'Faster processing did not remove the access problem for residents without reliable internet.'],
    ['Which view best captures the director’s decision?', ['Digital processing and in-person assistance can coexist', 'All applications should be refused', 'Internet access is universal', 'Processing speed alone determines fairness'], 0, 'The director retained online processing while providing an in-person route.'],
  ],
  [
    'Two villages received the same rainfall. One had retained trees on its slopes; the other had cleared them for roads. After a storm, runoff was recorded at both sites, but the observer cautioned that soil and slope also differed.',
    ['What prevents a firm conclusion that tree cover alone caused the runoff difference?', ['Neither village received rain', 'The sites differed in other relevant ways', 'Runoff cannot be measured', 'The observer planted both forests'], 1, 'Soil and slope are possible alternative explanations.'],
    ['What would strengthen the comparison?', ['Measure slopes and soils alongside tree cover', 'Ignore rainfall records', 'Compare one village only', 'Assume all soils absorb equally'], 0, 'Measuring other variables makes the effect of tree cover easier to assess.'],
  ],
  [
    'A library stayed open later during examinations. Visits rose, yet the librarian noticed that the busiest evenings coincided with a nearby college closing its own reading room. She decided to compare several examination periods before changing permanent hours.',
    ['Why did the librarian delay a permanent change?', ['The library had lost its books', 'The increase might partly reflect another reading room’s closure', 'Students never visit in examinations', 'Evening visits had fallen'], 1, 'The nearby closure could explain part of the observed rise.'],
    ['What would comparing several examination periods help establish?', ['Whether high evening demand persists', 'Whether the college will close permanently', 'The age of every visitor', 'The price of new books'], 0, 'Further periods would show whether the observed demand is sustained.'],
  ],
  [
    'A city trialled two bus routes with equal fares. The express route saved time for passengers near the main road but required a long walk for those in smaller streets. The planners kept local stops while changing some buses to express service.',
    ['Which concern shaped the mixed service?', ['Access for passengers away from the main road', 'A desire to increase every fare', 'A shortage of road signs', 'The need to close all local stops'], 0, 'Local stops protect access for passengers far from the express corridor.'],
    ['What trade-off is described?', ['Speed against convenient access', 'Fare against vehicle colour', 'Rail against air travel', 'Advertising against fuel quality'], 0, 'The express route is quicker for some but less accessible for others.'],
  ],
  [
    'A clinic tested a new appointment reminder. Missed visits declined, but the trial included only patients who had supplied phone numbers. The manager refused to claim that reminders would help all patients equally.',
    ['What limits the manager’s conclusion?', ['The clinic had no appointments', 'Patients without phone numbers were not included', 'Every patient received a letter', 'Missed visits increased'], 1, 'The sample excluded patients without a phone number.'],
    ['The manager’s refusal to generalise is an example of:', ['Caution about the representativeness of a sample', 'Rejecting all evidence', 'Changing the appointment date', 'Assuming all patients own phones'], 0, 'Results from a selected group cannot automatically be extended to everyone.'],
  ],
  [
    'An irrigation project reduced the amount of water used per field. Farmers then planted a larger area, so the district’s total water use barely changed. The project team decided to report both water saved per field and total water withdrawn.',
    ['Why are both figures needed?', ['Efficiency per field and total consumption tell different stories', 'The area under crops never changes', 'Total withdrawals are impossible to count', 'Saving water per field always reduces district use'], 0, 'Expansion can offset savings achieved on each field.'],
    ['Which inference is best supported?', ['Efficiency alone need not lower aggregate demand', 'Every farmer planted less', 'The project increased rainfall', 'No field used less water'], 0, 'The district total stayed similar despite per-field savings.'],
  ],
  [
    'A school reported higher examination scores after adding evening classes. During the same year, many experienced teachers returned from leave. The head teacher praised the results but said the classes could not yet be credited with the entire improvement.',
    ['What is the head teacher’s main reservation?', ['There may be another cause of the higher scores', 'The examinations were cancelled', 'Evening classes did not take place', 'Teachers stopped returning'], 0, 'Returning experienced teachers are an alternative explanation.'],
    ['What comparison would be most useful?', ['Comparable pupils with and without the classes', 'The colour of the classroom walls', 'Only the highest score in each class', 'The number of holidays in another country'], 0, 'Comparable groups could help isolate the classes’ effect.'],
  ],
  [
    'A council offered discounted waste collection in a pilot area. Fewer bags appeared beside roads, but some residents said collection had merely shifted dumping to nearby lanes. The council expanded its inspection to the surrounding streets.',
    ['What was the council trying to check?', ['Whether the problem moved rather than diminished', 'Whether waste bags had changed colour', 'Whether the pilot had no participants', 'Whether discounts had been abolished'], 0, 'Dumping may have shifted outside the pilot boundary.'],
    ['Which finding would weaken a claim of overall improvement?', ['More waste appearing in neighbouring lanes', 'Fewer bags on both pilot and neighbouring roads', 'More reliable collection records', 'A stable number of households'], 0, 'Displacement would undermine a claim of an overall reduction.'],
  ],
  [
    'An archive scanned fragile letters so that researchers could view copies. Scanning improved access, but the curator kept the originals under controlled conditions because marks and paper texture were not always visible in a digital image.',
    ['Why were the originals retained?', ['Digital copies cannot preserve every physical feature', 'Copies cannot be shared', 'Researchers had stopped reading', 'The letters were recently written'], 0, 'Certain physical details of the originals are not reproduced fully in scans.'],
    ['What is the curator’s position?', ['Digital access complements physical preservation', 'Scanning makes originals worthless', 'Only digital records can be trusted', 'All letters should be displayed outdoors'], 0, 'The curator values access and preservation together.'],
  ],
  [
    'A food programme offered the same ration to every household. A review found that larger households exhausted it sooner. Officials then tested a formula that considered household size while preserving a guaranteed minimum for everyone.',
    ['Which limitation of the old policy prompted the review?', ['Equal rations did not meet unequal household needs', 'The minimum was too generous for all', 'No household accepted food', 'Rations were never delivered'], 0, 'The same ration lasted different lengths of time in households of different sizes.'],
    ['Why retain a guaranteed minimum?', ['To keep a basic entitlement for every household', 'To exclude large families', 'To eliminate all records', 'To make household size irrelevant'], 0, 'The minimum preserves universal basic coverage.'],
  ],
  [
    'A factory replaced an old machine that consumed less electricity per unit of output. Orders then increased, and the factory’s overall electricity bill rose. The manager separated the efficiency measure from the total bill when reporting results.',
    ['How can the total bill rise despite better efficiency?', ['Total production can increase enough to outweigh per-unit savings', 'Electricity use per unit must have risen', 'Orders always reduce output', 'An efficient machine uses no energy'], 0, 'A larger volume of output may more than offset lower energy use per unit.'],
    ['Which figure measures the new machine’s efficiency most directly?', ['Electricity per unit produced', 'The factory’s total orders', 'The annual rent', 'The number of employees'], 0, 'Per-unit energy use measures the stated efficiency improvement.'],
  ],
  [
    'A town installed sensors on three bridges. One sensor issued frequent warnings during ordinary traffic, while another detected a fault later confirmed by engineers. Officials kept the network but required a physical check before closing a bridge.',
    ['Why did officials require physical checks?', ['Sensor alerts can be false as well as useful', 'Every bridge was already closed', 'Engineers had no role', 'Traffic cannot affect readings'], 0, 'The evidence includes both a false alert and a confirmed fault.'],
    ['Which decision best reflects the passage?', ['Use sensor data as an aid to inspection', 'Discard all sensor readings', 'Close every bridge on each alert', 'Stop inspecting bridges entirely'], 0, 'The network remains useful alongside verification.'],
  ],
  [
    'A survey asked commuters how they travelled to work. It was shared mainly through an office mailing list, so people who worked from home and informal workers were less likely to respond. The report presented its findings as a description of respondents.',
    ['Why did the report avoid describing all workers?', ['The recruitment method left some groups underrepresented', 'No respondent travelled to work', 'The survey collected no answers', 'Every worker used the mailing list'], 0, 'The sample did not represent all kinds of workers equally.'],
    ['Which label best fits the mailing-list limitation?', ['Selection bias', 'Random assignment', 'Perfect coverage', 'Measurement without sampling'], 0, 'Recruitment through one channel favoured some groups.'],
  ],
  [
    'A town announced free museum entry on Sundays. Attendance rose sharply, but the museum also opened a new exhibition that month. The director said the fee change was promising and requested another period of observation after the exhibition ended.',
    ['Why was the director cautious?', ['The new exhibition could also have attracted visitors', 'Admission had become more expensive', 'The museum closed on Sundays', 'Attendance had been constant'], 0, 'The exhibition changed at the same time as the fee.'],
    ['What would the later observation help distinguish?', ['The effect of free entry from a temporary exhibition effect', 'The age of every visitor', 'The cost of repainting the museum', 'The price of tickets in another town'], 0, 'Observing after the exhibition ends removes one competing explanation.'],
  ],
  [
    'A committee received two cost estimates for a new school. The cheaper estimate excluded maintenance, while the dearer included repairs over five years. Members asked for estimates on the same basis before choosing a contractor.',
    ['Why were the original estimates not directly comparable?', ['They covered different categories of cost', 'They had the same total', 'Neither mentioned construction', 'Both were prepared by one contractor'], 0, 'Maintenance was included in only one estimate.'],
    ['What does “on the same basis” imply here?', ['Using a common scope and time period', 'Choosing the lowest number immediately', 'Ignoring repairs in every estimate', 'Delaying the school indefinitely'], 0, 'Comparable estimates must include the same cost categories and period.'],
  ],
  [
    'A bank invited customers to use an automated helpline. Straightforward questions were resolved faster, but complicated complaints often required repeated calls. The bank added a route to a trained adviser after the first unsuccessful attempt.',
    ['What problem did the new route address?', ['Repeated calls for complex cases', 'A ban on all automated answers', 'A lack of straightforward queries', 'The need to close the bank'], 0, 'Complex cases were poorly served by repeated automation.'],
    ['Which policy is most consistent with the passage?', ['Match the response channel to the complexity of the case', 'Use automation for every case without exception', 'Send all callers away', 'Never measure resolution time'], 0, 'Routine and complex matters require different levels of support.'],
  ],
  [
    'A river agency reported fewer pollution incidents after installing monitoring stations. It also admitted that earlier records came from occasional visits and might have missed short spills. The director warned against treating the two counts as a clean before-and-after comparison.',
    ['What makes the comparison uncertain?', ['The two periods used different detection methods', 'The river had disappeared', 'No stations were installed', 'Pollution can never be counted'], 0, 'Occasional visits and continuous stations may detect different numbers of incidents.'],
    ['Which improvement would make a later trend more credible?', ['Apply a consistent monitoring method over time', 'Stop recording short incidents', 'Compare only different rivers', 'Change the definition every week'], 0, 'A consistent measurement method supports comparisons across periods.'],
  ],
  [
    'Farmers in one area planted a drought-tolerant crop after a dry season. It yielded less during a wet trial year but prevented serious losses when rainfall was poor. The advisory service discussed risk across several years rather than a single season’s yield.',
    ['Why consider several years?', ['The crop’s advantage appears under particular weather conditions', 'Rainfall never changes', 'The trial year had no harvest', 'A single yield reveals every future result'], 0, 'Performance differs across wet and dry years.'],
    ['What is the implied trade-off?', ['Potential maximum yield against protection from drought losses', 'Crop colour against field size', 'Selling price against seed colour', 'Rainfall against soil existence'], 0, 'The crop may yield less in wet conditions but reduce losses in dry ones.'],
  ],
  [
    'A town translated its emergency notices into three languages. Translators agreed on most words, but one technical term had a meaning that varied by community. Officials tested draft notices with speakers from each area before printing them.',
    ['Why test the notices with local speakers?', ['A literal translation might be misunderstood in some communities', 'The notices were to remain secret', 'No one could read the notices', 'The three languages were identical'], 0, 'The term could convey different meanings in different communities.'],
    ['What principle does the testing illustrate?', ['Comprehensibility matters alongside literal accuracy', 'Technical vocabulary never changes meaning', 'Community feedback is always unnecessary', 'Notices should use one language only'], 0, 'The purpose is effective communication, not word-for-word conversion alone.'],
  ],
  [
    'An agency rated projects by the number of people reached. A small remote clinic scored poorly, even though its patients had no nearby alternative. The agency revised the score to consider both reach and the availability of other services.',
    ['What weakness did the original rating have?', ['It ignored whether people had alternatives', 'It counted no patients anywhere', 'It always favoured remote clinics', 'It measured staff training only'], 0, 'A low number reached can conceal high need where alternatives are absent.'],
    ['What does the revision attempt to balance?', ['Scale of benefit and severity of unmet need', 'Staff uniforms and opening hours', 'Project age and building colour', 'Travel distance and food prices'], 0, 'The revised score considers both numbers reached and access to substitutes.'],
  ],
  [
    'A newspaper corrected a headline after finding that a preliminary estimate had been reported as a final count. The underlying study had not changed; only its status had been misrepresented. The editor placed the correction beside the original story.',
    ['What was the headline’s error?', ['It treated provisional information as definitive', 'It quoted the final count correctly', 'It omitted the study altogether', 'It used a different language'], 0, 'The estimate was preliminary rather than final.'],
    ['Why place the correction beside the story?', ['Readers of the original claim can see its correction', 'To hide the error from readers', 'To alter the underlying study', 'To remove all earlier editions'], 0, 'Proximity helps readers connect the correction with the claim.'],
  ],
  [
    'A public garden planted fast-growing trees. Shade increased quickly, but the same species became vulnerable to one disease. The gardeners decided that future planting should include several species even if shade grew more slowly.',
    ['What prompted the change in planting?', ['Dependence on one species created a shared risk', 'The garden had no shade', 'All trees grew at the same rate', 'The disease affected buildings'], 0, 'A single disease could threaten many trees of the same species.'],
    ['What trade-off did the gardeners accept?', ['Slower shade growth in exchange for diversity', 'Less diversity for more immediate shade', 'No trees for larger paths', 'Higher disease risk for lower cost'], 0, 'They prioritised resilience over the fastest possible shade.'],
  ],
  [
    'An evaluation compared two training groups. Volunteers chose the new course, while those in the old course were assigned by their employers. The evaluator said higher scores in the new group could reflect motivation as well as teaching.',
    ['Why are the higher scores inconclusive?', ['The groups may have differed before training began', 'Neither group completed the course', 'Scores cannot be compared at all', 'Every participant had the same motivation'], 0, 'Self-selection may create a motivational difference unrelated to teaching.'],
    ['Which design would better isolate the course’s effect?', ['Assign comparable participants to courses at random', 'Allow only top scorers to volunteer', 'Measure only the new group', 'Change the test between groups'], 0, 'Random assignment reduces selection differences between groups.'],
  ],
  [
    'A village installed a water meter at its main tank. The measured outflow exceeded the total recorded at households. Engineers investigated leaks but also checked whether every household meter was working before estimating the loss.',
    ['Why check household meters?', ['Faulty readings could mimic or exaggerate a leak', 'Meters make leaks impossible', 'Every household used equal water', 'Tank outflow was unmeasured'], 0, 'A measurement error can explain part of the difference.'],
    ['What does the difference between the two totals establish on its own?', ['There is an unexplained discrepancy', 'The exact location of every leak', 'That all household meters are accurate', 'That no water reaches homes'], 0, 'The difference alone does not identify its cause.'],
  ],
  [
    'A local market reported more registered traders after fees were reduced. Some traders explained that they had been operating before the change but had never registered. Officials separated newly registered businesses from genuinely new businesses.',
    ['Why make that distinction?', ['Registration can rise without the same rise in actual businesses', 'All registrations must be false', 'Lower fees always close markets', 'A registered trader cannot have operated before'], 0, 'Some existing traders may simply have entered the records.'],
    ['What would overstate growth in business activity?', ['Counting every new registration as a new business', 'Asking when each trader began operating', 'Reporting both registration and operation dates', 'Comparing fee receipts separately'], 0, 'New registrations are not necessarily new economic activity.'],
  ],
  [
    'A university offered recorded lessons to students with long commutes. Most watched them, but attendance at discussion sessions remained uneven. The teacher concluded that easier access to lectures had solved only part of the learning problem.',
    ['What remained unresolved?', ['Participation in discussion sessions', 'Access to any recorded lesson', 'The existence of the university', 'The length of every lecture'], 0, 'Recorded lectures did not make discussion attendance consistent.'],
    ['Which conclusion follows best?', ['Access to material does not guarantee active participation', 'Recordings always reduce learning', 'All commuters dislike discussion', 'Discussion sessions have ended'], 0, 'The two outcomes did not improve equally.'],
  ],
  [
    'A coastal community agreed to seasonal fishing limits. Catches fell during the restriction, and some residents called the rule a failure. The committee said the test was whether catches and fish stocks recovered over several seasons.',
    ['Why did the committee reject an immediate verdict?', ['The intended benefits take longer to assess', 'The rule applied to no fishing boats', 'Catches had risen immediately', 'Fish stocks cannot be observed'], 0, 'The policy’s aim is recovery across seasons, not a high catch during the restriction.'],
    ['What evidence would best evaluate the stated goal?', ['Fish-stock and catch trends over several seasons', 'Only the first restricted week’s sales', 'The number of committee members', 'Prices in an inland market'], 0, 'The stated goal concerns medium-term recovery.'],
  ],
  [
    'A city planted trees near a heat sensor. Its readings fell, but a second sensor in a shaded lane had been cooler even before planting. Researchers compared each site with its own earlier readings rather than comparing only the two sites.',
    ['Why compare each site with its earlier readings?', ['The sites began with different temperature conditions', 'The sensors had no earlier records', 'Both lanes had identical shade', 'Trees cannot change temperature'], 0, 'A baseline difference makes a simple between-site comparison misleading.'],
    ['What would most directly show the change at the planted site?', ['Its reading before and after planting under comparable conditions', 'Only a reading from the shaded lane', 'The number of trees in another city', 'The cost of the heat sensor'], 0, 'A before-and-after comparison at the same site addresses the change.'],
  ],
  [
    'An office adopted a rule requiring two signatures for purchases. Errors fell, but urgent small orders were delayed. Managers kept two approvals for large purchases and introduced a recorded exception for minor urgent ones.',
    ['What conflict did managers address?', ['Control against timely processing', 'Building size against floor space', 'Publicity against secrecy only', 'Staff numbers against leave dates'], 0, 'Extra checks reduce mistakes but can slow urgent purchases.'],
    ['What feature makes the exception accountable?', ['It is recorded', 'It applies to all large orders', 'It requires no reason', 'It hides the purchase'], 0, 'A recorded exception can be reviewed.'],
  ],
  [
    'An app marked an answer correct only if it matched an exact phrase. Several equivalent explanations were rejected. The developers introduced a review process for answers expressing the same idea in different words.',
    ['What problem did the exact-match rule create?', ['It could reject a substantively correct answer', 'It accepted every unrelated answer', 'It prevented any answer being submitted', 'It corrected all spelling mistakes'], 0, 'Equivalent explanations can differ in wording.'],
    ['Why add human review?', ['To judge meaning when phrasing differs', 'To require longer answers from everyone', 'To remove the question bank', 'To make exact matching stricter'], 0, 'Review can assess whether differently worded responses express the same idea.'],
  ],
  [
    'A municipality assessed a pilot based on the number of complaints received. Complaints increased after a new reporting line became easier to use. Officials decided to measure both the number reported and the number resolved.',
    ['Why could more complaints be misleading?', ['Reporting became easier, so more problems may now be visible', 'The reporting line stopped working', 'All complaints had been resolved before reporting', 'A complaint always proves a new problem'], 0, 'The reporting channel can affect the observed count.'],
    ['Which measure adds information about the response?', ['The share of complaints resolved', 'The length of the reporting line', 'The colour of complaint forms', 'The number of unrelated offices'], 0, 'Resolution indicates how the municipality handled reported cases.'],
  ],
  [
    'A committee delayed releasing a forecast because its assumptions depended on rainfall that had not yet been observed. It published a range of possible outcomes instead of a single figure and promised an update when new measurements arrived.',
    ['Why publish a range?', ['The result depends on uncertain future rainfall', 'The committee had no assumptions', 'A single outcome was already known', 'The forecast concerned past rainfall only'], 0, 'Different rainfall outcomes lead to different forecasts.'],
    ['What does the promised update acknowledge?', ['New evidence may change the forecast', 'Forecasts are never revised', 'Measurements are unnecessary', 'The range is a final measurement'], 0, 'The committee expects better information later.'],
  ],
  [
    'An organisation made its reports shorter to encourage reading. More people opened them, but fewer could find the evidence behind a headline. Editors retained short summaries and added links to the methods and full tables.',
    ['What weakness did the redesign address?', ['Readers needed access to supporting evidence', 'Summaries were never opened', 'The full tables did not exist', 'Headlines had become too long'], 0, 'Some readers could not trace claims to the underlying material.'],
    ['Which pair of goals does the final design combine?', ['Ease of reading and transparency', 'Secrecy and speed', 'Longer headlines and fewer tables', 'More pages and fewer readers'], 0, 'A short summary is accessible; linked methods and tables provide transparency.'],
  ],
  [
    'A province tested flood warnings by text message. Many subscribers received messages promptly, but households in places without mobile coverage did not. Officials paired texts with local radio and community volunteers.',
    ['Why use more than one warning channel?', ['Mobile coverage did not reach everyone', 'Texts arrived late for every subscriber', 'Radio had been abolished', 'Flood warnings were no longer needed'], 0, 'A single channel excludes people outside its coverage.'],
    ['What general principle is illustrated?', ['Redundant communication can improve reach', 'One channel always reaches everyone', 'Volunteers replace all measurements', 'Warnings should be delayed'], 0, 'Using complementary channels increases the chance of reaching households.'],
  ],
  [
    'A heritage site limited daily entries after visitors began damaging a narrow path. Nearby shopkeepers feared losing trade, so managers tested timed tickets and promoted visits outside the busiest hours before imposing a fixed cap.',
    ['What did timed tickets aim to address?', ['Crowding without necessarily cutting all visits', 'The age of the path', 'The cost of every shop item', 'The site’s historical date'], 0, 'Scheduling can spread visitors across available hours.'],
    ['What two concerns did managers balance?', ['Conservation and local economic activity', 'Printing costs and staff uniforms', 'Road signs and entrance colours', 'Weather forecasts and museum labels'], 0, 'They considered damage to the site and trade near it.'],
  ],
  [
    'A researcher found that districts with more clinics also recorded more diagnosed cases. She warned that better access might reveal illnesses previously missed; the figures alone did not show that clinics caused the illnesses.',
    ['Why does the correlation not establish causation?', ['Better diagnosis may increase the recorded count', 'Clinics always eliminate illness', 'The districts had no residents', 'Every diagnosis was false'], 0, 'Greater access to diagnosis can make existing illness more visible.'],
    ['Which further information would help interpret the pattern?', ['How diagnosis and access changed over time', 'The paint colour of clinics', 'The names of all visitors', 'The distance between district borders'], 0, 'Tracking access and detection helps separate measurement changes from illness levels.'],
  ],
  [
    'A screening test correctly identified most people who had a rare condition. However, because the condition affected only a small fraction of the population, many positive results still came from people who did not have it. The clinic required a confirmatory test before treatment.',
    ['Why could a positive screening result still be wrong?', ['The condition was rare and false positives accumulated among the much larger unaffected group', 'The test identified no affected person', 'Every positive result was ignored', 'Treatment had already begun'], 0, 'When prevalence is low, false positives from a large unaffected population can form a substantial share of positive results.'],
    ['What is the purpose of the confirmatory test?', ['To distinguish likely true positives from false positives before treatment', 'To increase the rarity of the condition', 'To replace all screening with guesswork', 'To guarantee that no one is tested'], 0, 'A second, more specific assessment reduces the risk of acting on a false positive.'],
  ],
  [
    'A province piloted tutoring in schools with the lowest examination scores. Scores improved the next year, but evaluators noted that unusually low results often rise somewhat even without intervention. They compared the pilot schools with similarly low-scoring schools that did not receive tutoring.',
    ['Why was a comparison group necessary?', ['Some improvement might reflect a rebound from an unusually low year', 'Tutoring cannot affect scores', 'The pilot schools had no earlier results', 'Only high-scoring schools can be compared'], 0, 'A comparison helps separate the programme effect from ordinary movement after an extreme result.'],
    ['Which inference would be strongest?', ['Pilot schools improved more than comparable untreated schools', 'Every pilot school improved by the same amount', 'One school recorded the highest score', 'Tutors reported enjoying the programme'], 0, 'The difference in change between comparable groups is more informative than the pilot group’s change alone.'],
  ],
  [
    'A procurement panel received a low bid for water pumps, but the bid assumed frequent replacement and excluded energy costs. A higher bid offered more efficient pumps with a longer service life. The panel compared total cost over ten years instead of purchase price alone.',
    ['Why might the lowest purchase price not be the least costly option?', ['Replacement and energy costs can outweigh the initial saving', 'Purchase prices never matter', 'Efficient pumps use more energy by definition', 'A longer service life always increases failures'], 0, 'Whole-life cost includes expenses that do not appear in the initial price.'],
    ['What decision rule did the panel adopt?', ['Compare costs over a common operating life', 'Choose the longest document', 'Ignore maintenance and power use', 'Reject every higher initial bid'], 0, 'The ten-year comparison places acquisition and operating costs on the same basis.'],
  ],
  [
    'A solar plant was described as having a capacity of 100 megawatts. Its annual average output was lower because nights, cloud cover and maintenance limited generation. The operator reported both installed capacity and actual energy produced rather than treating them as interchangeable.',
    ['Why was average output below installed capacity?', ['The plant could not operate at maximum output continuously', 'Installed capacity measures annual rainfall', 'Maintenance always increases generation', 'The plant produced no electricity'], 0, 'Capacity is a maximum rating, while actual production depends on operating conditions and time.'],
    ['Which comparison would best assess two plants’ realised performance?', ['Actual energy produced relative to capacity over the same period', 'Only the larger nameplate number', 'The colour of their panels', 'Their distance from the operator’s office'], 0, 'Relating production to capacity over a common period accounts for different plant sizes.'],
  ],
]

export const mptComprehensionPassageCount = passages.length

export const mptComprehensionQuestions: BankQuestion[][] = passages.map(([passage, first, second], index) => (
  [first, second].map(([prompt, o, a, e], questionIndex) => ({
    id: `mpt-comprehension-${String(index + 1).padStart(2, '0')}-${questionIndex + 1}`,
    q: `Read the passage: “${passage}”\n\n${prompt}`,
    o, a, e,
    s: 'Comprehension',
    d: 'Advanced',
  }))
))
