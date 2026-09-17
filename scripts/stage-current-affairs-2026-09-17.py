#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PKT = timezone(timedelta(hours=5))
NOW = datetime.now(PKT).replace(microsecond=0).isoformat()
DATE = "2026-09-17"

stories = [
    {
        "id": "pakistan-austerity-fuel-conservation-2026-09-17",
        "category": "Pakistan Economy, Governance & Energy Security",
        "headline": "Pakistan announces fresh austerity and fuel-conservation measures",
        "summary": "The federal government announced immediate austerity and fuel-conservation measures, including a 50% reduction in fuel provision for official vehicles, a 5% cut in the non-ERE budget, a three-month restriction on official foreign travel, and limits on new vehicle and durable-goods purchases.",
        "what_happened": "The measures were announced on 17 September as Pakistan sought to reduce government expenditure and conserve fuel amid elevated global petroleum prices and Middle East tensions.",
        "why_it_matters": "The package links fiscal restraint with energy security and illustrates how external commodity-price shocks can force domestic expenditure and conservation measures.",
        "pakistan_perspective": "For Pakistan, the measures aim to reduce the fiscal and external-account pressure created by expensive imported energy while shielding essential services through exemptions.",
        "key_takeaways": [
            "Fuel provision for official vehicles was cut by 50%, with exemptions for essential and operational services.",
            "The government approved a 5% reduction in the non-ERE budget for FY2026-27 and a three-month restriction on official foreign travel.",
        ],
        "facts": [
            {"label": "Official-vehicle fuel reduction", "value": "50%"},
            {"label": "Non-ERE budget reduction", "value": "5%"},
            {"label": "Foreign-travel restriction", "value": "Three months"},
        ],
        "what_to_watch": ["Implementation across federal entities and any adoption of similar measures by provincial governments."],
        "question_angles": ["How do imported-energy shocks affect fiscal policy, inflation and external-sector management in Pakistan?"],
        "topics": ["Austerity", "Fuel conservation", "Fiscal policy", "Energy security"],
        "countries": ["Pakistan"],
        "institutions": ["Federal Government of Pakistan", "Cabinet Division"],
        "organisations": [], "reports": [], "treaties": [], "people": ["Shehbaz Sharif"],
        "sources": [
            {"publisher": "Associated Press of Pakistan", "title": "Federal govt imposes fresh austerity measures, cuts official fuel by 50pc", "url": "https://www.app.com.pk/national/federal-govt-imposes-fresh-austerity-measures-cuts-official-fuel-by-50pc/", "published_at": "2026-09-17", "source_type": "Official News Agency"},
            {"publisher": "Radio Pakistan", "title": "PM approves nationwide austerity campaign", "url": "https://radio.gov.pk/17-09-2026/pm-approves-nationwide-austerity-campaign", "published_at": "2026-09-17", "source_type": "Official Source"},
        ],
    },
    {
        "id": "pakistan-china-swap-us-financing-2026-09-17",
        "category": "Pakistan Economy & Foreign Relations",
        "headline": "Pakistan plans to seek larger China currency-swap line and awaits US financing decision",
        "summary": "Finance Minister Muhammad Aurangzeb said Pakistan plans to seek an expansion of its 30 billion yuan currency-swap line with China when it is renewed in 2027 and expects a US decision within two months on a proposed $10 billion exchange-stabilisation facility.",
        "what_happened": "Aurangzeb outlined Pakistan's external-financing discussions with China and the United States while discussing reserve support, investment and the impact of high oil prices.",
        "why_it_matters": "Currency swaps and exchange-stabilisation facilities can support foreign-exchange liquidity, debt management and confidence during periods of external pressure.",
        "pakistan_perspective": "The discussions show Pakistan's effort to diversify external financing and maintain relationships with both China and the United States while managing IMF-linked reforms and energy-price risks.",
        "key_takeaways": [
            "Pakistan's existing China currency-swap line is 30 billion yuan.",
            "The finance minister said Pakistan expects a US decision within two months on a proposed $10 billion exchange-stabilisation facility.",
        ],
        "facts": [
            {"label": "Existing China swap line", "value": "30 billion yuan"},
            {"label": "Proposed US exchange-stabilisation facility", "value": "$10 billion"},
        ],
        "what_to_watch": ["Terms of the 2027 China swap renewal and any formal US decision on the proposed facility."],
        "question_angles": ["Assess the role of bilateral currency swaps and external financing in Pakistan's balance-of-payments management."],
        "topics": ["Foreign exchange", "Currency swap", "Pakistan-China relations", "Pakistan-US relations"],
        "countries": ["Pakistan", "China", "United States"],
        "institutions": ["Ministry of Finance of Pakistan"],
        "organisations": ["International Monetary Fund"], "reports": [], "treaties": [], "people": ["Muhammad Aurangzeb"],
        "sources": [
            {"publisher": "Reuters", "title": "Pakistan eyes bigger China swap line, expects US financing decision soon", "url": "https://www.reuters.com/world/asia-pacific/pakistan-eyes-bigger-china-swap-line-expects-us-financing-decision-soon-2026-09-17/", "published_at": "2026-09-17", "source_type": "News Report"}
        ],
    },
    {
        "id": "pakistan-current-account-fdi-august-2026",
        "category": "Pakistan Economy & External Sector",
        "headline": "Pakistan's August current-account deficit narrows to $98 million as FDI rises",
        "summary": "Pakistan recorded a $98 million current-account deficit in August 2026, while foreign direct investment reached $315.9 million; the two-month FY2026-27 current-account deficit stood at $543 million.",
        "what_happened": "State Bank of Pakistan data released for August showed a substantially smaller monthly external gap and stronger FDI inflows, although high oil prices remain a risk to the external account.",
        "why_it_matters": "The current account is a core indicator of external-sector sustainability, while FDI provides longer-term financing that does not create the same repayment profile as debt flows.",
        "pakistan_perspective": "A narrower deficit provides near-term support to external stability, but Pakistan remains vulnerable to imported-energy costs and a wider goods-trade gap.",
        "key_takeaways": [
            "The August 2026 current-account deficit was $98 million.",
            "FDI inflows were $315.9 million in August and $494.5 million in July-August FY2026-27.",
        ],
        "facts": [
            {"label": "August 2026 current-account deficit", "value": "$98 million"},
            {"label": "July-August FY2026-27 current-account deficit", "value": "$543 million"},
            {"label": "August 2026 FDI", "value": "$315.9 million"},
        ],
        "what_to_watch": ["September trade, remittance and oil-import data and the effect of Gulf energy prices on the external balance."],
        "question_angles": ["What factors determine Pakistan's current-account balance, and why do remittances and energy imports matter?"],
        "topics": ["Current account", "Foreign direct investment", "Balance of payments", "Remittances"],
        "countries": ["Pakistan"],
        "institutions": ["State Bank of Pakistan"],
        "organisations": [], "reports": ["Balance of Payments BPM6 for August 2026", "Foreign Investment in Pakistan for August 2026"], "treaties": [], "people": [],
        "sources": [
            {"publisher": "State Bank of Pakistan", "title": "Data Calendar", "url": "https://www.sbp.org.pk/data-calendar", "published_at": "2026-09-16", "source_type": "Official Data"},
            {"publisher": "Dawn", "title": "Current account deficit narrows to $98m in August", "url": "https://www.dawn.com/news/2030493", "published_at": "2026-09-17", "source_type": "News Report"},
        ],
    },
    {
        "id": "pakistan-china-boundary-joint-commission-2026-09-17",
        "category": "Pakistan Foreign Relations & Border Management",
        "headline": "Pakistan and China operationalise Boundary Joint Commission",
        "summary": "Pakistan's Foreign Office said Pakistan and China operationalised the Pakistan-China Boundary Joint Commission on 16 September, with the inaugural meeting held at the Ministry of Foreign Affairs in Islamabad.",
        "what_happened": "The Commission was established as a bilateral mechanism to strengthen cooperation in border management, joint surveys, trade facilitation and people-to-people connectivity.",
        "why_it_matters": "Institutionalised boundary management supports border stability, trade flows and connectivity between two strategic partners sharing a high-altitude frontier.",
        "pakistan_perspective": "The mechanism gives Pakistan and China a structured forum for practical border-management and survey cooperation alongside wider economic and strategic ties.",
        "key_takeaways": [
            "The inaugural meeting of the Pakistan-China Boundary Joint Commission was held in Islamabad.",
            "Its work covers border management, joint surveys, trade facilitation and people-to-people connectivity.",
        ],
        "facts": [{"label": "Operationalised", "value": "16 September 2026"}, {"label": "Venue", "value": "Ministry of Foreign Affairs, Islamabad"}],
        "what_to_watch": ["Follow-up survey, border-management and trade-facilitation decisions under the Commission."],
        "question_angles": ["How do institutional border-management mechanisms contribute to stable bilateral relations and regional connectivity?"],
        "topics": ["Pakistan-China relations", "Border management", "Trade facilitation"],
        "countries": ["Pakistan", "China"],
        "institutions": ["Ministry of Foreign Affairs of Pakistan", "Pakistan-China Boundary Joint Commission"],
        "organisations": [], "reports": [], "treaties": [], "people": [],
        "sources": [
            {"publisher": "Ministry of Foreign Affairs, Pakistan", "title": "Transcript of the Press Briefing by the Spokesperson on Wednesday 17th September 2026", "url": "https://mofa.gov.pk/press-releases/transcript-of-the-press-briefing-by-the-spokesperson-on-wednesday-17th-september-2026", "published_at": "2026-09-17", "source_type": "Official Source"}
        ],
    },
    {
        "id": "supreme-court-imaan-hadi-sentence-suspension-2026-09-17",
        "category": "Pakistan Law, Courts & Digital Rights",
        "headline": "Supreme Court suspends Imaan Mazari and Hadi Chattha sentences pending appeals",
        "summary": "Pakistan's Supreme Court suspended the sentences of lawyer Imaan Zainab Mazari-Hazir and Hadi Ali Chattha in the social-media-posts case and ordered their release while their appeals proceed.",
        "what_happened": "A two-judge bench comprising Justice Naeem Akhtar Afghan and Justice Ishtiaq Ibrahim heard appeals against the Islamabad High Court's earlier refusal to suspend the sentences.",
        "why_it_matters": "The case is relevant to the application of the Prevention of Electronic Crimes Act, appellate safeguards and the balance between criminal enforcement and digital-expression rights.",
        "pakistan_perspective": "The Supreme Court's interim relief does not decide the underlying appeals but affects custody while the convictions are reviewed.",
        "key_takeaways": [
            "The Supreme Court suspended the sentences and ordered the couple's release pending appeal.",
            "The underlying convictions arose from charges under the Prevention of Electronic Crimes Act (PECA).",
        ],
        "facts": [{"label": "Supreme Court bench", "value": "Justice Naeem Akhtar Afghan and Justice Ishtiaq Ibrahim"}],
        "what_to_watch": ["The Supreme Court's eventual determination of the appeals and any interpretation of PECA provisions."],
        "question_angles": ["Discuss judicial safeguards and freedom-of-expression concerns in the enforcement of Pakistan's cybercrime law."],
        "topics": ["PECA", "Supreme Court of Pakistan", "Digital rights", "Appeals"],
        "countries": ["Pakistan"],
        "institutions": ["Supreme Court of Pakistan", "Islamabad High Court"],
        "organisations": [], "reports": [], "treaties": [], "people": ["Imaan Zainab Mazari-Hazir", "Hadi Ali Chattha", "Naeem Akhtar Afghan", "Ishtiaq Ibrahim"],
        "sources": [
            {"publisher": "Dawn", "title": "SC suspends Imaan, Hadi's sentences in controversial social media posts case, orders their release", "url": "https://www.dawn.com/news/2030611", "published_at": "2026-09-17", "source_type": "News Report"}
        ],
    },
    {
        "id": "pakistan-lsm-july-2026-growth",
        "category": "Pakistan Economy & Industry",
        "headline": "Pakistan's large-scale manufacturing output rises 3.03% year-on-year in July",
        "summary": "Pakistan Bureau of Statistics reported that Large Scale Manufacturing Industries output increased 3.03% in July 2026 compared with July 2025; the provisional QIM for July was 119.13 on the 2015-16 base.",
        "what_happened": "PBS released the provisional Quantum Index Numbers for July 2026, showing positive year-on-year industrial output growth.",
        "why_it_matters": "Large-scale manufacturing is a key indicator of industrial momentum, employment conditions, tax capacity and broader economic recovery.",
        "pakistan_perspective": "Sustained LSM growth would support the transition from macroeconomic stabilisation toward investment- and productivity-led growth.",
        "key_takeaways": ["LSM output rose 3.03% year-on-year in July 2026.", "The provisional July QIM was 119.13 on base year 2015-16."],
        "facts": [{"label": "July 2026 LSM year-on-year growth", "value": "3.03%"}, {"label": "July 2026 QIM", "value": "119.13"}],
        "what_to_watch": ["Whether industrial growth persists in subsequent months despite energy-price and external-demand pressures."],
        "question_angles": ["What does the Large Scale Manufacturing index reveal about Pakistan's industrial cycle?"],
        "topics": ["Large Scale Manufacturing", "Industrial growth", "Quantum Index of Manufacturing"],
        "countries": ["Pakistan"],
        "institutions": ["Pakistan Bureau of Statistics"],
        "organisations": [], "reports": ["Quantum Index Numbers of Large Scale Manufacturing Industries for July 2026"], "treaties": [], "people": [],
        "sources": [
            {"publisher": "Pakistan Bureau of Statistics", "title": "Summary of Provisional Quantum Index Numbers of Large Scale Manufacturing Industries (QIM) for July 2026", "url": "https://www.pbs.gov.pk/summary-of-provisional-quantum-index-numbers-of-large-scale-manufacturing-industries-qim-for-july-2026/", "published_at": "2026-09-16", "source_type": "Official Data"}
        ],
    },
    {
        "id": "eu-kids-act-2026-09-17",
        "category": "Technology Regulation & Digital Society",
        "headline": "European Commission proposes EU KIDS Act with age-based social-media restrictions",
        "summary": "The European Commission adopted a proposal for an EU KIDS Act that would bar social-media access for children under 13, allow parent-managed limited accounts from 13 to under 15, and permit autonomous accounts from age 15 subject to wider safety-by-design obligations.",
        "what_happened": "The proposal creates EU-wide age rules, stronger default protections, privacy-preserving age checks and additional duties for online services used by minors, including AI companions and chatbots.",
        "why_it_matters": "The proposal could become a major global benchmark for children's online safety, age assurance, platform design and AI safeguards.",
        "global_implications": "If adopted, the rules would affect major global social-media, video-sharing, gaming and AI services operating in the EU and could influence regulation elsewhere.",
        "key_takeaways": [
            "Under 13s would not be allowed to access social-media services under the proposal.",
            "Ages 13 to under 15 could use parent-managed mini accounts with limited features and a one-hour daily limit; autonomous accounts would begin at 15.",
        ],
        "facts": [{"label": "Minimum age for autonomous social-media account", "value": "15"}, {"label": "Parent-managed mini-account range", "value": "Age 13 to under 15"}],
        "what_to_watch": ["Negotiations in the European Parliament and Council and any amendments before the proposal becomes law."],
        "question_angles": ["How can governments balance child protection, privacy and access rights in age-verification regimes?"],
        "topics": ["EU KIDS Act", "Online child safety", "Social media", "AI chatbots", "Age verification"],
        "countries": [],
        "institutions": ["European Commission", "European Parliament", "Council of the European Union"],
        "organisations": [], "reports": [], "treaties": [], "people": ["Ursula von der Leyen"],
        "sources": [
            {"publisher": "European Commission", "title": "EU KIDS Act: helping children navigate a safer online world", "url": "https://commission.europa.eu/news-and-media/news/eu-kids-act-helping-children-navigate-safer-online-world-2026-09-17_en", "published_at": "2026-09-17", "source_type": "Official Source"},
            {"publisher": "European Commission", "title": "EU KIDS Act to restrict social media platforms' access to children in the EU", "url": "https://digital-strategy.ec.europa.eu/en/news/eu-kids-act-restrict-social-media-platforms-access-children-eu", "published_at": "2026-09-17", "source_type": "Official Source"},
        ],
    },
    {
        "id": "federal-reserve-rate-hike-effective-2026-09-17",
        "category": "Global Economy & Monetary Policy",
        "headline": "Federal Reserve raises target range to 3.75%-4.00% as tighter stance takes effect",
        "summary": "The US Federal Reserve raised the target range for the federal funds rate by 25 basis points to 3.75%-4.00%; the implementation settings took effect on 17 September 2026.",
        "what_happened": "The FOMC approved the increase unanimously, citing elevated inflation while describing economic activity as expanding at a solid pace.",
        "why_it_matters": "US monetary policy affects global borrowing costs, capital flows, exchange rates and commodity prices, with important spillovers for emerging markets.",
        "pakistan_perspective": "Higher US rates can influence Pakistan through dollar financing costs, portfolio flows, exchange-rate pressure and global risk appetite.",
        "global_implications": "The move marked renewed monetary tightening after the previous easing cycle and may influence other central banks' policy choices.",
        "key_takeaways": ["The Fed raised the target range by 25 basis points to 3.75%-4.00%.", "The new operating settings became effective on 17 September 2026."],
        "facts": [{"label": "Rate increase", "value": "25 basis points"}, {"label": "Target range", "value": "3.75%-4.00%"}],
        "what_to_watch": ["US inflation data, subsequent FOMC decisions and spillovers to global bond and currency markets."],
        "question_angles": ["How do Federal Reserve rate changes transmit to emerging-market economies?"],
        "topics": ["Federal Reserve", "Interest rates", "Inflation", "Global monetary policy"],
        "countries": ["United States"],
        "institutions": ["Federal Reserve", "Federal Open Market Committee"],
        "organisations": [], "reports": [], "treaties": [], "people": [],
        "sources": [
            {"publisher": "Federal Reserve Board", "title": "Federal Reserve issues FOMC statement", "url": "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm", "published_at": "2026-09-16", "source_type": "Official Source"},
            {"publisher": "Federal Reserve Board", "title": "Implementation Note issued September 16, 2026", "url": "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a1.htm", "published_at": "2026-09-16", "source_type": "Official Source"},
        ],
    },
    {
        "id": "asia-lng-demand-war-supply-2026-09-17",
        "category": "Global Energy Security & Economy",
        "headline": "Asian LNG demand projected to fall for second year as Gulf conflict constrains supply",
        "summary": "Reuters reported that Asian LNG demand is expected to decline for a second consecutive year in 2026 as Gulf supply disruptions and high prices suppress consumption, with analysts estimating a 3%-10% decline from 2025.",
        "what_happened": "Supply disruptions, including halted Qatari exports, pushed Asian spot LNG prices sharply higher and encouraged fuel switching or reduced consumption in several major Asian economies.",
        "why_it_matters": "LNG-market stress links geopolitical risk directly to electricity costs, industrial output, inflation and energy-security policy across import-dependent Asian economies.",
        "pakistan_perspective": "Pakistan is exposed to spot-LNG prices and winter gas availability, so prolonged Gulf disruption could raise import costs and worsen domestic energy constraints.",
        "regional_implications": "High prices can push Asian importers toward coal, nuclear power, domestic gas or demand reduction, reshaping regional energy mixes.",
        "key_takeaways": ["Analysts cited by Reuters expect Asian LNG demand to fall 3%-10% from 2025.", "The supply shock has been amplified by disruption to Qatari LNG exports."],
        "facts": [{"label": "Estimated 2026 Asian LNG demand decline", "value": "3%-10% from 2025"}],
        "what_to_watch": ["QatarEnergy export restoration, Asian spot LNG prices and Pakistan's winter gas procurement."],
        "question_angles": ["Why are LNG-importing Asian economies vulnerable to geopolitical disruptions in Gulf energy supply?"],
        "topics": ["LNG", "Energy security", "Gulf conflict", "Asian energy markets"],
        "countries": ["Pakistan", "China", "India", "Japan", "South Korea", "Qatar"],
        "institutions": [], "organisations": ["QatarEnergy"], "reports": [], "treaties": [], "people": [],
        "sources": [
            {"publisher": "Reuters", "title": "Asian LNG demand set to fall for second year as war shrinks supply", "url": "https://www.reuters.com/business/energy/asian-lng-demand-set-fall-second-year-war-shrinks-supply-2026-09-17/", "published_at": "2026-09-17", "source_type": "News Report"}
        ],
    },
]

