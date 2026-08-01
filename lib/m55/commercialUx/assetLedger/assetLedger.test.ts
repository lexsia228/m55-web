import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  M55_ASSET_LEDGER,
  assertAssetLedgerComplete,
  countByClassification,
} from './assetLedger';
import { assertPremiumQuestionContractComplete } from './premiumQuestionContract';
import { sanitizeInProgressPaidAnswers } from './legacyPaidQuestionAdapter';
import { assertRouteAssetConsumptionComplete } from '../experience/experienceRouteRegistry';

describe('asset-first commercial SSOT ledger', () => {
  it('classifies all governed assets without duplicates', () => {
    assertAssetLedgerComplete();
    const counts = countByClassification();
    assert.ok(counts.CANONICAL >= 20);
    assert.ok(counts.DERIVED >= 4);
    assert.ok(counts.LEGACY >= 2);
    assert.ok(counts.REJECTED >= 2);
    assert.equal(
      counts.CANONICAL + counts.DERIVED + counts.LEGACY + counts.REJECTED,
      M55_ASSET_LEDGER.length,
    );
  });

  it('covers premium question contract for all six questions', () => {
    assertPremiumQuestionContractComplete();
  });

  it('clears legacy Q5/Q6 from in-progress answers without touching Q1–Q4', () => {
    const result = sanitizeInProgressPaidAnswers({
      'paid.work_focus': 'paid.work_focus.priority',
      'paid.decision_friction': 'paid.decision_friction.too_many',
      'paid.relation_focus': 'paid.relation_focus.words',
      'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
      'paid.report_usage': 'paid.report_usage.reread_scene',
      'paid.reading_style': 'paid.reading_style.headline',
    });
    assert.equal(result.clearedLegacy, true);
    assert.equal(result.answers['paid.work_focus'], 'paid.work_focus.priority');
    assert.equal(result.answers['paid.report_usage'], undefined);
    assert.equal(result.answers['paid.reading_style'], undefined);
  });

  it('maps asset consumption for every ECP route', () => {
    assertRouteAssetConsumptionComplete();
  });
});
