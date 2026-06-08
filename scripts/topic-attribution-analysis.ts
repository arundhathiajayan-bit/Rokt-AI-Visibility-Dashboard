/**
 * Topic Attribution Analysis — Rokt AI Visibility Dashboard
 *
 * Analyses what content is driving sentiment changes (positive AND negative)
 * for any topic that moves significantly between two measurement periods.
 *
 * Usage: Copy/paste each step into mcp__profoundai_api__execute
 *
 * Step 1: DISCOVER MOVERS — identify which topics shifted ±2pp
 * Step 2: ANALYSE TOPIC — deep-dive into each flagged topic's citation mix
 *
 * IMPORTANT API NOTES:
 * - Dates must be 2026 (not 2025)
 * - include parameter is an object with boolean fields, NOT a string array
 * - topic filter requires topic_id (UUID), not topic name
 * - tag_id filter requires include: { tags: true }
 * - citation_details requires include: { citation_details: true }
 * - sentiment_themes requires include: { sentiment_themes: true }
 */

// ── CONSTANTS ───────────────────────────────────────────────────────
// Category & Tag IDs
const CATEGORY_ID = 'd47fa7d3-a489-4318-b7f8-d9ffd76cf49b'; // Ecommerce Technology
const BRANDED_TAG = '67859793-e1ec-4237-8d5f-8df52331f7de';
const Q1_TAG = '7d8654c9-6fe8-5705-a6ac-8d7f260ce700';
const Q2_TAG = '5caa8842-b612-5021-8ab9-81fd2dc46702';

// Topic IDs (from client.organizations.categories.prompts)
const TOPIC_IDS: Record<string, string> = {
  'Industry Thought Leadership': '34fbde9b-3536-4467-a9a9-491d9b938b43',
  'Rokt Product':                '316585c6-cfb2-45a7-82a3-e10bab80bb57',
  'Competitive':                 '30da6c2a-e0fd-4216-9779-6a438ddb8d68',
  'Culture':                     'b0d6a74d-0f6b-47e0-9c8f-634643d45cf9',
  'Objection Surfacing':         'f8ca3744-de71-4f06-8599-45650f5d1a12',
  'Multi-Product Comparison':    'f0c8ba04-24c7-42be-b6c2-e7de048f3c12',
  'Rokt Ads':                    '31c8b010-ee60-4d20-a8b4-7a9fd9b65d0f',
  'Rokt Catalog':                '70140abd-fb6a-4f9d-9cac-1b71d3101a28',
  'Rokt Upcart':                 '4bb47cf3-45ed-4137-b7b7-f3d75a1cbea2',
  'Rokt Pay+':                   '21ad5e83-3489-45e3-b265-dea313000890',
  'Persona-Led':                 'd124e0d2-13ff-419b-83ec-0ec9d08f2466',
  'Rokt Thanks':                 'a61fa7aa-21bc-4337-9ff0-28ff4c4b29ce',
};


// ════════════════════════════════════════════════════════════════════
// STEP 1: DISCOVER MOVERS
// ════════════════════════════════════════════════════════════════════
// Copy the code below into mcp__profoundai_api__execute
// Update PERIOD_A and PERIOD_B dates each bi-weekly cycle

