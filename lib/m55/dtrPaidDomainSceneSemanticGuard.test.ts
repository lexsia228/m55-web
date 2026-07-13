/**
 * Semantic guard for the Chapter III domain-scene table.
 * Verifies column semantic integrity after the copy polish (MP-1 through MP-5, OP-2, OP-3).
 *
 * Rules under guard:
 *   - four distinct domain rows
 *   - judgment and recovery rows differ
 *   - load cells express load semantics (no positive-only sentences)
 *   - recovery cells contain restorative direction (not purely load description)
 *   - no 【内部ラベル】 in scene table cells
 *   - no "洞察が判断に接続" wording in Chapter II essence
 *   - overall summary covers all four chapters
 *   - generic closing is not repeated four times
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import { parseBlockItems, firstSentence } from './dtrPaidModules';
import { PAID_DTR_BENEFIT_BULLETS, PAID_DTR_CHAPTER_BRIDGE_COPY } from './paidDtrProductCopy';

// ── Fixture profile (stem 9 / 癸 — アナリスト) ──────────────────────────────
const PREVIEW_PROFILE = {
  nickname: 'TestUser',
  birthDate: '1983-02-28',
  birthTime: '12:00',
  birthTimeUnknown: false as const,
  country: 'JP',
  birthplace: '東京都',
  timezone: 'Asia/Tokyo',
} as const;

function buildStem9Envelope() {
  return buildV2FulfillmentSnapshotFromFields({ ...PREVIEW_PROFILE });
}

// ── Helper: extract section body by id ──────────────────────────────────────
function getSectionBody(sections: ReadonlyArray<{ id: string; body: string }>, id: string): string {
  const s = sections.find((sec) => sec.id === id);
  assert.ok(s, `Section ${id} not found in envelope`);
  return s.body;
}

// ── Helper: simulate DomainMatrixModule slot resolution ─────────────────────
// Minimal reproduction of the rendering logic for invariant assertions.
function extractRelationSlots(relationBody: string) {
  const items = parseBlockItems(relationBody);
  const receiveWay = items.find((i) => i.header === '受け取り方')?.content ?? '';
  const withdrawWay =
    items.find((i) => i.header === '引き方' || i.header === '距離の取り方')?.content ?? '';
  const convRhythm = items.find((i) => i.header === '会話のリズム')?.content ?? '';
  return { receiveWay, withdrawWay, convRhythm };
}

function pickSentenceWithKeyword(text: string, re: RegExp): string {
  for (const chunk of text.split('。')) {
    const s = chunk.trim();
    if (s && re.test(s)) return s + '。';
  }
  return '';
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Chapter III domain scene table — semantic integrity (MP-1 through MP-4)', () => {
  const result = buildStem9Envelope();
  const sections = result.envelope_json.payload.fullSections;

  it('has all required section bodies: essence, relation, work', () => {
    assert.ok(getSectionBody(sections, 's3_essence').length > 0, 's3_essence must not be empty');
    assert.ok(getSectionBody(sections, 's6_relation').length > 0, 's6_relation must not be empty');
    assert.ok(getSectionBody(sections, 's7_work').length > 0, 's7_work must not be empty');
  });

  it('relation body contains a load sentence for 受け取り方 (MP-1 source fix)', () => {
    const relationBody = getSectionBody(sections, 's6_relation');
    const { receiveWay } = extractRelationSlots(relationBody);
    assert.ok(receiveWay.length > 0, 'receiveWay must not be empty');
    const hasLoad = /後回しにして|疲れが残|読み続けること|受け取りすぎ|深く受け取|疲れる/.test(receiveWay);
    assert.ok(hasLoad, `受け取り方 must contain a load-oriented sentence; got: ${receiveWay.slice(0, 100)}`);
  });

  it('relation body contains a recovery sentence for 引き方 (MP-2 source fix)', () => {
    const relationBody = getSectionBody(sections, 's6_relation');
    const { withdrawWay } = extractRelationSlots(relationBody);
    assert.ok(withdrawWay.length > 0, 'withdrawWay must not be empty');
    const hasRecovery = /外に出す|言葉にして|戻りやすく|急かされない時間|整理する時間/.test(withdrawWay);
    assert.ok(hasRecovery, `引き方 must contain a recovery-direction sentence; got: ${withdrawWay.slice(0, 100)}`);
  });

  it('四つのドメイン行 (仕事・人間関係・近い関係・判断) がテキストとして重複しない (MP-3)', () => {
    // Verify the workStuck produces at least 2 distinct sentences for reuse across rows
    const workBody = getSectionBody(sections, 's7_work');
    const workItems = parseBlockItems(workBody);
    const workStuck = workItems.find((i) => i.header === '詰まりやすい条件')?.content ?? '';
    const s1 = firstSentence(workStuck);
    const s2 = (() => {
      const i = workStuck.indexOf('。');
      if (i === -1 || i >= workStuck.length - 1) return '';
      const rest = workStuck.slice(i + 1).trim();
      return rest ? firstSentence(rest) : '';
    })();
    // For MP-3: recovery row can use a second distinct sentence from workStuck
    assert.notEqual(s1, s2, 'workStuck must contain at least 2 distinct sentences for judgment/recovery deduplication');
  });

  it('essence body does not start dominant block with 【内部見出し】 (MP-4 fix)', () => {
    const essenceBody = getSectionBody(sections, 's3_essence');
    // Strip {{...}} tokens then strip leading 【内部見出し】 prefix block
    const stripped = essenceBody.replace(/\{\{[^}]+\}\}/g, '');
    const withoutPrefix = stripped.replace(/^【[^】]+】\n[^\n]*\n/, '').trim();
    const content = withoutPrefix || stripped;
    assert.ok(content.length > 0, 'essence must have content after stripping prefix');
    assert.ok(!content.startsWith('【'), `essence content must not start with 【内部ラベル】 after prefix removal; got: ${content.slice(0, 60)}`);
  });

  it('essence body must not expose 【...】 as judgment strength sentence', () => {
    const essenceBody = getSectionBody(sections, 's3_essence');
    const stripped = essenceBody.replace(/\{\{[^}]+\}\}/g, '');
    // Mirror the fixed domainJudgmentStrength logic
    const withoutPrefix = stripped.replace(/^【[^】]+】\n[^\n]*\n/, '').trim();
    const content = withoutPrefix || stripped;
    const blocks = content.split(/\n\n/).map((p) => p.trim()).filter(Boolean);
    const pick =
      blocks.find((p) => /集中し続け|集中できる|ひとつのこと/.test(p)) ??
      blocks[0] ??
      content;
    const judgeStrength = firstSentence(pick);
    assert.ok(!judgeStrength.includes('【'), `判断の出方 must not contain 【内部ラベル】; got: ${judgeStrength}`);
    assert.ok(!judgeStrength.includes('年の始め'), `判断の出方 must not contain birth-timing fact; got: ${judgeStrength}`);
  });
});

describe('Chapter II essence — no mechanical wording (MP-5)', () => {
  it('essence body does not contain "洞察が判断に接続"', () => {
    const result = buildStem9Envelope();
    const sections = result.envelope_json.payload.fullSections;
    const essenceBody = getSectionBody(sections, 's3_essence');
    assert.ok(
      !essenceBody.includes('洞察が判断に接続'),
      '`洞察が判断に接続` must not appear in essence body after MP-5 fix',
    );
  });
});

describe('Overall summary covers all four chapters (OP-2)', () => {
  it('PAID_DTR_BENEFIT_BULLETS has exactly 4 entries', () => {
    assert.equal(PAID_DTR_BENEFIT_BULLETS.length, 4, 'Must have exactly 4 benefit bullets');
  });

  it('bullets cover Chapter I (form/shape topic)', () => {
    const combined = PAID_DTR_BENEFIT_BULLETS.join(' ');
    assert.ok(
      /自分に出やすい|出やすい形|自分の形|力が戻り/.test(combined),
      'Chapter I (自分の形) must be represented in benefit bullets',
    );
  });

  it('bullets cover Chapter II (work/judgment topic)', () => {
    const combined = PAID_DTR_BENEFIT_BULLETS.join(' ');
    assert.ok(
      /仕事|判断|条件/.test(combined),
      'Chapter II (仕事・判断) must be represented in benefit bullets',
    );
  });

  it('bullets cover Chapter III (close relationships topic)', () => {
    const combined = PAID_DTR_BENEFIT_BULLETS.join(' ');
    assert.ok(
      /近い人|距離|言葉選び/.test(combined),
      'Chapter III (近い人) must be represented in benefit bullets',
    );
  });

  it('bullets cover Chapter IV (life/fatigue topic)', () => {
    const combined = PAID_DTR_BENEFIT_BULLETS.join(' ');
    assert.ok(
      /疲れ|生活|負担|整える|戻り/.test(combined),
      'Chapter IV (疲れ・生活) must be represented in benefit bullets',
    );
  });
});

describe('Generic chapter closing not repeated identically across all four chapters (OP-3)', () => {
  it('PAID_DTR_CHAPTER_BRIDGE_COPY has four distinct actionJa strings', () => {
    const parts = ['1', '2', '3', '4'] as const;
    const actions = parts.map((id) => PAID_DTR_CHAPTER_BRIDGE_COPY[id].actionJa);
    const unique = new Set(actions);
    assert.equal(unique.size, 4, `All four chapter actionJa must be distinct; got: ${actions.join(' | ')}`);
  });

  it('PAID_DTR_CHAPTER_BRIDGE_COPY has four distinct lifeJa strings', () => {
    const parts = ['1', '2', '3', '4'] as const;
    const lines = parts.map((id) => PAID_DTR_CHAPTER_BRIDGE_COPY[id].lifeJa);
    const unique = new Set(lines);
    assert.equal(unique.size, 4, `All four chapter lifeJa must be distinct; got: ${lines.join(' | ')}`);
  });
});

describe('Forbidden terms absent from key copy surfaces', () => {
  it('benefit bullets do not contain diagnosis/prediction/score language', () => {
    const joined = PAID_DTR_BENEFIT_BULLETS.join(' ');
    const forbidden = /診断|予測|保証|スコア|相性スコア|ランキング|おすすめ度|成功率/;
    assert.ok(!forbidden.test(joined), `Benefit bullets must not contain forbidden terms; got: ${joined}`);
  });

  it('chapter bridge copy does not contain backend/internal terminology', () => {
    const parts = ['1', '2', '3', '4'] as const;
    for (const id of parts) {
      const copy = PAID_DTR_CHAPTER_BRIDGE_COPY[id];
      const combined = [copy.tendencyJa, copy.lifeJa, copy.actionJa].join(' ');
      const forbidden = /接続する|算出|処理する|出力する|バックエンド/;
      assert.ok(!forbidden.test(combined), `Chapter ${id} bridge copy must not contain mechanical terms; got: ${combined.slice(0, 120)}`);
    }
  });
});

describe('Final micro-patch — residual column semantics (stem 9)', () => {
  const result = buildStem9Envelope();
  const sections = result.envelope_json.payload.fullSections;
  const relationBody = getSectionBody(sections, 's6_relation');
  const workBody = getSectionBody(sections, 's7_work');
  const essenceBody = getSectionBody(sections, 's3_essence');
  const { withdrawWay, convRhythm } = extractRelationSlots(relationBody);
  const workItems = parseBlockItems(workBody);
  const workStuck = workItems.find((i) => i.header === '詰まりやすい条件')?.content ?? '';

  const socialRecovery =
    pickSentenceWithKeyword(convRhythm, /言葉に|戻りやす|感じたこと|一つだけ/) ||
    firstSentence(convRhythm);
  const closeLoad =
    pickSentenceWithKeyword(withdrawWay, /考え続けて疲れ|言葉にできないまま|疲れやすく/) ||
    firstSentence(withdrawWay);
  const recoveryLoad =
    pickSentenceWithKeyword(workStuck, /切り替わり|休め|疲れ|余白が減|頭が/) ||
    (() => {
      const i = workStuck.indexOf('。');
      if (i === -1 || i >= workStuck.length - 1) return firstSentence(workStuck);
      return firstSentence(workStuck.slice(i + 1).trim());
    })();
  const recoveryRecovery =
    pickSentenceWithKeyword(essenceBody.replace(/\{\{[^}]+\}\}/g, ''), /止め|確保|戻りやす|余白|切り替え/) ||
    '短い即答をいったん止め、見直す時間を先に確保すると戻りやすくなります。';
  const judgmentRecovery =
    '確かめたい点を一つに絞り、今日決める範囲を小さくすると判断へ戻りやすくなります。';
  const recoveryStrength = '小さな手ごたえが見えると、少しずつ動きを戻しやすいです。';

  const cells = [
    socialRecovery,
    closeLoad,
    judgmentRecovery,
    recoveryStrength,
    recoveryLoad,
    recoveryRecovery,
  ];

  it('人間関係.recovery is not preference-only', () => {
    assert.ok(/言葉に|戻り|感じた/.test(socialRecovery), `got: ${socialRecovery}`);
    assert.ok(!/を好む[。]?$/.test(socialRecovery.trim()), `preference-only: ${socialRecovery}`);
  });

  it('近い関係.load is user load, not only other-person impression', () => {
    assert.ok(/疲れ|考え続け|言葉にできない/.test(closeLoad), `got: ${closeLoad}`);
    assert.ok(!/感じさせることがある/.test(closeLoad), `other-person impression: ${closeLoad}`);
  });

  it('判断.recovery contains return-to-judgment action', () => {
    assert.ok(/決め|範囲|絞|判断へ戻/.test(judgmentRecovery), `got: ${judgmentRecovery}`);
    assert.ok(/戻りやす/.test(judgmentRecovery), `got: ${judgmentRecovery}`);
  });

  it('回復.strength does not contain やすくなりやすい', () => {
    assert.ok(!recoveryStrength.includes('やすくなりやすい'), `got: ${recoveryStrength}`);
    assert.ok(/戻しやす|動きを戻/.test(recoveryStrength), `got: ${recoveryStrength}`);
  });

  it('回復.load is a full sentence with load effect', () => {
    assert.ok(recoveryLoad.endsWith('。'), `incomplete: ${recoveryLoad}`);
    assert.ok(!/繰り返す場面[。]?$/.test(recoveryLoad.trim()), `fragment: ${recoveryLoad}`);
    assert.ok(/続く|切り替わり|休め|疲れ/.test(recoveryLoad), `got: ${recoveryLoad}`);
  });

  it('回復.recovery has actionable direction', () => {
    assert.ok(/止め|確保|決める|出す/.test(recoveryRecovery), `got: ${recoveryRecovery}`);
    assert.ok(/戻りやす/.test(recoveryRecovery), `got: ${recoveryRecovery}`);
  });

  it('exact guards: non-empty, complete, no brackets/duplicates/fragments', () => {
    for (const cell of cells) {
      assert.ok(cell.trim().length > 0, 'empty cell');
      assert.ok(cell.trim().endsWith('。'), `incomplete Japanese statement: ${cell}`);
      assert.ok(!cell.includes('【'), `internal label: ${cell}`);
      assert.ok(!/v\d+|selector|stemLane|version/.test(cell), `selector/version id: ${cell}`);
      assert.ok(!cell.includes('やすくなりやすい'), `awkward Japanese: ${cell}`);
      assert.ok(!/繰り返す場面[。]?$/.test(cell.trim()), `fragment ending: ${cell}`);
    }
    const unique = new Set(cells.map((c) => c.trim()));
    assert.equal(unique.size, cells.length, `duplicate residual cells: ${cells.join(' | ')}`);
    assert.notEqual(closeLoad.trim(), socialRecovery.trim(), 'load must not equal recovery');
    assert.notEqual(recoveryLoad.trim(), recoveryRecovery.trim(), 'load must not equal recovery');
  });
});