edition = {
    "schema_version": 1,
    "date": DATE,
    "published_at": NOW,
    "edition": "Current Affairs — 17 September 2026",
    "stories": stories,
}

GENERAL = [
    "Date: 17 September 2026; Pakistan announced a 50% reduction in fuel provision for official vehicles, a 5% cut in the non-ERE budget and a three-month restriction on official foreign travel under fresh austerity measures.",
    "Date: 17 September 2026; Finance Minister Muhammad Aurangzeb said Pakistan plans to seek an expansion of its 30 billion yuan currency-swap line with China when it is renewed in 2027.",
    "Pakistan recorded a $98 million current-account deficit in August 2026, while FDI inflows reached $315.9 million.",
    "Pakistan and China operationalised the Pakistan-China Boundary Joint Commission, whose inaugural meeting was held in Islamabad on 16 September 2026.",
    "On 17 September 2026, Pakistan's Supreme Court suspended the sentences of Imaan Zainab Mazari-Hazir and Hadi Ali Chattha pending appeal and ordered their release.",
    "Pakistan's Large Scale Manufacturing output increased 3.03% year-on-year in July 2026, according to the Pakistan Bureau of Statistics.",
    "On 17 September 2026, the European Commission proposed the EU KIDS Act: no social-media access under 13, parent-managed mini accounts from 13 to under 15, and autonomous accounts from age 15.",
    "The US Federal Reserve raised the federal funds target range by 25 basis points to 3.75%-4.00%, with the new operating settings effective 17 September 2026.",
    "Reuters reported on 17 September 2026 that Asian LNG demand is projected to fall 3%-10% from 2025 as Gulf supply disruptions keep prices elevated.",
]