/*
async function run(client) {
  const cat = 'd47fa7d3-a489-4318-b7f8-d9ffd76cf49b';
  const branded = '67859793-e1ec-4237-8d5f-8df52331f7de';

  // UPDATE THESE DATES each cycle
  const PERIOD_A = { start: '2026-05-18', end: '2026-05-25', label: 'May 18-24' };
  const PERIOD_B = { start: '2026-05-25', end: '2026-06-05', label: 'May 25-Jun 4' };

  const [answersA, answersB] = await Promise.all([
    client.prompts.answers({
      category_id: cat,
      start_date: PERIOD_A.start,
      end_date: PERIOD_A.end,
      include: { tags: true, sentiment_themes: true, topic: true, model: true } as any,
      filters: [
        { field: 'asset_name' as const, operator: 'is' as const, value: 'Rokt' },
        { field: 'tag_id' as const, operator: 'is' as const, value: branded },
      ],
      pagination: { limit: 10000, offset: 0 }
    }),
    client.prompts.answers({
      category_id: cat,
      start_date: PERIOD_B.start,
      end_date: PERIOD_B.end,
      include: { tags: true, sentiment_themes: true, topic: true, model: true } as any,
      filters: [
        { field: 'asset_name' as const, operator: 'is' as const, value: 'Rokt' },
        { field: 'tag_id' as const, operator: 'is' as const, value: branded },
      ],
      pagination: { limit: 10000, offset: 0 }
    })
  ]);

  console.log('Period A:', answersA.info?.total_rows, '| Period B:', answersB.info?.total_rows);

  function topicSentiment(answers: any[]) {
    const topics: Record<string, { positive: number; negative: number; neutral: number; total: number }> = {};
    for (const a of answers) {
      const topic = (a as any).topic || 'Unknown';
      if (!topics[topic]) topics[topic] = { positive: 0, negative: 0, neutral: 0, total: 0 };
      topics[topic].total++;
      const themes = (a as any).sentiment_themes;
      if (!themes || !Array.isArray(themes) || themes.length === 0) { topics[topic].neutral++; continue; }
      const pos = themes.filter((t: any) => t.type === 'positive').length;
      const neg = themes.filter((t: any) => t.type === 'negative').length;
      if (pos > neg) topics[topic].positive++;
      else if (neg > pos) topics[topic].negative++;
      else topics[topic].neutral++;
    }
    return topics;
  }

  const topicsA = topicSentiment(answersA.data as any[]);
  const topicsB = topicSentiment(answersB.data as any[]);
  const allTopics = new Set([...Object.keys(topicsA), ...Object.keys(topicsB)]);

  const movers: any[] = [];
  for (const topic of allTopics) {
    const a = topicsA[topic] || { positive: 0, negative: 0, neutral: 0, total: 0 };
    const b = topicsB[topic] || { positive: 0, negative: 0, neutral: 0, total: 0 };
    const rateA = a.total > 0 ? (a.positive / a.total) * 100 : 0;
    const rateB = b.total > 0 ? (b.positive / b.total) * 100 : 0;
    const delta = rateB - rateA;
    let flag = 'MINOR';
    if (Math.abs(delta) >= 2) flag = delta > 0 ? 'IMPROVED' : 'DECLINED';
    else if (Math.abs(delta) < 0.5) flag = 'STAGNANT';
    movers.push({ topic, rateA: rateA.toFixed(1), rateB: rateB.toFixed(1), delta: delta.toFixed(1), responsesA: a.total, responsesB: b.total, negA: a.negative, negB: b.negative, flag });
  }

  movers.sort((a, b) => Math.abs(parseFloat(b.delta)) - Math.abs(parseFloat(a.delta)));

  console.log('\n=== TOPIC MOVERS: ' + PERIOD_A.label + ' → ' + PERIOD_B.label + ' ===\n');
  for (const m of movers) {
    const icon = m.flag === 'IMPROVED' ? '🟢' : m.flag === 'DECLINED' ? '🔴' : m.flag === 'STAGNANT' ? '⚪' : '🟡';
    console.log(icon + ' ' + m.topic + ': ' + m.rateA + '% → ' + m.rateB + '% (' + (parseFloat(m.delta) > 0 ? '+' : '') + m.delta + 'pp) [' + m.responsesA + '→' + m.responsesB + ' responses, neg: ' + m.negA + '→' + m.negB + ']');
  }

  const flagged = movers.filter(m => m.flag === 'IMPROVED' || m.flag === 'DECLINED');
  console.log('\n' + flagged.length + ' topics flagged for deep-dive attribution.');
  console.log('Run Step 2 for each: ' + flagged.map(m => m.topic).join(', '));

  return movers;
}
*/


