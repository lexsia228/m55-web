/**
 * Closed localhost auth-gate fixture registry.
 * Each definition owns a fixed runtimeStateId rendered into fixture HTML.
 * Setups select only a fixture ID — never pass arbitrary state strings.
 */
export const AUTH_GATE_FIXTURE_SELECTOR = '[data-testid="m55-cq-auth-gate-fixture"]' as const;
export const AUTH_GATE_FIXTURE_ATTR = '[data-m55-cq-fixture="auth_gate"]' as const;
export const AUTH_GATE_STATE_ATTR = 'data-m55-cq-state-id' as const;

export type AuthGateFixtureMode = 'exact' | 'missing_state' | 'wrong_state' | 'ambiguous';

export type AuthGateFixtureDefinition = {
  fixtureId: string;
  route: string;
  runtimeStateId: string;
  selector: string;
  stateAttribute: typeof AUTH_GATE_STATE_ATTR;
  expectedAttributeValue: string;
  teardown: 'none';
};

const DEFS = [
  {
    fixtureId: 'auth_gate.public.sign_in',
    route: '/sign-in',
    runtimeStateId: 'ecp:public.sign_in:login_entry',
  },
  {
    fixtureId: 'auth_gate.public.sign_up',
    route: '/sign-up',
    runtimeStateId: 'ecp:public.sign_up:login_entry',
  },
  {
    fixtureId: 'auth_gate.premium.processing',
    route: '/dtr/processing',
    runtimeStateId: 'ecp:premium.processing:default',
  },
  {
    fixtureId: 'auth_gate.premium.purchase_success',
    route: '/purchase/success',
    runtimeStateId: 'ecp:premium.purchase_success:default',
  },
  {
    fixtureId: 'auth_gate.legacy.tarot',
    route: '/tarot',
    runtimeStateId: 'ecp:legacy.tarot:default',
  },
  {
    fixtureId: 'auth_gate.legacy.ai_chat',
    route: '/ai-chat',
    runtimeStateId: 'ecp:legacy.ai_chat:default',
  },
  {
    fixtureId: 'auth_gate.legacy.calendar',
    route: '/calendar',
    runtimeStateId: 'ecp:legacy.calendar:default',
  },
  {
    fixtureId: 'auth_gate.legacy.ai_calendar',
    route: '/ai-calendar',
    runtimeStateId: 'ecp:legacy.ai_calendar:default',
  },
  {
    fixtureId: 'auth_gate.legacy.meter',
    route: '/meter',
    runtimeStateId: 'ecp:legacy.meter:default',
  },
  {
    fixtureId: 'auth_gate.legacy.synastry.confirm',
    route: '/synastry/purchase/confirm',
    runtimeStateId: 'ecp:legacy.synastry.confirm:default',
  },
  {
    fixtureId: 'auth_gate.legacy.synastry.success',
    route: '/synastry/purchase/success',
    runtimeStateId: 'ecp:legacy.synastry.success:default',
  },
  {
    fixtureId: 'auth_gate.legacy.synastry.report',
    route: '/synastry/report/:reportId',
    runtimeStateId: 'ecp:legacy.synastry.report:default',
  },
  {
    fixtureId: 'auth_gate.prototype.hub',
    route: '/prototype',
    runtimeStateId: 'ecp:prototype.hub:default',
  },
] as const;

function toDefinition(def: (typeof DEFS)[number]): AuthGateFixtureDefinition {
  return {
    fixtureId: def.fixtureId,
    route: def.route,
    runtimeStateId: def.runtimeStateId,
    selector: AUTH_GATE_FIXTURE_SELECTOR,
    stateAttribute: AUTH_GATE_STATE_ATTR,
    expectedAttributeValue: def.runtimeStateId,
    teardown: 'none',
  };
}

export const M55_AUTH_GATE_FIXTURE_REGISTRY: readonly AuthGateFixtureDefinition[] =
  DEFS.map(toDefinition);

const BY_ID = new Map(
  M55_AUTH_GATE_FIXTURE_REGISTRY.map((d) => [d.fixtureId, d] as const),
);

const BY_RUNTIME = new Map(
  M55_AUTH_GATE_FIXTURE_REGISTRY.map((d) => [d.runtimeStateId, d] as const),
);

export function authGateFixtureById(fixtureId: string): AuthGateFixtureDefinition {
  const found = BY_ID.get(fixtureId);
  if (!found) {
    throw new Error(`STOP_FIXTURE_SCOPE: unknown auth-gate fixture ID ${fixtureId}`);
  }
  return found;
}

export function authGateFixtureByRuntimeStateId(
  runtimeStateId: string,
): AuthGateFixtureDefinition | undefined {
  return BY_RUNTIME.get(runtimeStateId);
}

/** Negative-test fixture that intentionally renders a wrong fixed identity. */
export const AUTH_GATE_WRONG_STATE_ID = 'ecp:public.pricing:default' as const;

