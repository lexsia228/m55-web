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

/** Fixed image-response fixture identity (not auth-gate). */
export const IMAGE_RESPONSE_FIXTURE = {
  fixtureId: 'image_response.shared.og',
  route: '/r/:token/opengraph-image',
  runtimeStateId: 'ecp:shared.og:og',
  selector: `img[${AUTH_GATE_STATE_ATTR}="ecp:shared.og:og"]`,
  stateAttribute: AUTH_GATE_STATE_ATTR,
  expectedAttributeValue: 'ecp:shared.og:og',
  teardown: 'none' as const,
};

export function renderImageResponseFixtureHtml(): string {
  const id = IMAGE_RESPONSE_FIXTURE.runtimeStateId;
  // 1x1 PNG
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>M55 OG fixture</title></head>
<body data-m55-cq-fixture="image_response">
<img src="data:image/png;base64,${png}" alt="og" data-m55-cq-state-id="${id}" />
</body></html>`;
}