// ════════════════════════════════════════════════════════════════════
// STEP 2: ANALYSE TOPIC ATTRIBUTION
// ════════════════════════════════════════════════════════════════════
// Copy the code below into mcp__profoundai_api__execute
// Change TOPIC_NAME and TOPIC_ID for each flagged topic

/*
async function run(client) {
  const cat = 'd47fa7d3-a489-4318-b7f8-d9ffd76cf49b';
  const branded = '67859793-e1ec-4237-8d5f-8df52331f7de';

  // ── CONFIGURE PER TOPIC ──
  const TOPIC_NAME = 'Rokt Thanks';
  const TOPIC_ID = 'a61fa7aa-21bc-4337-9ff0-28ff4c4b29ce';
  const PA = { start: '2026-05-18', end: '2026-05-25', label: 'May 18-24' };
  const PB = { start: '2026-05-25', end: '2026-06-05', label: 'May 25-Jun 4' };
  // ──────────────────────────

  const [aA, aB] = await Promise.all([
    client.prompts.answers({
      category_id: cat, start_date: PA.start, end_date: PA.end,
      include: { tags: true, sentiment_themes: true, topic: true, model: true, citations: true, citation_details: true, prompt: true } as any,
      filters: [
        { field: 'asset_name' as const, operator: 'is' as const, value: 'Rokt' },
        { field: 'tag_id' as const, operator: 'is' as const, value: branded },
        { field: 'topic_id' as const, operator: 'is' as const, value: TOPIC_ID },
      ],
      pagination: { limit: 10000, offset: 0 }
    }),
    client.prompts.answers({
      category_id: cat, start_date: PB.start, end_date: PB.end,
      include: { tags: true, sentiment_themes: true, topic: true, model: true, citations: true, citation_details: true, prompt: true } as any,
      filters: [
        { field: 'asset_name' as const, operator: 'is' as const, value: 'Rokt' },
        { field: 'tag_id' as const, operator: 'is' as const, value: branded },
        { field: 'topic_id' as const, operator: 'is' as const, value: TOPIC_ID },
      ],
      pagination: { limit: 10000, offset: 0 }
    })
  ]);

  console.log('=== ' + TOPIC_NAME + ' ATTRIBUTION ===');
  console.log('Period A (' + PA.label + '):', aA.info?.total_rows, 'responses');
  console.log('Period B (' + PB.label + '):', aB.info?.total_rows, 'responses');

  function classify(a: any): string {
    const t = a.sentiment_themes;
    if (!t || !Array.isArray(t) || t.length === 0) return 'neutral';
    const pos = t.filter((x: any) => x.type === 'positive').length;
    const neg = t.filter((x: any) => x.type === 'negative').length;
    return pos > neg ? 'positive' : neg > pos ? 'negative' : 'neutral';
  }

  // ── Overall sentiment ──
  let posA = 0, posB = 0;
  for (const a of aA.data as any[]) if (classify(a) === 'positive') posA++;
  for (const a of aB.data as any[]) if (classify(a) === 'positive') posB++;
  const rateA = aA.data.length > 0 ? (posA / aA.data.length * 100) : 0;
  const rateB = aB.data.length > 0 ? (posB / aB.data.length * 100) : 0;
  const delta = rateB - rateA;
  console.log('\nSentiment: ' + rateA.toFixed(1) + '% → ' + rateB.toFixed(1) + '% (' + (delta > 0 ? '+' : '') + delta.toFixed(1) + 'pp)');

  // ── Negative responses (both periods) ──
  console.log('\n── NEGATIVE RESPONSES (Period A) ──');
  for (const a of aA.data as any[]) {
    if (classify(a) !== 'positive') {
      console.log('[' + classify(a).toUpperCase() + '] Model:', a.model, '| Prompt:', (a.prompt || '').substring(0, 80));
      console.log('  Themes:', JSON.stringify(a.sentiment_themes));
      console.log('  Citations:', (a.citation_details || []).map((c: any) => c.hostname).join(', '));
    }
  }
  console.log('\n── NEGATIVE RESPONSES (Period B) ──');
  for (const a of aB.data as any[]) {
    if (classify(a) !== 'positive') {
      console.log('[' + classify(a).toUpperCase() + '] Model:', a.model, '| Prompt:', (a.prompt || '').substring(0, 80));
      console.log('  Themes:', JSON.stringify(a.sentiment_themes));
      console.log('  Citations:', (a.citation_details || []).map((c: any) => c.hostname).join(', '));
    }
  }

  // ── Citation profile comparison ──
  function citProfile(answers: any[]) {
    const urls: Record<string, { count: number; posC: number; negC: number; host: string; title: string }> = {};
    for (const a of answers) {
      const sent = classify(a);
      for (const c of (a.citation_details || [])) {
        const u = c.clean_url || c.url || '?';
        if (!urls[u]) urls[u] = { count: 0, posC: 0, negC: 0, host: c.hostname || '', title: c.title || '' };
        urls[u].count++;
        if (sent === 'positive') urls[u].posC++;
        if (sent === 'negative') urls[u].negC++;
      }
    }
    return urls;
  }

  const cA = citProfile(aA.data as any[]);
  const cB = citProfile(aB.data as any[]);
  const allUrls = new Set([...Object.keys(cA), ...Object.keys(cB)]);
  const shifts: any[] = [];
  for (const u of allUrls) {
    const a = cA[u] || { count: 0, posC: 0, negC: 0, host: '', title: '' };
    const b = cB[u] || { count: 0, posC: 0, negC: 0, host: '', title: '' };
    shifts.push({
      host: b.host || a.host, title: (b.title || a.title || '').substring(0, 60),
      cA: a.count, cB: b.count, delta: b.count - a.count,
      sentA: a.count > 0 ? (a.posC / a.count * 100).toFixed(0) : 'N/A',
      sentB: b.count > 0 ? (b.posC / b.count * 100).toFixed(0) : 'N/A',
      isNew: a.count === 0, isDropped: b.count === 0
    });
  }
  shifts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  console.log('\n── TOP CITATION SHIFTS ──');
  for (const s of shifts.slice(0, 20)) {
    const tag = s.isNew ? ' [NEW]' : s.isDropped ? ' [DROPPED]' : '';
    console.log(s.host + tag + ' | ' + s.title);
    console.log('  ' + s.cA + '→' + s.cB + ' (' + (s.delta > 0 ? '+' : '') + s.delta + ') | Sentiment: ' + s.sentA + '%→' + s.sentB + '% pos');
  }

  // ── Platform breakdown ──
  console.log('\n── PLATFORM BREAKDOWN ──');
  function plat(answers: any[]) {
    const p: Record<string, { pos: number; tot: number }> = {};
    for (const a of answers) {
      const m = a.model || '?';
      if (!p[m]) p[m] = { pos: 0, tot: 0 };
      p[m].tot++;
      if (classify(a) === 'positive') p[m].pos++;
    }
    return p;
  }
  const pA = plat(aA.data as any[]);
  const pB = plat(aB.data as any[]);
  for (const m of new Set([...Object.keys(pA), ...Object.keys(pB)])) {
    const a = pA[m] || { pos: 0, tot: 0 };
    const b = pB[m] || { pos: 0, tot: 0 };
    console.log('  ' + m + ': ' + (a.tot > 0 ? (a.pos/a.tot*100).toFixed(0) : 'N/A') + '% → ' + (b.tot > 0 ? (b.pos/b.tot*100).toFixed(0) : 'N/A') + '% [' + a.tot + '→' + b.tot + ']');
  }

  return { topic: TOPIC_NAME, delta: delta.toFixed(1), totalShifts: shifts.length };
}
*/