PAKISTAN = GENERAL[:6]

MCQS = [
    {
        "id": "ca-daily-20260917-01", "topic": "Pakistan Austerity & Energy Security",
        "question": "What reduction in fuel provision for official vehicles was announced by Pakistan's federal government on 17 September 2026?",
        "options": ["50%", "25%", "10%", "75%"], "answer": 0,
        "explanation": "The federal austerity and fuel-conservation package cut fuel provision for official vehicles by 50%, subject to exemptions for essential and operational services.",
        "source": ["Associated Press of Pakistan — Federal govt imposes fresh austerity measures, cuts official fuel by 50pc", "Radio Pakistan — PM approves nationwide austerity campaign"],
    },
    {
        "id": "ca-daily-20260917-02", "topic": "Pakistan External Financing",
        "question": "What is the size of Pakistan's existing currency-swap line with China that Finance Minister Muhammad Aurangzeb said Pakistan would seek to expand on renewal?",
        "options": ["30 billion yuan", "10 billion yuan", "50 billion yuan", "100 billion yuan"], "answer": 0,
        "explanation": "Aurangzeb said Pakistan's existing China currency-swap line is 30 billion yuan and that an expansion would be sought when it is renewed in 2027.",
        "source": ["Reuters — Pakistan eyes bigger China swap line, expects US financing decision soon"],
    },
    {
        "id": "ca-daily-20260917-03", "topic": "Pakistan Balance of Payments",
        "question": "What was Pakistan's current-account deficit in August 2026?",
        "options": ["$98 million", "$445 million", "$543 million", "$315.9 million"], "answer": 0,
        "explanation": "SBP data showed an August 2026 current-account deficit of $98 million; $543 million was the cumulative July-August deficit.",
        "source": ["State Bank of Pakistan — August 2026 balance-of-payments data", "Dawn — Current account deficit narrows to $98m in August"],
    },
    {
        "id": "ca-daily-20260917-04", "topic": "Pakistan-China Relations",
        "question": "Which bilateral mechanism did Pakistan and China operationalise in September 2026 to strengthen border management and joint surveys?",
        "options": ["Pakistan-China Boundary Joint Commission", "CPEC Joint Cooperation Committee", "Joint Maritime Security Council", "Pakistan-China Monetary Council"], "answer": 0,
        "explanation": "Pakistan's Foreign Office said the Pakistan-China Boundary Joint Commission was operationalised on 16 September 2026.",
        "source": ["Ministry of Foreign Affairs, Pakistan — Press Briefing, 17 September 2026"],
    },
    {
        "id": "ca-daily-20260917-05", "topic": "Pakistan Law & Courts",
        "question": "Which court suspended the sentences of Imaan Zainab Mazari-Hazir and Hadi Ali Chattha on 17 September 2026 pending their appeals?",
        "options": ["Supreme Court of Pakistan", "Islamabad High Court", "Federal Shariat Court", "Lahore High Court"], "answer": 0,
        "explanation": "A two-judge bench of the Supreme Court suspended the sentences and ordered their release while the appeals proceed.",
        "source": ["Dawn — SC suspends Imaan, Hadi's sentences in controversial social media posts case, orders their release"],
    },
    {
        "id": "ca-daily-20260917-06", "topic": "Pakistan Industry",
        "question": "By how much did Pakistan's Large Scale Manufacturing output increase year-on-year in July 2026?",
        "options": ["3.03%", "1.42%", "9.51%", "5.00%"], "answer": 0,
        "explanation": "PBS reported 3.03% year-on-year growth in LSM output for July 2026.",
        "source": ["Pakistan Bureau of Statistics — Summary of Provisional QIM for July 2026"],
    },
    {
        "id": "ca-daily-20260917-07", "topic": "EU Digital Regulation",
        "question": "Under the European Commission's proposed EU KIDS Act, from what age would minors be allowed to create an autonomous social-media account?",
        "options": ["15", "13", "16", "18"], "answer": 0,
        "explanation": "The proposal sets 15 as the minimum age for an autonomous social-media account; ages 13 to under 15 could use parent-managed mini accounts.",
        "source": ["European Commission — EU KIDS Act: helping children navigate a safer online world"],
    },
    {
        "id": "ca-daily-20260917-08", "topic": "US Monetary Policy",
        "question": "What target range did the US Federal Reserve set after its September 2026 25-basis-point rate increase?",
        "options": ["3.75%-4.00%", "3.50%-3.75%", "4.00%-4.25%", "4.25%-4.50%"], "answer": 0,
        "explanation": "The FOMC raised the target range by 25 basis points to 3.75%-4.00%, with implementation effective 17 September 2026.",
        "source": ["Federal Reserve Board — Federal Reserve issues FOMC statement"],
    },
    {
        "id": "ca-daily-20260917-09", "topic": "Global Energy Markets",
        "question": "According to Reuters reporting on 17 September 2026, analysts expected Asian LNG demand in 2026 to change by approximately what range from 2025?",
        "options": ["Fall by 3%-10%", "Rise by 3%-10%", "Fall by 15%-20%", "Remain unchanged"], "answer": 0,
        "explanation": "Analysts cited by Reuters expected Asian LNG demand to decline by roughly 3%-10% from 2025 amid supply disruption and high prices.",
        "source": ["Reuters — Asian LNG demand set to fall for second year as war shrinks supply"],
    },
]


