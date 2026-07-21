const AUTHORITY = {
  commercial: 'lib/m55/contracts/m55CommercialFunnelContract.ts',
  self: 'docs/ssot/M55_SELF_FUNNEL_CONTRACT.md',
  product: 'docs/ssot/M55_PRODUCT_TRUTH.md',
  copy: 'docs/ssot/M55_COPY_AND_CLAIMS.md',
  visual: 'docs/ssot/M55_VISUAL_SYSTEM.md',
};

const responsive = (path, marker = '@media') => [{ label: 'desktop-and-mobile-source-evidence', path, marker }];
const documentResponsive = (path) => [{ label: 'viewport-relative-document-width', path, marker: 'calc(100vw' }];
const surface = (id, route, sourcePaths, authoritySources, layout, extra = {}) => ({ id, route, status: 'current', sourcePaths, authoritySources, layout, ...extra });
const debt = (ruleId, path, observedMarker, observed, expected, authorityRefs) => ({
  ruleId, path, observedMarker, observed, expected, authorityRefs,
  summary: `${observed} Recorded current debt; not target compliance.`,
  nextAction: 'Resolve only in the authorized Self Funnel product lane after Human selection.',
});

export function m55ConsistencyManifest() {
  return {
    project: 'M55',
    journeyOrder: ['ENTRY', 'EXPERIENCE', 'COMMERCIAL', 'OWNED EXPERIENCE', 'TRUST', 'SCOPE / EXCLUSIONS'],
    nextSingleAction: 'Human visual review of Judge, Operator, and print as a Control Plane tooling release prerequisite. Do not treat that review as consumer evidence or repair consumer pages in this operational lane.',
    agentNextAction: 'HOLD implementation. Read the evidence package and wait for separate Human approval of the Control Plane tooling release review.',
    humanDecisions: ['Self Funnel visual direction', 'Self Funnel result length', 'ten-asset presentation'],
    humanReview: [{ ruleId: 'human_review.cross_surface_quality', summary: 'Cross-surface composition, hierarchy, atmosphere, and commercial finish remain Human-only judgments.', expected: 'Explicit Human visual approval.', observed: 'Approval remains pending for the covered consumer surfaces.', authorityRefs: [AUTHORITY.visual], nextAction: 'Review the actual covered M55 consumer surfaces in a separately authorized visual-review lane. Judge, Operator, and print review does not satisfy this evidence; keep this record REVIEW_REQUIRED.' }],
    surfaces: [
      surface('home', '/home', ['app/page.tsx', 'app/home/page.tsx', 'components/home/HomePanel.tsx', 'components/home/HomePanel.module.css', 'lib/m55/homePreviewFixtures.ts', 'lib/m55/topFreeEntryPublicCopy.ts'], [AUTHORITY.commercial, AUTHORITY.visual], { family: 'public-editorial-shell', markers: [{ path: 'app/home/page.tsx', value: '<PublicShell>' }, { path: 'app/home/page.tsx', value: '<HomePanel />' }] }, {
        journeyGroup: 'ENTRY',
        terminology: { required: [{ path: 'lib/m55/topFreeEntryPublicCopy.ts', value: "freeResultCtaJa: '無料で見てみる'" }, { path: 'lib/m55/topFreeEntryPublicCopy.ts', value: "planComparisonCtaJa: 'プレミアムレポートを見る'" }], prohibited: [{ path: 'lib/m55/topFreeEntryPublicCopy.ts', value: '相性スコア' }, { path: 'lib/m55/topFreeEntryPublicCopy.ts', value: '霊視' }] },
        ctas: [{ path: 'lib/m55/topFreeEntryPublicCopy.ts', label: "freeResultCtaJa: '無料で見てみる'", href: "coreFreeHref: '/core'" }, { path: 'lib/m55/topFreeEntryPublicCopy.ts', label: "planComparisonCtaJa: 'プレミアムレポートを見る'", href: "viewSavedPlansHref: '/dtr/lp'" }, { path: 'components/home/HomePanel.tsx', role: 'className={styles.ctaFree}', hierarchy: 'className={styles.ctaPaidSolid}' }], responsiveEvidence: responsive('components/home/HomePanel.module.css'),
        currentDebt: [
          debt('home.legacy_public_term.mitorizu', 'lib/m55/topFreeEntryPublicCopy.ts', '見取り図', '見取り図 — legacy public term.', 'Target public language defined by the Self Funnel authority.', [AUTHORITY.copy, AUTHORITY.self]),
          debt('home.legacy_public_term.hozonban', 'lib/m55/topFreeEntryPublicCopy.ts', '保存版', '保存版 — legacy public/product term.', 'M55 プレミアムレポート target naming.', [AUTHORITY.copy, AUTHORITY.commercial]),
        ],
      }),
      surface('self-free-entry', '/core', ['app/core/page.tsx', 'components/core/CoreEssencePanel.tsx', 'components/core/CoreFreeIntroSection.tsx', 'components/core/CoreFreeQuestionnaireLayer.tsx', 'components/core/CoreExperience.module.css', 'lib/m55/freeResult/questionnaireCopyV1.ts'], [AUTHORITY.commercial, AUTHORITY.self, AUTHORITY.copy], { family: 'interactive-self-shell', markers: [{ path: 'app/core/page.tsx', value: '<ShellLayout' }, { path: 'app/core/page.tsx', value: '<CoreEssencePanel />' }, { path: 'components/core/CoreEssencePanel.tsx', value: '<CoreFreeQuestionnaireLayer' }] }, {
        journeyGroup: 'ENTRY', terminology: { required: [{ path: AUTHORITY.self, value: 'Current runtime (NOT target)' }, { path: AUTHORITY.self, value: 'NOT_YET_IMPLEMENTED' }] }, responsiveEvidence: responsive('components/core/CoreExperience.module.css'),
        currentDebt: [debt('self.entry.pre_result_interest_step', 'lib/m55/freeResult/questionnaireCopyV1.ts', '今の関心', '今の関心 — current pre-result step.', 'No pre-result theme-selection step.', [AUTHORITY.commercial, AUTHORITY.self, AUTHORITY.copy])],
      }),
      surface('self-free-result', '/core', ['components/core/CoreEssencePanel.tsx', 'components/core/CoreFreeResultSummaryHub.tsx', 'components/core/CoreEntryReportCTASection.tsx', 'components/core/CoreFreeToPaidConversionBridge.tsx', 'components/core/corePublicCopy.ts', 'components/core/CoreExperience.module.css'], [AUTHORITY.commercial, AUTHORITY.self, AUTHORITY.copy], { family: 'editorial-result-and-paid-bridge', markers: [{ path: 'components/core/CoreEssencePanel.tsx', value: '<CoreFreeResultSummaryHub' }, { path: 'components/core/CoreEssencePanel.tsx', value: '<CoreEntryReportCTASection' }] }, {
        journeyGroup: 'EXPERIENCE', ctas: [{ path: 'components/core/CoreFreeToPaidConversionBridge.tsx', label: 'primaryCtaJa' }], responsiveEvidence: responsive('components/core/CoreExperience.module.css'),
        currentDebt: [
          debt('self.result.legacy_public_term.mitorizu', 'components/core/CoreFreeResultSummaryHub.tsx', '見取り図', '見取り図 — legacy free-result term.', 'Target Self free-result language.', [AUTHORITY.copy, AUTHORITY.self]),
          debt('self.result.legacy_public_term.hozonban', 'components/core/corePublicCopy.ts', '保存版', '保存版 — legacy premium bridge term.', 'M55 プレミアムレポート target naming.', [AUTHORITY.copy, AUTHORITY.commercial]),
        ],
        humanReview: [{ ruleId: 'human_review.self_result_quality', summary: 'Result composition and identifiability quality require Human visual/content review.', expected: 'Human approval of composition, hierarchy, and identifiable result quality.', observed: 'Machine source checks only.', authorityRefs: [AUTHORITY.self, AUTHORITY.visual], nextAction: 'Review the actual Self free-result consumer page for content, composition, and identifiability with desktop and mobile evidence in the authorized Self Funnel lane. Do not repair it in this Control Plane lane or use the Consistency preview as consumer evidence.' }],
      }),
      surface('self-premium-lp', '/dtr/lp', ['app/dtr/lp/page.tsx', 'app/dtr/lp/lp.module.css', 'lib/m55/paidDtrProductCopy.ts'], [AUTHORITY.commercial, AUTHORITY.product, AUTHORITY.copy, AUTHORITY.visual], { family: 'public-editorial-product-lp', markers: [{ path: 'app/dtr/lp/page.tsx', value: '<PublicShell>' }, { path: 'app/dtr/lp/page.tsx', value: 'styles.lpRoot' }, { path: 'app/dtr/lp/page.tsx', value: '<PurchaseButton' }] }, {
        journeyGroup: 'COMMERCIAL', ctas: [{ path: 'app/dtr/lp/page.tsx', label: 'tier.ctaLabelJa', role: '<PurchaseButton' }, { path: 'lib/m55/paidDtrProductCopy.ts', label: 'FULLとライトを比べる' }], responsiveEvidence: responsive('app/dtr/lp/lp.module.css'),
        currentDebt: [
          debt('premium.product_name.full_legacy', 'lib/m55/paidDtrProductCopy.ts', '保存版FULL', '保存版FULL — legacy product name.', 'M55 プレミアムレポート フル.', [AUTHORITY.commercial, AUTHORITY.product, AUTHORITY.copy]),
          debt('premium.product_name.light_legacy', 'lib/m55/paidDtrProductCopy.ts', '保存版ライト', '保存版ライト — legacy product name.', 'M55 プレミアムレポート ライト.', [AUTHORITY.commercial, AUTHORITY.product, AUTHORITY.copy]),
          debt('premium.cta.full_legacy', 'lib/m55/paidDtrProductCopy.ts', '保存版FULLを選ぶ', '保存版FULLを選ぶ — legacy CTA label.', 'Target CTA terminology authorized by the commercial contract.', [AUTHORITY.commercial, AUTHORITY.copy]),
          debt('premium.cta.light_legacy', 'lib/m55/paidDtrProductCopy.ts', '保存版ライトを選ぶ', '保存版ライトを選ぶ — legacy CTA label.', 'Target CTA terminology authorized by the commercial contract.', [AUTHORITY.commercial, AUTHORITY.copy]),
        ],
      }),
      surface('pricing-overview', '/pricing', ['app/pricing/page.tsx', 'lib/m55/paidDtrProductCopy.ts'], [AUTHORITY.commercial, AUTHORITY.product], { family: 'public-document', markers: [{ path: 'app/pricing/page.tsx', value: '<main' }, { path: 'app/pricing/page.tsx', value: '料金とプラン' }] }, {
        journeyGroup: 'COMMERCIAL', ctas: [{ path: 'app/pricing/page.tsx', label: '保存版のプランを見る', href: 'href="/dtr/lp"' }], responsiveEvidence: documentResponsive('app/pricing/page.tsx'),
        currentDebt: [
          debt('pricing.product_name.full_legacy', 'app/pricing/page.tsx', '保存版FULL', '保存版FULL — legacy pricing term.', 'M55 プレミアムレポート フル.', [AUTHORITY.commercial, AUTHORITY.product]),
          debt('pricing.product_name.light_legacy', 'app/pricing/page.tsx', '保存版ライト', '保存版ライト — legacy pricing term.', 'M55 プレミアムレポート ライト.', [AUTHORITY.commercial, AUTHORITY.product]),
        ],
      }),
      surface('purchased-report-entry', '/dtr', ['app/dtr/page.tsx', 'components/dtr/DtrShelfPanel.tsx', 'components/dtr/DtrShelfPanel.module.css'], [AUTHORITY.product, 'lib/m55/paidDtrProductCopy.ts'], { family: 'public-report-shelf', markers: [{ path: 'app/dtr/page.tsx', value: '<PublicHeader />' }, { path: 'app/dtr/page.tsx', value: '<DtrShelfPanel' }, { path: 'app/dtr/page.tsx', value: '<PublicFooter />' }] }, {
        journeyGroup: 'OWNED EXPERIENCE', ctas: [{ path: 'components/dtr/DtrShelfPanel.tsx', href: 'href="/dtr/lp"', label: '商品ページ' }], responsiveEvidence: responsive('components/dtr/DtrShelfPanel.module.css'),
      }),
      surface('purchased-report-reader', '/dtr/core', ['app/dtr/core/page.tsx', 'components/dtr/DtrFullReader.tsx', 'components/dtr/DtrFullReader.module.css'], [AUTHORITY.product, 'lib/m55/dtrOwnershipGate.ts'], { family: 'authenticated-owned-reader', markers: [{ path: 'app/dtr/core/page.tsx', value: 'if (!userId) redirect("/dtr/lp")' }, { path: 'app/dtr/core/page.tsx', value: '<DtrFullReader' }] }, { journeyGroup: 'OWNED EXPERIENCE', responsiveEvidence: responsive('components/dtr/DtrFullReader.module.css') }),
      surface('additional-reading-entry', '/dtr/core', ['app/reply/page.tsx', 'components/dtr/DtrFullReader.tsx', 'components/dtr/ConsultRoom.tsx', 'components/dtr/ConsultRoom.module.css', 'lib/m55/paidDtrProductCopy.ts', 'lib/m55/reply/laneBProductionFailClosed.ts'], [AUTHORITY.product, AUTHORITY.copy], { family: 'embedded-purchaser-only-reading', markers: [{ path: 'components/dtr/DtrFullReader.tsx', value: '<ConsultRoom' }, { path: 'app/reply/page.tsx', value: 'redirect(LANE_B_CONSULT_REDIRECT_PATH)' }] }, {
        journeyGroup: 'OWNED EXPERIENCE', terminology: { required: [{ path: 'components/dtr/ConsultRoom.tsx', value: '追加読み解きを作る' }] }, ctas: [{ path: 'components/dtr/ConsultRoom.tsx', href: 'href="/dtr/core"' }, { path: 'components/dtr/ConsultRoom.tsx', href: 'href="/support"' }], responsiveEvidence: responsive('components/dtr/ConsultRoom.module.css'),
      }),
      surface('support', '/support', ['app/support/page.tsx'], [AUTHORITY.copy, 'lib/m55/accountDataControlPublicCopy.ts'], { family: 'public-document', markers: [{ path: 'app/support/page.tsx', value: '<main' }, { path: 'app/support/page.tsx', value: '>サポート</h1>' }] }, { journeyGroup: 'TRUST', ctas: [{ path: 'app/support/page.tsx', href: 'href="/"', label: 'トップページへ戻る' }], responsiveEvidence: documentResponsive('app/support/page.tsx') }),
      surface('legal-terms', '/legal/terms', ['app/legal/terms/page.tsx'], [AUTHORITY.copy, 'lib/m55/analysisAuthorityReferenceModel.ts'], { family: 'public-legal-document', markers: [{ path: 'app/legal/terms/page.tsx', value: '<main' }, { path: 'app/legal/terms/page.tsx', value: '利用規約' }] }, { journeyGroup: 'TRUST', responsiveEvidence: documentResponsive('app/legal/terms/page.tsx') }),
      surface('legal-privacy', '/legal/privacy', ['app/legal/privacy/page.tsx'], [AUTHORITY.copy, 'lib/m55/accountDataControlPublicCopy.ts'], { family: 'public-legal-document', markers: [{ path: 'app/legal/privacy/page.tsx', value: '<main' }, { path: 'app/legal/privacy/page.tsx', value: 'プライバシーポリシー' }] }, { journeyGroup: 'TRUST', ctas: [{ path: 'app/legal/privacy/page.tsx', label: 'サポート窓口' }], responsiveEvidence: documentResponsive('app/legal/privacy/page.tsx') }),
      surface('legal-refund', '/legal/refund', ['app/legal/refund/page.tsx'], [AUTHORITY.product], { family: 'public-legal-document', markers: [{ path: 'app/legal/refund/page.tsx', value: '<main' }, { path: 'app/legal/refund/page.tsx', value: '返金・キャンセル' }] }, { journeyGroup: 'TRUST', ctas: [{ path: 'app/legal/refund/page.tsx', href: 'href="/support"', label: 'サポート窓口' }], responsiveEvidence: documentResponsive('app/legal/refund/page.tsx') }),
      surface('commercial-disclosure', '/legal/tokushoho', ['app/legal/tokushoho/page.tsx'], [AUTHORITY.commercial, AUTHORITY.product, 'lib/m55/accountDataControlPublicCopy.ts'], { family: 'public-commercial-disclosure', markers: [{ path: 'app/legal/tokushoho/page.tsx', value: '<main' }, { path: 'app/legal/tokushoho/page.tsx', value: '特定商取引法に基づく表記' }] }, { journeyGroup: 'TRUST', ctas: [{ path: 'app/legal/tokushoho/page.tsx', href: 'href="/legal/refund"', label: '返金・キャンセル' }], responsiveEvidence: documentResponsive('app/legal/tokushoho/page.tsx'), currentDebt: [debt('disclosure.product_name.full_legacy', 'app/legal/tokushoho/page.tsx', '保存版FULL', '保存版FULL — legacy disclosure term.', 'M55 プレミアムレポート フル.', [AUTHORITY.commercial, AUTHORITY.product]), debt('disclosure.product_name.light_legacy', 'app/legal/tokushoho/page.tsx', '保存版ライト', '保存版ライト — legacy disclosure term.', 'M55 プレミアムレポート ライト.', [AUTHORITY.commercial, AUTHORITY.product])] }),
      { id: 'self-v2-target', route: '/core', status: 'excluded', journeyGroup: 'SCOPE / EXCLUSIONS', exclusionReason: 'Self V2 is a target implementation and is not live in this preview.', sourcePaths: [], authoritySources: [AUTHORITY.self], layout: { family: 'target-not-live', markers: [] } },
      { id: 'pair-runtime', route: '/synastry', status: 'excluded', journeyGroup: 'SCOPE / EXCLUSIONS', exclusionReason: 'Pair runtime belongs to a later authorized product lane.', sourcePaths: [], authoritySources: [AUTHORITY.commercial], layout: { family: 'later-lane', markers: [] } },
      { id: 'purchase-page', route: '/purchase', status: 'excluded', journeyGroup: 'SCOPE / EXCLUSIONS', exclusionReason: 'No standalone purchase page route is proven by this repository state.', sourcePaths: [], authoritySources: [AUTHORITY.commercial], layout: { family: 'no-proven-page-route', markers: [] } },
      { id: 'home-final-ssot', route: '/home', status: 'excluded', journeyGroup: 'SCOPE / EXCLUSIONS', exclusionReason: 'HOME final SSOT is explicitly NOT_YET and outside this preview.', sourcePaths: [], authoritySources: [AUTHORITY.commercial], layout: { family: 'not-yet', markers: [] } },
    ],
  };
}