// ════════════════════════════════════════════════════════════════════
// RESULTS: May 18-24 → May 25-Jun 4 Attribution
// ════════════════════════════════════════════════════════════════════

/*
MOVER DISCOVERY (481 → 693 branded responses):
🟢 Rokt Thanks:  96.2% → 100.0% (+3.8pp) [53→77] — ONLY topic crossing ±2pp threshold
🟡 Rokt Upcart:  98.1% → 100.0% (+1.9pp) [54→77]
🟡 Rokt Catalog:  98.1% → 100.0% (+1.9pp) [54→77]
🟡 Culture:      100.0% → 98.7% (-1.3pp) [54→77]
⚪ Rokt Product:  100.0% → 100.0% (0.0pp) [53→77]
⚪ Rokt Pay+:     100.0% → 100.0% (0.0pp) [54→77]
⚪ Industry TL:   100.0% → 100.0% (0.0pp) [53→77]
⚪ Competitive:   100.0% → 100.0% (0.0pp) [53→77]
⚪ Rokt Ads:      100.0% → 100.0% (0.0pp) [53→77]

─── ROKT THANKS ATTRIBUTION (+3.8pp) ───────────────────────────

Summary: Sentiment rose from 96.2% to 100% positive. Period A had 2 non-positive
responses (0 classified negative, 2 neutral); Period B has 0. The improvement is
driven by ALL responses in Period B being classified positive.

Key citation shifts (what LLMs are citing more):
• rokt.com/thanks page (+15 citations) — primary product page, 100% positive context
• docs.rokt.com (+13) — technical docs gaining traction, especially on Gemini/AI Mode
• rokt.com features page (+9) — differentiator content growing
• Wikipedia (+8) — credibility signal increasing
• LinkedIn article (+7) — "How Rokt Thanks turns thank you pages into profit"
• YouTube CEO interview (+6) — Bruce Buchanan breaks $90m gross profit
• rokt.com trust page (+6) — "Built For Trust, Proven for Scale"
• rokt.com FT list page (+6) — awards/recognition content

Sources that declined:
• aftersell.com (-5) — Upcart/Thanks page losing some share to rokt.com direct
• rokt.com revenue share article (-5) — "Beyond the Split" less cited
• retail-insider.com (-4) — DROPPED entirely from citation mix

New sources appearing:
• youtube.com — new Rokt ecommerce technology video (+4)
• finextra.com — "PayPal taps Rokt to power post-purchase offers" (+4)

Platform shift: Google Gemini improved most (71% → 91%). ChatGPT slightly down
(86% → 82%, 1 negative response). Grok dropped from 4→0 responses.

WHAT'S WORKING:
1. Owned content (rokt.com) gaining citation share — product pages, trust content, awards
2. Technical docs (docs.rokt.com) being cited more — good for developer-facing queries
3. Third-party credibility signals (Wikipedia, YouTube, FT recognition) growing
4. PayPal partnership getting cited (finextra.com) — validation signal

WHAT TO WATCH:
1. ChatGPT still has 1 negative response — investigate which prompt/citation
2. Gemini improved but from a low base — monitor
3. aftersell.com losing share to rokt.com — fine if rokt.com content is stronger

─── CULTURE ATTRIBUTION (-1.3pp) ──────────────────────────────

Summary: Sentiment dipped from 100% to 98.7% — 1 response out of 77 was
non-positive (neutral, not negative). Very minor but worth monitoring.

Key citation shifts:
• retail-insider.com (+36) — "How Rokt Builds a Culture That Promotes From Within" surged
• fortune.com brand studio (+15) — "How Rokt is building culture at speed"
• rokt.com culture page (+15) — owned content growing
• builtin.com (+14) — Rokt Careers/Perks page
• comparably.com (-12) — dropped significantly (was negative signal?)
• rokt.com "What Is It Like to Work at Rokt" (+11) — NEW page gaining traction

Platform concern: ChatGPT dropped (71% → 55%), Gemini also dipped (100% → 82%).
Microsoft Copilot improved (71% → 91%).

WHAT'S WORKING:
1. Owned culture content growing (rokt.com pages, YouTube)
2. Third-party positive coverage (Fortune, retail-insider, Built In)

WHAT TO WATCH:
1. Comparably.com dropped -12 — may contain negative employee reviews
2. ChatGPT culture sentiment at 55% — worst platform for this topic
3. Some LinkedIn thought leadership content declining
*/