def dump(path: Path, value, compact=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":") if compact else None, indent=None if compact else 2)
    path.write_text(text + "\n", encoding="utf-8")


def add_notes(path: Path, notes: list[str], prefix: str, subcategory: str):
    data = json.loads(path.read_text(encoding="utf-8"))
    existing_text = {str(x.get("text", "")).strip() for x in data.get("notes", [])}
    existing_ids = {str(x.get("id", "")) for x in data.get("notes", [])}
    added = 0
    for idx, text in enumerate(notes, 1):
        item_id = f"{prefix}-20260917-{idx:02d}"
        if text in existing_text:
            continue
        if item_id in existing_ids:
            raise RuntimeError(f"ID collision in {path}: {item_id}")
        data.setdefault("notes", []).append({
            "id": item_id,
            "text": text,
            "subcategory": subcategory,
            "sourcePage": None,
            "timeSensitive": True,
        })
        existing_text.add(text)
        existing_ids.add(item_id)
        added += 1
    data["count"] = len(data.get("notes", []))
    dump(path, data, compact=True)
    return added, data


def subcategory_counts(notes):
    counts = {}
    for item in notes:
        name = str(item.get("subcategory", "")).strip()
        if name:
            counts[name] = counts.get(name, 0) + 1
    return counts


def sync_index(path: Path, ca_data, pk_data):
    data = json.loads(path.read_text(encoding="utf-8"))
    data["generatedAt"] = DATE
    mapping = {"current-affairs-archive": ca_data, "pakistan-current-affairs": pk_data}
    for category in data.get("categories", []):
        source = mapping.get(category.get("slug"))
        if not source:
            continue
        notes = source.get("notes", [])
        category["count"] = len(notes)
        category["timeSensitiveCount"] = sum(1 for n in notes if n.get("timeSensitive"))
        counts = subcategory_counts(notes)
        existing = {s.get("name"): s for s in category.get("subcategories", [])}
        for name, count in counts.items():
            if name in existing:
                existing[name]["count"] = count
            else:
                category.setdefault("subcategories", []).append({"name": name, "count": count})
        category["subcategories"] = [s for s in category.get("subcategories", []) if counts.get(s.get("name"), 0) > 0]
    data["total"] = sum(int(c.get("count", 0)) for c in data.get("categories", []))
    dump(path, data, compact=True)


