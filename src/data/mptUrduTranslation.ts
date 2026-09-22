import type { BankQuestion } from './mcq'

// Three distinct statements per context test present, past and future
// translation. The alternatives change the tense or meaning, so the answer
// comes from understanding the whole sentence rather than spotting a word.
type TranslationSet = [urdu: [string, string, string], english: [string, string, string], unrelated: string]

const sets: TranslationSet[] = [
  [['وہ ہر صبح اخبار پڑھتا ہے۔', 'اس نے کل اخبار پڑھا۔', 'وہ کل اخبار پڑھے گا۔'], ['He reads the newspaper every morning.', 'He read the newspaper yesterday.', 'He will read the newspaper tomorrow.'], 'He sells the newspaper every morning.'],
  [['ہم وقت پر دفتر پہنچتے ہیں۔', 'ہم کل دفتر دیر سے پہنچے۔', 'ہم کل دفتر وقت پر پہنچیں گے۔'], ['We arrive at the office on time.', 'We arrived late at the office yesterday.', 'We will arrive at the office on time tomorrow.'], 'We leave the office early every day.'],
  [['وہ پانی صاف کرتی ہے۔', 'اس نے پانی صاف کیا۔', 'وہ پانی صاف کرے گی۔'], ['She purifies the water.', 'She purified the water.', 'She will purify the water.'], 'She wastes the water.'],
  [['بچے باغ میں کھیلتے ہیں۔', 'بچے کل باغ میں کھیلے۔', 'بچے کل باغ میں کھیلیں گے۔'], ['The children play in the garden.', 'The children played in the garden yesterday.', 'The children will play in the garden tomorrow.'], 'The children sleep in the garden.'],
  [['استاد سوال سمجھاتا ہے۔', 'استاد نے سوال سمجھایا۔', 'استاد سوال سمجھائے گا۔'], ['The teacher explains the question.', 'The teacher explained the question.', 'The teacher will explain the question.'], 'The teacher ignores the question.'],
  [['وہ روز نئی زبان سیکھتی ہے۔', 'اس نے پچھلے سال نئی زبان سیکھی۔', 'وہ اگلے سال نئی زبان سیکھے گی۔'], ['She learns a new language every day.', 'She learned a new language last year.', 'She will learn a new language next year.'], 'She teaches an old language every day.'],
  [['ہم کھانے سے پہلے ہاتھ دھوتے ہیں۔', 'ہم نے کھانے سے پہلے ہاتھ دھوئے۔', 'ہم کھانے سے پہلے ہاتھ دھوئیں گے۔'], ['We wash our hands before eating.', 'We washed our hands before eating.', 'We will wash our hands before eating.'], 'We wash the dishes after eating.'],
  [['وہ خط لکھتا ہے۔', 'اس نے خط لکھا۔', 'وہ خط لکھے گا۔'], ['He writes a letter.', 'He wrote a letter.', 'He will write a letter.'], 'He reads a letter.'],
  [['پرندے صبح چہچہاتے ہیں۔', 'پرندے صبح چہچہائے۔', 'پرندے صبح چہچہائیں گے۔'], ['Birds chirp in the morning.', 'Birds chirped in the morning.', 'Birds will chirp in the morning.'], 'Birds fly away at night.'],
  [['وہ بس کا انتظار کرتی ہے۔', 'اس نے بس کا انتظار کیا۔', 'وہ بس کا انتظار کرے گی۔'], ['She waits for the bus.', 'She waited for the bus.', 'She will wait for the bus.'], 'She drives the bus.'],
  [['ہم ہر جمعہ بازار جاتے ہیں۔', 'ہم گزشتہ جمعہ بازار گئے۔', 'ہم اگلے جمعہ بازار جائیں گے۔'], ['We go to the market every Friday.', 'We went to the market last Friday.', 'We will go to the market next Friday.'], 'We work at the market every Monday.'],
  [['وہ روز پودوں کو پانی دیتا ہے۔', 'اس نے کل پودوں کو پانی دیا۔', 'وہ کل پودوں کو پانی دے گا۔'], ['He waters the plants every day.', 'He watered the plants yesterday.', 'He will water the plants tomorrow.'], 'He cuts down the plants every day.'],
  [['وہ جلدی میں اپنا بستہ بھولتی ہے۔', 'وہ جلدی میں اپنا بستہ بھول گئی۔', 'وہ جلدی میں اپنا بستہ بھول جائے گی۔'], ['She forgets her bag when she is in a hurry.', 'She forgot her bag when she was in a hurry.', 'She will forget her bag when she is in a hurry.'], 'She carries her bag carefully.'],
  [['کسان کھیت میں گندم اگاتا ہے۔', 'کسان نے کھیت میں گندم اگائی۔', 'کسان کھیت میں گندم اگائے گا۔'], ['The farmer grows wheat in the field.', 'The farmer grew wheat in the field.', 'The farmer will grow wheat in the field.'], 'The farmer buys wheat at the shop.'],
  [['وہ روز اپنی غلطیاں درست کرتا ہے۔', 'اس نے اپنی غلطیاں درست کیں۔', 'وہ اپنی غلطیاں درست کرے گا۔'], ['He corrects his mistakes every day.', 'He corrected his mistakes.', 'He will correct his mistakes.'], 'He repeats his mistakes every day.'],
  [['ڈاکٹر مریض کا معائنہ کرتی ہے۔', 'ڈاکٹر نے مریض کا معائنہ کیا۔', 'ڈاکٹر مریض کا معائنہ کرے گی۔'], ['The doctor examines the patient.', 'The doctor examined the patient.', 'The doctor will examine the patient.'], 'The doctor avoids the patient.'],
  [['وہ ہر ہفتے کتب خانہ جاتی ہے۔', 'وہ گزشتہ ہفتے کتب خانہ گئی۔', 'وہ اگلے ہفتے کتب خانہ جائے گی۔'], ['She visits the library every week.', 'She visited the library last week.', 'She will visit the library next week.'], 'She closes the library every week.'],
  [['ہم بجلی بچاتے ہیں۔', 'ہم نے گزشتہ ماہ بجلی بچائی۔', 'ہم اگلے ماہ بجلی بچائیں گے۔'], ['We save electricity.', 'We saved electricity last month.', 'We will save electricity next month.'], 'We waste electricity.'],
  [['وہ پل کی تعمیر دیکھتا ہے۔', 'اس نے پل کی تعمیر دیکھی۔', 'وہ پل کی تعمیر دیکھے گا۔'], ['He watches the construction of the bridge.', 'He watched the construction of the bridge.', 'He will watch the construction of the bridge.'], 'He designs the bridge himself.'],
  [['طالب علم سبق دہراتے ہیں۔', 'طالب علموں نے سبق دہرایا۔', 'طالب علم سبق دہرائیں گے۔'], ['The students revise the lesson.', 'The students revised the lesson.', 'The students will revise the lesson.'], 'The students skip the lesson.'],
  [['وہ ہر ماہ رقم جمع کرتی ہے۔', 'اس نے گزشتہ ماہ رقم جمع کی۔', 'وہ اگلے ماہ رقم جمع کرے گی۔'], ['She saves money every month.', 'She saved money last month.', 'She will save money next month.'], 'She spends all her money every month.'],
  [['ہم ہر صبح دوڑتے ہیں۔', 'ہم کل صبح دوڑے۔', 'ہم کل صبح دوڑیں گے۔'], ['We run every morning.', 'We ran yesterday morning.', 'We will run tomorrow morning.'], 'We walk slowly every evening.'],
  [['وہ چائے میں چینی ملاتا ہے۔', 'اس نے چائے میں چینی ملائی۔', 'وہ چائے میں چینی ملائے گا۔'], ['He adds sugar to the tea.', 'He added sugar to the tea.', 'He will add sugar to the tea.'], 'He removes sugar from the tea.'],
  [['وہ وقت پر جواب دیتی ہے۔', 'اس نے وقت پر جواب دیا۔', 'وہ وقت پر جواب دے گی۔'], ['She replies on time.', 'She replied on time.', 'She will reply on time.'], 'She asks a new question.'],
  [['ہم روز خبریں سنتے ہیں۔', 'ہم نے کل خبریں سنیں۔', 'ہم کل خبریں سنیں گے۔'], ['We listen to the news every day.', 'We listened to the news yesterday.', 'We will listen to the news tomorrow.'], 'We write the news every day.'],
  [['وہ دروازہ بند کرتا ہے۔', 'اس نے دروازہ بند کیا۔', 'وہ دروازہ بند کرے گا۔'], ['He closes the door.', 'He closed the door.', 'He will close the door.'], 'He opens the window.'],
  [['وہ ہر روز روٹی بناتی ہے۔', 'اس نے کل روٹی بنائی۔', 'وہ کل روٹی بنائے گی۔'], ['She makes bread every day.', 'She made bread yesterday.', 'She will make bread tomorrow.'], 'She buys fruit every day.'],
  [['وہ سڑک احتیاط سے پار کرتا ہے۔', 'اس نے سڑک احتیاط سے پار کی۔', 'وہ سڑک احتیاط سے پار کرے گا۔'], ['He crosses the road carefully.', 'He crossed the road carefully.', 'He will cross the road carefully.'], 'He drives on the road quickly.'],
  [['ہم پانی کو ابالتے ہیں۔', 'ہم نے پانی کو ابالا۔', 'ہم پانی کو ابالیں گے۔'], ['We boil the water.', 'We boiled the water.', 'We will boil the water.'], 'We freeze the water.'],
  [['وہ نقشہ تیار کرتی ہے۔', 'اس نے نقشہ تیار کیا۔', 'وہ نقشہ تیار کرے گی۔'], ['She prepares the map.', 'She prepared the map.', 'She will prepare the map.'], 'She loses the map.'],
  [['وہ ہر روز مریضوں کی مدد کرتا ہے۔', 'اس نے کل مریضوں کی مدد کی۔', 'وہ کل مریضوں کی مدد کرے گا۔'], ['He helps patients every day.', 'He helped patients yesterday.', 'He will help patients tomorrow.'], 'He visits friends every day.'],
  [['ہم کھڑکی سے پہاڑ دیکھتے ہیں۔', 'ہم نے کھڑکی سے پہاڑ دیکھا۔', 'ہم کھڑکی سے پہاڑ دیکھیں گے۔'], ['We see the mountain through the window.', 'We saw the mountain through the window.', 'We will see the mountain through the window.'], 'We climb the mountain every day.'],
  [['وہ اپنا وعدہ نبھاتی ہے۔', 'اس نے اپنا وعدہ نبھایا۔', 'وہ اپنا وعدہ نبھائے گی۔'], ['She keeps her promise.', 'She kept her promise.', 'She will keep her promise.'], 'She forgets her promise.'],
  [['ہم نئی کتابیں خریدتے ہیں۔', 'ہم نے نئی کتابیں خریدیں۔', 'ہم نئی کتابیں خریدیں گے۔'], ['We buy new books.', 'We bought new books.', 'We will buy new books.'], 'We sell old books.'],
  [['وہ درخت کے نیچے بیٹھتا ہے۔', 'وہ درخت کے نیچے بیٹھا۔', 'وہ درخت کے نیچے بیٹھے گا۔'], ['He sits under the tree.', 'He sat under the tree.', 'He will sit under the tree.'], 'He stands beside the tree.'],
  [['وہ صبح جلدی اٹھتی ہے۔', 'وہ کل صبح جلدی اٹھی۔', 'وہ کل صبح جلدی اٹھے گی۔'], ['She gets up early in the morning.', 'She got up early yesterday morning.', 'She will get up early tomorrow morning.'], 'She sleeps late every morning.'],
  [['وہ ہر روز تصویریں بناتا ہے۔', 'اس نے کل تصویریں بنائیں۔', 'وہ کل تصویریں بنائے گا۔'], ['He draws pictures every day.', 'He drew pictures yesterday.', 'He will draw pictures tomorrow.'], 'He hangs pictures on the wall.'],
  [['ہم اپنے پڑوسیوں کو جانتے ہیں۔', 'ہم نے اپنے پڑوسیوں کو پہچانا۔', 'ہم اپنے پڑوسیوں کو جان لیں گے۔'], ['We know our neighbours.', 'We recognised our neighbours.', 'We will get to know our neighbours.'], 'We avoid our neighbours.'],
  [['وہ ماہانہ رپورٹ لکھتی ہے۔', 'اس نے ماہانہ رپورٹ لکھی۔', 'وہ ماہانہ رپورٹ لکھے گی۔'], ['She writes the monthly report.', 'She wrote the monthly report.', 'She will write the monthly report.'], 'She reads the annual report.'],
  [['ہم عید پر اپنے رشتے داروں سے ملتے ہیں۔', 'ہم گزشتہ عید پر اپنے رشتے داروں سے ملے۔', 'ہم اگلی عید پر اپنے رشتے داروں سے ملیں گے۔'], ['We meet our relatives on Eid.', 'We met our relatives last Eid.', 'We will meet our relatives next Eid.'], 'We telephone our friends on Eid.'],
  [['وہ رات کو چراغ جلاتا ہے۔', 'اس نے رات کو چراغ جلایا۔', 'وہ رات کو چراغ جلائے گا۔'], ['He lights the lamp at night.', 'He lit the lamp at night.', 'He will light the lamp at night.'], 'He extinguishes the lamp at night.'],
  [['وہ اپنے سوالات پوچھتی ہے۔', 'اس نے اپنے سوالات پوچھے۔', 'وہ اپنے سوالات پوچھے گی۔'], ['She asks her questions.', 'She asked her questions.', 'She will ask her questions.'], 'She answers their questions.'],
  [['ہم روز مشق کرتے ہیں۔', 'ہم نے کل مشق کی۔', 'ہم کل مشق کریں گے۔'], ['We practise every day.', 'We practised yesterday.', 'We will practise tomorrow.'], 'We stop practising every day.'],
  [['وہ اپنے جوتے صاف کرتا ہے۔', 'اس نے اپنے جوتے صاف کیے۔', 'وہ اپنے جوتے صاف کرے گا۔'], ['He cleans his shoes.', 'He cleaned his shoes.', 'He will clean his shoes.'], 'He sells his shoes.'],
  [['وہ راستہ یاد رکھتی ہے۔', 'اس نے راستہ یاد رکھا۔', 'وہ راستہ یاد رکھے گی۔'], ['She remembers the route.', 'She remembered the route.', 'She will remember the route.'], 'She changes the route.'],
]

export const mptUrduTranslationQuestions: BankQuestion[] = sets.flatMap(([urdu, english, unrelated], setIndex) => (
  urdu.map((sentence, tense) => {
    const options = [...english, unrelated]
    const offset = (setIndex + tense) % 4
    const rotated = options.slice(offset).concat(options.slice(0, offset))
    return {
      id: `mpt-urdu-translation-${setIndex + 1}-${tense + 1}`,
      q: `درست انگریزی ترجمہ منتخب کریں: “${sentence}”`,
      o: rotated,
      a: rotated.indexOf(english[tense]),
      s: 'ترجمہ',
      e: `درست ترجمہ: ${english[tense]}`,
      d: 'Intermediate',
    }
  })
))
