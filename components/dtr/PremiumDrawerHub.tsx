'use client';

import type { ReactNode } from 'react';
import { PAID_DTR_CHAPTERS, PAID_DTR_DRAWER_HUB } from '../../lib/m55/paidDtrProductCopy';
import hubStyles from './PremiumDrawerHub.module.css';

/** 本番 drawer パネル id（full は UI 非掲出） */
export type DrawerHubPanelId = 'chapter-1' | 'chapter-2' | 'chapter-3' | 'chapter-4' | 'consult';

export type DrawerHubOpenPanel = DrawerHubPanelId | null;

type DrawerHubItem = {
  panel: DrawerHubPanelId;
  label: string;
  sublabel: string;
};

const DRAWER_HUB_CHAPTERS: DrawerHubItem[] = PAID_DTR_DRAWER_HUB.chapterRowLabelsJa.map(
  (label, index) => {
    const ch = PAID_DTR_CHAPTERS[index]!;
    const panel = `chapter-${index + 1}` as DrawerHubPanelId;
    return {
      panel,
      label,
      sublabel: `${ch.roman} ${ch.title}`,
    };
  },
);

const DRAWER_HUB_CONSULT: DrawerHubItem = {
  panel: 'consult',
  label: PAID_DTR_DRAWER_HUB.consultLabelJa,
  sublabel: PAID_DTR_DRAWER_HUB.consultSublabelJa,
};

function drawerHubPill(panel: DrawerHubPanelId): string {
  switch (panel) {
    case 'chapter-1':
      return 'Ⅰ';
    case 'chapter-2':
      return 'Ⅱ';
    case 'chapter-3':
      return 'Ⅲ';
    case 'chapter-4':
      return 'Ⅳ';
    case 'consult':
      return '返書';
    default:
      return '';
  }
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
  const items = aiConsultIncluded
    ? [...DRAWER_HUB_CHAPTERS, DRAWER_HUB_CONSULT]
    : DRAWER_HUB_CHAPTERS;

  const toggle = (panel: DrawerHubPanelId) => {
    onSelectPanel(openPanel === panel ? null : panel);
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
          {items.map((item) => {
            const isOpen = openPanel === item.panel;
            const isConsult = item.panel === 'consult';

            return (
              <li
                key={item.panel}
                className={`${hubStyles.drawerHubRow}${isOpen ? ` ${hubStyles.drawerHubRowOpen}` : ''}${isConsult ? ` ${hubStyles.drawerHubRowConsult}` : ''}`}
              >
                <button
                  type="button"
                  className={`${hubStyles.drawerHubTrigger}${isConsult ? ` ${hubStyles.drawerHubTriggerConsult}` : ''}`}
                  onClick={() => toggle(item.panel)}
                  aria-expanded={isOpen}
                  aria-controls={`drawer-hub-body-${item.panel}`}
                >
                  <span className={hubStyles.drawerHubTriggerLeading} aria-hidden>
                    <span className={hubStyles.drawerHubPill}>{drawerHubPill(item.panel)}</span>
                  </span>
                  <span className={hubStyles.drawerHubTriggerText}>
                    <span className={hubStyles.drawerHubLabel}>{item.label}</span>
                    <span className={hubStyles.drawerHubSublabel}>{item.sublabel}</span>
                  </span>
                  <DrawerHubChevron open={isOpen} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        className={`${hubStyles.drawerHubPanelArea}${hasExpandedPanel ? ` ${hubStyles.drawerHubPanelAreaExpanded}` : ''}`}
      >
        {items.map((item) => {
          const mountBody = shouldMountPanelBody(item.panel, openPanel, aiConsultIncluded);
          if (!mountBody) return null;

          const bodyVisible = openPanel === item.panel;

          return (
            <div
              key={item.panel}
              id={`drawer-hub-body-${item.panel}`}
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
                  {renderPanelBody(item.panel)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
