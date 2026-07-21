export const ORBIT_FILES = {
  'GOVERNANCE.md': '## Current surfaces\n## Human review\n',
  'src/landing.html': '<main data-layout="editorial"><a class="primary" href="/start">Begin orbit</a></main>',
  'src/landing.css': ':root{--space-page:24px}@media(max-width:600px){main{padding:var(--space-page)}}',
  'evidence/desktop.txt': 'desktop:1440',
  'evidence/mobile.txt': 'mobile:390',
};

export function orbitConsistencyManifest({ humanReview = [], mutate = (files) => files } = {}) {
  const files = mutate({ ...ORBIT_FILES });
  return {
    files,
    manifest: {
      project: 'Orbit Field Notes', journeyOrder: ['ENTRY'], nextSingleAction: 'Review the declared landing-page evidence.', humanDecisions: [], humanReview,
      surfaces: [{
        id: 'landing', route: '/', journeyGroup: 'ENTRY', status: 'current', sourcePaths: ['src/landing.html', 'src/landing.css', 'evidence/desktop.txt', 'evidence/mobile.txt'], authoritySources: ['GOVERNANCE.md'],
        layout: { family: 'editorial', markers: [{ path: 'src/landing.html', value: 'data-layout="editorial"' }] },
        tokens: { forbiddenRawValues: [{ path: 'src/landing.css', value: '#ff00ff' }] },
        terminology: { required: [{ path: 'src/landing.html', value: 'Begin orbit' }], prohibited: [{ path: 'src/landing.html', value: 'Legacy launch' }] },
        ctas: [{ path: 'src/landing.html', label: 'Begin orbit', href: 'href="/start"', role: 'class="primary"' }],
        responsiveEvidence: [{ label: 'desktop', path: 'evidence/desktop.txt', marker: 'desktop:1440' }, { label: 'mobile', path: 'evidence/mobile.txt', marker: 'mobile:390' }], humanReview: [],
      }],
    },
  };
}