# Canonical dated edition.
dump(ROOT / "content/current-affairs/2026/09/2026-09-17.json", edition, compact=False)

# One-liner mirrors.
ca_added_pub, ca_pub = add_notes(ROOT / "public/one-liner-gk/current-affairs-archive.json", GENERAL, "current-affairs-archive", "Current Affairs 2026")
ca_added_src, ca_src = add_notes(ROOT / "src/data/bundled/current-affairs-archive.json", GENERAL, "current-affairs-archive", "Current Affairs 2026")
pk_added_pub, pk_pub = add_notes(ROOT / "public/one-liner-gk/pakistan-current-affairs.json", PAKISTAN, "pakistan-current-affairs", "Pakistan Current Affairs 2026")
pk_added_src, pk_src = add_notes(ROOT / "src/data/bundled/pakistan-current-affairs.json", PAKISTAN, "pakistan-current-affairs", "Pakistan Current Affairs 2026")
if (ca_added_pub, pk_added_pub) != (ca_added_src, pk_added_src):
    raise RuntimeError("One-liner public/bundled additions diverged")
if ca_pub != ca_src or pk_pub != pk_src:
    raise RuntimeError("One-liner public/bundled mirrors diverged")

sync_index(ROOT / "public/one-liner-gk/index.json", ca_pub, pk_pub)
sync_index(ROOT / "src/data/bundled/index.json", ca_src, pk_src)
if (ROOT / "public/one-liner-gk/index.json").read_bytes() != (ROOT / "src/data/bundled/index.json").read_bytes():
    raise RuntimeError("One-liner indexes diverged")

