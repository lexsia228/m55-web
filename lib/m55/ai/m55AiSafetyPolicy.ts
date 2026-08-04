/**
 * M55 cross-cutting AI safety policy (AS-C2).
 * Authority: M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1 + AS-C/C1 planning SSOT.
 * Future LLM paths (reply JSON, etc.) must call classifyM55AiSafetyInput before generation.
 */

export type M55AiSafetyCategory =
  | 'medical'
  | 'legal'
  | 'financial'
  | 'self_harm'
  | 'violence_illegal'
  | 'emergency'
  | 'deterministic_prediction'
  | 'privacy_invasive'
  | 'reply_scope_offtopic'
  | 'jailbreak';

export type M55AiSafetyAction = 'allow' | 'refuse' | 'redirect' | 'escalate' | 'block';

export type M55AiSafetySurface = 'consult' | 'reply' | 'dtr' | 'general';

export type ClassifyM55AiSafetyInputOptions = {
  surface?: M55AiSafetySurface;
};

export type M55AiSafetyClassification = {
  action: M55AiSafetyAction;
  category: M55AiSafetyCategory | null;
  safeMessage: string | null;
};

type CategoryRule = {
  category: M55AiSafetyCategory;
  patterns: RegExp[];
  surfaces?: M55AiSafetySurface[];
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'jailbreak',
    patterns: [
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
      /jailbreak/i,
      /\bDAN\s+mode\b/i,
      /system\s*prompt/i,
      /プロンプトを無視/,
    ],
  },
  {
    category: 'self_harm',
    patterns: [/自殺|自傷|死にたい|消えたい|リストカット|生きていたくない|死のう/],
  },
  {
    category: 'emergency',
    patterns: [
      /今すぐ.*危険/,
      /助けて.*(誰か|ください)/,
      /今.*刺され/,
      /今.*殺され/,
      /緊急.*助け/,
    ],
  },
  {
    category: 'medical',
    patterns: [
      /診断して|何の病気|症状は何|治療法|処方|薬を.*(飲|使)|手術すべき|がんですか|癌ですか|うつ病.*治/,
      /医療.*アドバイス|病院.*行くべきか.*教え/,
    ],
  },
  {
    category: 'legal',
    patterns: [
      /弁護士|訴訟|勝訴|敗訴|裁判に勝|裁判所|契約.*(有効|無効)|違法かどうか|有罪|無罪|法的.*助言/,
    ],
  },
  {
    category: 'financial',
    patterns: [
      /投資|株|為替|FX|儲かる|儲け|利益.*(出|得)|売買.*(タイミング|時期)|銘柄|借り入れ.*投|ローン.*儲/,
    ],
  },
  {
    category: 'violence_illegal',
    patterns: [
      /殺し方|傷害.*方法|暴行.*手順|違法.*(方法|手順)|犯罪.*(やり方|手順)|武器.*作り方/,
    ],
  },
  {
    category: 'deterministic_prediction',
    patterns: [
      /いつ死ぬ|いつ死に|寿命|余命|いつ結婚|いつ妊娠|必ず.*(治る|儲かる|勝つ)|絶対.*(治る|儲かる|勝つ)|死期|当たるかどうか.*必ず/,
    ],
  },
  {
    category: 'privacy_invasive',
    patterns: [
      /住所.*(教えて|特定)|本名.*特定|尾行|ストーキング|個人.*(特定|探して)/,
    ],
  },
  {
    category: 'reply_scope_offtopic',
    surfaces: ['reply'],
    patterns: [
      /関係ない話|雑談しましょう|レポートと関係ない|一般チャット|天気.*(教えて|どう)|ニュース.*(教えて|どう)|別の話題/,
      /恋愛相談.*(全般|何でも)/,
    ],
  },
];

function actionForCategory(category: M55AiSafetyCategory): M55AiSafetyAction {
  switch (category) {
    case 'jailbreak':
      return 'block';
    case 'self_harm':
    case 'emergency':
      return 'escalate';
    case 'reply_scope_offtopic':
      return 'redirect';
    case 'medical':
    case 'legal':
    case 'financial':
    case 'violence_illegal':
    case 'deterministic_prediction':
    case 'privacy_invasive':
      return 'refuse';
    default:
      return 'allow';
  }
}

export function buildMedicalRefusalMessage(): string {
  return '体調や治療についての判断は、M55ではお伝えできません。医療機関やかかりつけの専門家にご相談ください。レポートで扱えるのは、いまの生活リズムや負荷の「傾向」の整理です。具体的な状況があれば、その範囲でお手伝いします。';
}

export function buildLegalRefusalMessage(): string {
  return '法律の手続きや勝敗の見通しは、M55ではお答えできません。弁護士などの専門家にご相談ください。レポートでは、対人場面での負荷や進め方の傾向を、生活の言葉で整理しています。';
}

export function buildFinancialRefusalMessage(): string {
  return '投資や金融商品の判断は、M55ではお答えできません。金融の専門家や公的な相談窓口をご利用ください。レポートでは、金銭結果を予言せず、判断が重くなる場面の傾向を扱います。';
}

export function buildSelfHarmCrisisEscalationMessage(): string {
  return 'この内容は、このプレミアムレポートをもとにした読み解きでは扱えません。つらい状況にある場合は、専門の相談窓口をご利用ください（例：いのちの電話 0120-783-556）。緊急の危険がある場合は、最寄りの緊急サービスに連絡してください。';
}