export function renderAuthGateFixtureHtml(
  definition: AuthGateFixtureDefinition,
  mode: AuthGateFixtureMode = 'exact',
): string {
  const safeState = definition.runtimeStateId.replace(/"/g, '');
  const wrongState = AUTH_GATE_WRONG_STATE_ID;
  let mainInner = '';
  if (mode === 'missing_state') {
    mainInner = `<main data-testid="m55-cq-auth-gate-fixture">localhost auth-gate fixture missing state for ${definition.route}</main>`;
  } else if (mode === 'wrong_state') {
    mainInner = `<main data-testid="m55-cq-auth-gate-fixture" data-m55-cq-state-id="${wrongState}">localhost auth-gate fixture wrong state for ${definition.route}</main>`;
  } else if (mode === 'ambiguous') {
    mainInner = `<main data-testid="m55-cq-auth-gate-fixture" data-m55-cq-state-id="${safeState}">primary</main><aside data-m55-cq-state-id="${wrongState}">secondary</aside>`;
  } else {
    mainInner = `<main data-testid="m55-cq-auth-gate-fixture" data-m55-cq-state-id="${safeState}">localhost auth-gate fixture for ${definition.route} (${safeState})</main>`;
  }
  return `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>M55 localhost auth-gate fixture</title></head>
<body data-m55-cq-fixture="auth_gate" data-m55-cq-auth-gate="1" data-m55-cq-fixture-id="${definition.fixtureId}" data-m55-cq-fixture-path="${definition.route}">
${mainInner}
</body>
</html>`;
}

export type ImageResponseFixtureDefinition = {
  fixtureId: string;
  route: string;
  runtimeStateId: string;
  selector: string;
  stateAttribute: typeof AUTH_GATE_STATE_ATTR;
  expectedAttributeValue: string;
  /** Deterministic localhost navigate path (includes required query params). */
  navigatePath: string;
  /** Intercept only matching local image-response requests. */
  urlMatchPattern: RegExp;
  teardown: 'none';
};

const IMAGE_RESPONSE_DEFS = [
  {
    fixtureId: 'image_response.shared.og',
    route: '/r/:token/opengraph-image',
    runtimeStateId: 'ecp:shared.og:og',
    navigatePath: '/r/cq-smoke-invalid/opengraph-image',
    urlMatchPattern: /opengraph-image/i,
    alt: 'og',
  },
  {
    fixtureId: 'image_response.shared.export',
    route: '/r/:token/share-image',
    runtimeStateId: 'ecp:shared.export:export',
    navigatePath: '/r/cq-smoke-invalid/share-image?aspect=4%3A5',
    urlMatchPattern: /share-image/i,
    alt: 'export',
  },
] as const;

function toImageResponseDefinition(
  def: (typeof IMAGE_RESPONSE_DEFS)[number],
): ImageResponseFixtureDefinition {
  return {
    fixtureId: def.fixtureId,
    route: def.route,
    runtimeStateId: def.runtimeStateId,
    selector: `img[${AUTH_GATE_STATE_ATTR}="${def.runtimeStateId}"]`,
    stateAttribute: AUTH_GATE_STATE_ATTR,
    expectedAttributeValue: def.runtimeStateId,
    navigatePath: def.navigatePath,
    urlMatchPattern: def.urlMatchPattern,
    teardown: 'none',
  };
}

export const M55_IMAGE_RESPONSE_FIXTURE_REGISTRY: readonly ImageResponseFixtureDefinition[] =
  IMAGE_RESPONSE_DEFS.map(toImageResponseDefinition);

const IMAGE_BY_ID = new Map(
  M55_IMAGE_RESPONSE_FIXTURE_REGISTRY.map((d) => [d.fixtureId, d] as const),
);

const IMAGE_BY_RUNTIME = new Map(
  M55_IMAGE_RESPONSE_FIXTURE_REGISTRY.map((d) => [d.runtimeStateId, d] as const),
);

/** OG image-response fixture — preserved alias for existing imports. */
export const IMAGE_RESPONSE_FIXTURE: ImageResponseFixtureDefinition =
  imageResponseFixtureById('image_response.shared.og');

export function imageResponseFixtureById(fixtureId: string): ImageResponseFixtureDefinition {
  const found = IMAGE_BY_ID.get(fixtureId);
  if (!found) {
    throw new Error(`STOP_FIXTURE_SCOPE: unknown image-response fixture ID ${fixtureId}`);
  }
  return found;
}

export function imageResponseFixtureByRuntimeStateId(
  runtimeStateId: string,
): ImageResponseFixtureDefinition | undefined {
  return IMAGE_BY_RUNTIME.get(runtimeStateId);
}

export function isRegisteredImageResponseFixtureId(fixtureId: string | null | undefined): boolean {
  return Boolean(fixtureId && IMAGE_BY_ID.has(fixtureId));
}

export function renderImageResponseFixtureHtml(
  definition: ImageResponseFixtureDefinition = IMAGE_RESPONSE_FIXTURE,
): string {
  const id = definition.runtimeStateId;
  const alt = definition.fixtureId.endsWith('.export') ? 'export' : 'og';
  // 1x1 PNG
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>M55 image-response fixture</title></head>
<body data-m55-cq-fixture="image_response" data-m55-cq-fixture-id="${definition.fixtureId}">
<img src="data:image/png;base64,${png}" alt="${alt}" data-m55-cq-state-id="${id}" />
</body></html>`;
}
