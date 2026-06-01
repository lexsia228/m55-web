'use client';

import { useState, type ReactNode } from 'react';
import {
  PAID_DTR_DRAWER_CHAPTER_ENTRIES,
  PAID_DTR_DRAWER_HUB,
} from '../../lib/m55/paidDtrProductCopy';
import hubStyles from './PremiumDrawerHub.module.css';

/** 本番 drawer パネル id（full は UI 非掲出） */
export type DrawerHubPanelId = 'chapter-1' | 'chapter-2' | 'chapter-3' | 'chapter-4' | 'consult';

export type DrawerHubOpenPanel = DrawerHubPanelId | null;

type DrawerHubEntryRow = {
  entryId: string;
  panel: DrawerHubPanelId;
  label: string;
  sublabel: string;
  pill: string;
};

const DRAWER_HUB_CHAPTER_ROWS: DrawerHubEntryRow[] = PAID_DTR_DRAWER_CHAPTER_ENTRIES.map(
  (entry) => ({
    entryId: entry.id,
    panel: entry.panel,
    label: entry.labelJa,
    sublabel: entry.sublabelJa,
    pill: entry.pillLabelJa,
  }),
);

const DRAWER_HUB_CONSULT_ROW: DrawerHubEntryRow = {
  entryId: 'consult',
  panel: 'consult',
  label: PAID_DTR_DRAWER_HUB.consultLabelJa,
  sublabel: PAID_DTR_DRAWER_HUB.consultSublabelJa,
  pill: '返書',
};

const DRAWER_HUB_PANEL_ORDER: DrawerHubPanelId[] = [
  'chapter-1',
  'chapter-2',
  'chapter-3',
  'chapter-4',
  'consult',
];

function drawerHubPanelsToMount(aiConsultIncluded: boolean): DrawerHubPanelId[] {
  return aiConsultIncluded
    ? DRAWER_HUB_PANEL_ORDER
    : DRAWER_HUB_PANEL_ORDER.filter((panel) => panel !== 'consult');
}

function DrawerHubChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`${hubStyles.drawerHubChevron}${open ? ` ${hubStyles.drawerHubChevronOpen}` : ''}`}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 4 L10 8 L6 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  openPanel: DrawerHubOpenPanel;
  onSelectPanel: (panel: DrawerHubOpenPanel) => void;
  aiConsultIncluded: boolean;
  renderPanelBody: (panel: DrawerHubPanelId) => ReactNode;
};

function shouldMountPanelBody(
  panel: DrawerHubPanelId,
  openPanel: DrawerHubOpenPanel,
  aiConsultIncluded: boolean,
): boolean {
  if (openPanel === panel) return true;
  return panel === 'consult' && aiConsultIncluded;
}

export function PremiumDrawerHub({
  openPanel,
  onSelectPanel,
  aiConsultIncluded,
  renderPanelBody,
}: Props) {
  const entryRows = aiConsultIncluded
    ? [...DRAWER_HUB_CHAPTER_ROWS, DRAWER_HUB_CONSULT_ROW]
    : DRAWER_HUB_CHAPTER_ROWS;

  const panelsToMount = drawerHubPanelsToMount(aiConsultIncluded);

  /** Which Hub row looks active (chevron / highlight). Separate from openPanel (which body to show). */
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  const selectEntry = (item: DrawerHubEntryRow) => {
    const isActiveEntry = activeEntryId === item.entryId;
    const isPanelOpen = openPanel === item.panel;

    if (isActiveEntry && isPanelOpen) {
      setActiveEntryId(null);
      onSelectPanel(null);
      return;
    }

    setActiveEntryId(item.entryId);
    if (!isPanelOpen) {
      onSelectPanel(item.panel);
    }
  };

  const hasExpandedPanel = openPanel !== null;

  return (
    <section className={hubStyles.drawerHub} aria-label={PAID_DTR_DRAWER_HUB.ariaLabelJa}>
      <div className={hubStyles.drawerHubEntryCard}>
        <span className={hubStyles.drawerHubShimmer} aria-hidden />
        <div className={hubStyles.drawerHubHeader}>
          <p className={hubStyles.drawerHubOverline}>{PAID_DTR_DRAWER_HUB.overlineJa}</p>
          <h2 className={hubStyles.drawerHubTitle}>{PAID_DTR_DRAWER_HUB.titleJa}</h2>
          <p className={hubStyles.drawerHubLead}>{PAID_DTR_DRAWER_HUB.leadJa}</p>
        </div>

        <ul className={hubStyles.drawerHubList}>
          {entryRows.map((item) => {
            const isEntryActive = activeEntryId === item.entryId;
            const isConsult = item.panel === 'consult';

            return (
              <li
                key={item.entryId}
                className={`${hubStyles.drawerHubRow}${isEntryActive ? ` ${hubStyles.drawerHubRowOpen}` : ''}${isConsult ? ` ${hubStyles.drawerHubRowConsult}` : ''}`}
              >
                <button
                  type="button"
                  className={`${hubStyles.drawerHubTrigger}${isConsult ? ` ${hubStyles.drawerHubTriggerConsult}` : ''}`}
                  onClick={() => selectEntry(item)}
                  aria-expanded={isEntryActive}
                  aria-controls={`drawer-hub-body-${item.panel}`}
                >
                  <span className={hubStyles.drawerHubTriggerLeading} aria-hidden>
                    <span className={hubStyles.drawerHubPill}>{item.pill}</span>
                  </span>
                  <span className={hubStyles.drawerHubTriggerText}>
                    <span className={hubStyles.drawerHubLabel}>{item.label}</span>
                    <span className={hubStyles.drawerHubSublabel}>{item.sublabel}</span>
                  </span>
                  <DrawerHubChevron open={isEntryActive} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        className={`${hubStyles.drawerHubPanelArea}${hasExpandedPanel ? ` ${hubStyles.drawerHubPanelAreaExpanded}` : ''}`}
      >
        {panelsToMount.map((panel) => {
          const mountBody = shouldMountPanelBody(panel, openPanel, aiConsultIncluded);
          if (!mountBody) return null;

          const bodyVisible = openPanel === panel;

          return (
            <div
              key={panel}
              id={`drawer-hub-body-${panel}`}
              className={hubStyles.drawerHubExpandBody}
              hidden={!bodyVisible}
              aria-hidden={!bodyVisible}
            >
              <div
                className={
                  bodyVisible
                    ? hubStyles.drawerHubPanelSlot
                    : `${hubStyles.drawerHubPanelSlot} ${hubStyles.drawerHubPanelSlotPersist}`
                }
              >
                <div className={hubStyles.drawerHubReadingSurface}>
                  {renderPanelBody(panel)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