export function buildDeterministicPredictionRefusalMessage(): string {
  return '寿命や病気の結果、訴訟の結果などを断定するお答えはできません。M55は「傾向」と「扱い方」の整理に限られます。いま気になっている生活の場面を教えていただければ、その範囲でお手伝いします。';
}

export function buildReplyOffScopeRedirectMessage(): string {
  return '追加読み解きは、ご購入のDTRレポートを深めるためのものです。レポートと無関係な一般チャットや、医療・法律・金融の具体的判断はお受けできません。テーマに沿った質問をお送りください。';
}

export function buildJailbreakBlockMessage(): string {
  return 'この内容は、このプレミアムレポートをもとにした読み解きでは扱えません。レポートに沿った質問を、生活の言葉でお送りください。';
}

export function buildViolenceIllegalRefusalMessage(): string {
  return '危害や違法行為に関する具体的な助言はお受けできません。安全が心配な場合は、専門の相談窓口や緊急サービスをご利用ください。';
}

export function buildPrivacyInvasiveRefusalMessage(): string {
  return '他人の個人情報の特定や、プライバシーを侵害する内容はお受けできません。ご自身のレポートに沿った整理についてお手伝いします。';
}

export function buildGenericRefusalMessage(): string {
  return 'この内容は、M55のレポートや追加読み解きの範囲を超える専門的な助言になります。医療・法律・金融の判断は、それぞれの専門家や公的機関にご相談ください。レポートで整理できる「いまの傾向」や「扱い方」については、具体的な状況を教えていただければ、そこに沿ってお手伝いします。';
}

export function safeMessageForCategory(category: M55AiSafetyCategory): string {
  switch (category) {
    case 'medical':
      return buildMedicalRefusalMessage();
    case 'legal':
      return buildLegalRefusalMessage();
    case 'financial':
      return buildFinancialRefusalMessage();
    case 'self_harm':
    case 'emergency':
      return buildSelfHarmCrisisEscalationMessage();
    case 'deterministic_prediction':
      return buildDeterministicPredictionRefusalMessage();
    case 'reply_scope_offtopic':
      return buildReplyOffScopeRedirectMessage();
    case 'jailbreak':
      return buildJailbreakBlockMessage();
    case 'violence_illegal':
      return buildViolenceIllegalRefusalMessage();
    case 'privacy_invasive':
      return buildPrivacyInvasiveRefusalMessage();
    default:
      return buildGenericRefusalMessage();
  }
}

export function classifyM55AiSafetyInput(
  input: string,
  options: ClassifyM55AiSafetyInputOptions = {},
): M55AiSafetyClassification {
  const text = input.trim();
  if (!text) {
    return { action: 'allow', category: null, safeMessage: null };
  }

  const surface = options.surface ?? 'general';

  for (const rule of CATEGORY_RULES) {
    if (rule.surfaces && !rule.surfaces.includes(surface)) {
      continue;
    }
    if (rule.patterns.some((p) => p.test(text))) {
      const action = actionForCategory(rule.category);
      return {
        action,
        category: rule.category,
        safeMessage: safeMessageForCategory(rule.category),
      };
    }
  }

  return { action: 'allow', category: null, safeMessage: null };
}

const CROSS_CUTTING_INSTRUCTION = `【M55 安全ガード — 全AI生成共通】
あなたはM55の有料レポート／返書／相談の補助AIです。専門家（医師・弁護士・金融アドバイザー）ではありません。

禁止:
- 医療の診断・治療・処方の指示
- 法律の具体的助言・勝敗・手続の指示
- 投資・金融商品の推奨・利益保証
- 自傷・自殺・他者への危害の助長
- 違法行為の具体的手順
- 死期・病気の結果・訴訟結果・投資結果の断定（「必ず」「絶対」「治る」「儲かる」等）

必須:
- レポート文脈に沿った「傾向」「可能性」「整理」「扱い方」で述べる
- 高リスク質問は専門窓口への案内を優先し、占いとして断定しない
- 落ち着いた生活語。ユーザーを責めない。資格を偽らない`;

const SURFACE_SUFFIX: Record<M55AiSafetySurface, string> = {
  consult: `【相談AI】
このユーザーの購入済みEntry Reportの範囲内のみ補足・整理する。レポート外の一般チャットや専門助言は行わない。`,
  reply: `【返書生成】
購入済みDTRレポートとテーマ入力の範囲内のみ。JSONスキーマに従い平文のみ。高リスク入力は安全な短文リダイレクト。`,
  dtr: `【DTR生成】
傾向読みのナラティブのみ。医療・法律・投資の判断を代替しない。吉凶・死・病・金銭結果を断定しない。`,
  general: '',
};

export function buildM55AiSafetySystemInstruction(surface: M55AiSafetySurface = 'general'): string {
  const suffix = SURFACE_SUFFIX[surface];
  return suffix ? `${CROSS_CUTTING_INSTRUCTION}\n\n${suffix}` : CROSS_CUTTING_INSTRUCTION;
}

/** Consult room: blocked response uses error=blocked + safeMessage (no ticket consumption). */
export function isConsultSafetyBlocked(classification: M55AiSafetyClassification): boolean {
  return classification.action !== 'allow';
}