# Dedicated Current Affairs MCQ bank.
mcq_path = ROOT / "public/css-subject-mcqs/current-affairs.json"
mcq_data = json.loads(mcq_path.read_text(encoding="utf-8"))
if not isinstance(mcq_data, list):
    raise RuntimeError("Current Affairs MCQ bank must be a list")
ids = {str(x.get("id", "")) for x in mcq_data}
stems = {str(x.get("question", "")).strip().casefold() for x in mcq_data}
mcq_added = 0
for item in MCQS:
    if item["id"] in ids:
        continue
    stem_key = item["question"].strip().casefold()
    if stem_key in stems:
        raise RuntimeError(f"Duplicate MCQ stem: {item['question']}")
    if len(item["options"]) != 4 or len(set(item["options"])) != 4:
        raise RuntimeError(f"Invalid options: {item['id']}")
    if not isinstance(item["answer"], int) or not 0 <= item["answer"] < 4:
        raise RuntimeError(f"Invalid answer index: {item['id']}")
    mcq_data.append({
        "id": item["id"],
        "subject": "Current Affairs",
        "topic": item["topic"],
        "question": item["question"],
        "options": item["options"],
        "answer": item["answer"],
        "explanation": item["explanation"],
        "sourceDocument": "CSS Vista Daily Current Affairs 2026-09-17",
        "source": item["source"],
        "verification": "Derived from the verified 17 September 2026 canonical Current Affairs edition; factual answer cross-checked against cited source material.",
        "audit": "four distinct options, recoverable answer, stable ID, source attribution and high-confidence duplicate facts checked",
    })
    ids.add(item["id"])
    stems.add(stem_key)
    mcq_added += 1

dump(mcq_path, mcq_data, compact=False)

# Release-local integrity report for the staging workflow.
report = {
    "date": DATE,
    "stories": len(stories),
    "general_one_liners_added": ca_added_pub,
    "pakistan_placements_added": pk_added_pub,
    "mcqs_added": mcq_added,
    "published_at": NOW,
}
dump(ROOT / "current-affairs-release-2026-09-17.json", report, compact=False)
print(json.dumps(report, indent=2))
