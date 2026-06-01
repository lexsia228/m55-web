'use client';

import type { ReactNode } from 'react';
import hubStyles from './PremiumDrawerHub.module.css';

/** 本番 drawer パネル id（full は UI 非掲出） */
export type DrawerHubPanelId = 'chapter-1' | 'chapter-2' | 'chapter-3' | 'chapter-4' | 'consult';

export type DrawerHubOpenPanel = DrawerHubPanelId | null;

type DrawerHubItem = {
  panel: DrawerHubPanelId;
  label: string;
  sublabel: string;
};

const DRAWER_HUB_CHAPTERS: DrawerHubItem[] = [
  { panel: 'chapter-1', label: 'まず、全体を読み返す', sublabel: 'Ⅰ 輪郭を見る' },
  { panel: 'chapter-2', label: '力が出やすい条件を読む', sublabel: 'Ⅱ 構造を読む' },
  { panel: 'chapter-3', label: '無理が出やすい場面を読む', sublabel: 'Ⅲ 無理を知る' },
  { panel: 'chapter-4', label: '戻し方と使い方を読む', sublabel: 'Ⅳ 楽に扱う' },
];

const DRAWER_HUB_CONSULT: DrawerHubItem = {
  panel: 'consult',
  label: '相談返書で整理する',
  sublabel: '保存版に紐づく相談',
};

function DrawerHubChevron() {
  return (
    <svg
      className={hubStyles.drawerHubChevron}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    />
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

  return (
    <section className={hubStyles.drawerHub} aria-label="保存版の入口">
      <div className={hubStyles.drawerHubHeader}>
        <p className={hubStyles.drawerHubOverline}>保存版の入口</p>
        <h2 className={hubStyles.drawerHubTitle}>この保存版で読み返すこと</h2>
        <p className={hubStyles.drawerHubLead}>気になるところから、静かに読み返せます。</p>
      </div>

      <ul className={hubStyles.drawerHubList}>
        {items.map((item) => {
          const isOpen = openPanel === item.panel;
          const mountBody = shouldMountPanelBody(item.panel, openPanel, aiConsultIncluded);
          const bodyVisible = openPanel === item.panel;

          return (
            <li
              key={item.panel}
              className={`${hubStyles.drawerHubRow}${isOpen ? ` ${hubStyles.drawerHubRowOpen}` : ''}`}
            >
              <button
                type="button"
                className={hubStyles.drawerHubTrigger}
                onClick={() => toggle(item.panel)}
                aria-expanded={isOpen}
                aria-controls={mountBody ? `drawer-hub-body-${item.panel}` : undefined}
              >
                <span className={hubStyles.drawerHubTriggerText}>
                  <span className={hubStyles.drawerHubLabel}>{item.label}</span>
                  <span className={hubStyles.drawerHubSublabel}>{item.sublabel}</span>
                </span>
                <DrawerHubChevron />
              </button>
              {mountBody ? (
                <div
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
                    {renderPanelBody(item.panel)}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
