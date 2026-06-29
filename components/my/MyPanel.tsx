'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';
import { ProfileRepository, BirthProfile } from '../../lib/soul/profile';
import {
  displayLabelForDtrRightKey,
  isEntryReportCoreRight,
} from '../../lib/m55/myEntitlementLabels';
import {
  LABEL_STATE_OWNED,
  MY_BADGE_NOT_PURCHASED,
  MY_BADGE_PREPARING,
  MY_CONSULT_BODY_OWNED_P1,
  MY_CONSULT_BODY_OWNED_P2,
  MY_CONSULT_BODY_PRE_OWNED,
  MY_CONSULT_CTA_HREF,
  MY_CONSULT_CTA_LABEL,
  MY_CONSULT_SECTION_TITLE,
  MY_FIRST_TIME_CTA_HREF,
  MY_FIRST_TIME_CTA_LABEL,
  MY_FIRST_TIME_GUIDE_BODY,
  MY_FIRST_TIME_GUIDE_TITLE,
  MY_HELP_SECTION_TITLE,
  MY_PAGE_HERO_BODY,
  MY_PAGE_TITLE,
  MY_PROFILE_EDIT_CTA_LABEL,
  MY_PROFILE_SECTION_TITLE,
  MY_REPORT_LIST_ARIA_LABEL,
  MY_SAVED_REPORT_CTA_OPEN_HREF,
  MY_SAVED_REPORT_CTA_OPEN_LABEL,
  MY_SAVED_REPORT_CTA_PLAN_HREF,
  MY_SAVED_REPORT_CTA_PLAN_LABEL,
  MY_SAVED_REPORT_EMPTY_NO_PROFILE,
  MY_SAVED_REPORT_EMPTY_READY,
  MY_SAVED_REPORT_ENT_ERROR,
  MY_SAVED_REPORT_INTRO_COMMON,
  MY_SAVED_REPORT_INTRO_OWNED,
  MY_SAVED_REPORT_LOADING,
  MY_SAVED_REPORT_OWNED_NOTE_P1,
  MY_SAVED_REPORT_OWNED_NOTE_P2,
  MY_SAVED_REPORT_PROCESSING,
  MY_SAVED_REPORT_SECTION_TITLE,
  MY_SAVED_REPORT_SNAP_ERROR,
  MY_SERVICES_INTRO,
  MY_SERVICES_SECTION_TITLE,
  MY_SIGNED_OUT_HUB_BODY,
} from '../../lib/m55/dtrProductLabels';
import DtrCatalogStrip from '../dtr/DtrCatalogStrip';
import LightToFullUpgradeCta from '../dtr/LightToFullUpgradeCta';
import SavedReportDeleteDialog from './SavedReportDeleteDialog';
import {
  DTR_SAVED_REPORT_DELETE_ERROR_GENERIC,
  DTR_SAVED_REPORT_DELETE_TOAST_PRIMARY,
  DTR_SAVED_REPORT_DELETE_TOAST_SECONDARY,
  DTR_SAVED_REPORT_DELETE_TRIGGER_LABEL,
} from '../../lib/m55/dtrSavedReportDeleteCopy';
import {
  ACCOUNT_DATA_MY_BODY_P1,
  ACCOUNT_DATA_MY_BODY_P2,
  ACCOUNT_DATA_MY_DEVICE_NOTE,
  ACCOUNT_DATA_MY_SECTION_TITLE,
  ACCOUNT_DATA_REQUEST_CTA_LABEL,
  ACCOUNT_DATA_REQUEST_HREF,
} from '../../lib/m55/accountDataControlPublicCopy';
import styles from './MyPanel.module.css';

type EntitlementsResponse = {
  tier?: string;
  retention_days?: number;
  dtr_rights?: string[];
};

type SnapshotReadyResponse = {
  ready: boolean;
  hasOwnership: boolean;
  hasPurchaseSnapshot: boolean;
  savedReportTier?: {
    hasLight: boolean;
    hasFull: boolean;
    canUpgradeFromLight: boolean;
    reportInstanceId: string | null;
  };
};

type ProfileState = 'no_profile' | 'ready' | 'editing';

type SavedReportVisualState =
  | 'loading'
  | 'ent_error'
  | 'snap_error'
  | 'no_profile'
  | 'ready_unpurchased'
  | 'processing'
  | 'owned_ready';

function computeRows(ent: EntitlementsResponse, snap: SnapshotReadyResponse | null): string[] {
  const rights = ent.dtr_rights ?? [];
  const hasCoreInList = rights.some((k) => isEntryReportCoreRight(k));
  if (rights.length > 0) return rights;
  if (snap?.hasOwnership && !hasCoreInList) return ['m55_p:core_origin'];
  return [];
}

function resolveSavedReportState(
  entLoading: boolean,
  entError: boolean,
  snapError: boolean,
  ent: EntitlementsResponse | null,
  snap: SnapshotReadyResponse | null,
  profileState: ProfileState | null
): SavedReportVisualState {
  if (entLoading) return 'loading';
  if (entError) return 'ent_error';
  if (snapError) return 'snap_error';
  if (!ent) return 'loading';

  const rows = computeRows(ent, snap);
  const ownsAny = rows.length > 0 || snap?.hasOwnership === true;
  const canOpenCore = snap?.ready === true;

  if (ownsAny && canOpenCore) return 'owned_ready';
  if (ownsAny && !canOpenCore) return 'processing';
  if (profileState === 'no_profile') return 'no_profile';
  return 'ready_unpurchased';
}

function isOwnedSnapshotReady(
  entError: boolean,
  snapError: boolean,
  ent: EntitlementsResponse | null,
  snap: SnapshotReadyResponse | null
): boolean {
  if (entError || snapError || !ent) return false;
  const rows = computeRows(ent, snap);
  const ownsAny = rows.length > 0 || snap?.hasOwnership === true;
  return ownsAny && snap?.ready === true;
}

export default function MyPanel() {
  const { user, isLoaded } = useUser();
  const [ent, setEnt] = useState<EntitlementsResponse | null>(null);
  const [entError, setEntError] = useState(false);
  const [entLoaded, setEntLoaded] = useState(false);
  const [snap, setSnap] = useState<SnapshotReadyResponse | null>(null);
  const [snapError, setSnapError] = useState(false);
  const [deleteToastVisible, setDeleteToastVisible] = useState(false);
  const profileState = useMyProfileState(user?.id);

  const entLoading = Boolean(user) && !entLoaded;

  const load = useCallback(async () => {
    setEntLoaded(false);
    try {
      const [entRes, snapRes] = await Promise.all([
        fetch('/api/me/entitlements', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/dtr/report-snapshot-ready', { credentials: 'include', cache: 'no-store' }),
      ]);
      if (!entRes.ok) {
        setEntError(true);
        setEnt(null);
      } else {
        const data = (await entRes.json()) as EntitlementsResponse;
        setEnt(data);
        setEntError(false);
      }
      if (!snapRes.ok) {
        setSnapError(true);
        setSnap(null);
      } else {
        const s = (await snapRes.json()) as SnapshotReadyResponse;
        setSnap(s);
        setSnapError(false);
      }
    } catch {
      setEntError(true);
      setEnt(null);
      setSnapError(true);
      setSnap(null);
    } finally {
      setEntLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
    else {
      setEnt(null);
      setSnap(null);
      setEntError(false);
      setSnapError(false);
      setEntLoaded(false);
    }
  }, [user, load]);

  useEffect(() => {
    if (!deleteToastVisible) return;
    const t = window.setTimeout(() => setDeleteToastVisible(false), 6000);
    return () => window.clearTimeout(t);
  }, [deleteToastVisible]);

  const handleDeleteSuccess = useCallback(() => {
    setDeleteToastVisible(true);
    void load();
  }, [load]);

  const savedReportState = resolveSavedReportState(
    entLoading,
    entError,
    snapError,
    ent,
    snap,
    profileState
  );

  const ownedReady = isOwnedSnapshotReady(entError, snapError, ent, snap);
  const entReady = entLoaded && !entError && ent !== null;

  if (!isLoaded) {
    return (
      <div className={styles.wrap}>
        <p className={styles.muted}>読み込み中…</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <h1 className={styles.h1}>{MY_PAGE_TITLE}</h1>
        <p className={styles.lead}>{MY_PAGE_HERO_BODY}</p>
      </header>

      <SignedOut>
        <section className={styles.card} aria-label="サインイン">
          <p className={styles.body}>{MY_SIGNED_OUT_HUB_BODY}</p>
          <div className={styles.links}>
            <SignInButton mode="modal">
              <button type="button" className={styles.ctaPrimary} style={{ cursor: 'pointer', border: 'none' }}>
                サインイン
              </button>
            </SignInButton>
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <div className={styles.signedInStack}>
          {profileState === 'no_profile' && entReady && (
            <FirstTimeGuideSection />
          )}

          <SavedReportSection
            state={savedReportState}
            ent={ent}
            snap={snap}
            onDeleteSuccess={handleDeleteSuccess}
            deleteToastVisible={deleteToastVisible}
          />

          {entReady && (
            <section className={styles.card} aria-label={MY_SERVICES_SECTION_TITLE}>
              <h2 className={styles.sectionTitle}>{MY_SERVICES_SECTION_TITLE}</h2>
              <p className={styles.sectionIntro}>{MY_SERVICES_INTRO}</p>
              <DtrCatalogStrip
                variant="my"
                externalData
                ent={ent}
                snap={snap}
                snapError={snapError}
              />
            </section>
          )}

          {entReady && (
            <ConsultSection ownedReady={ownedReady} />
          )}

          {user && entReady && (profileState === 'ready' || hasEditableMyProfile(user.id)) && (
            <ProfileSection userId={user.id} />
          )}
        </div>
      </SignedIn>

      <section className={styles.card} aria-label={MY_HELP_SECTION_TITLE}>
        <h2 className={styles.sectionTitle}>{MY_HELP_SECTION_TITLE}</h2>
        <nav className={styles.hubLinks} aria-label="サポートと規約">
          <Link href="/support">よくある質問・サポート</Link>
          <Link href="/legal/refund">返金・キャンセル</Link>
          <Link href="/legal/tokushoho">事業者情報・お問い合わせ先（特商法）</Link>
        </nav>
        <AccountDataDeletionSubsection />
      </section>
    </div>
  );
}

function AccountDataDeletionSubsection() {
  return (
    <div
      className={styles.helpSubsection}
      aria-label={ACCOUNT_DATA_MY_SECTION_TITLE}
      data-testid="m55-my-account-data-deletion"
    >
      <h3 className={styles.helpSubTitle}>{ACCOUNT_DATA_MY_SECTION_TITLE}</h3>
      <p className={styles.body}>{ACCOUNT_DATA_MY_BODY_P1}</p>
      <p className={styles.body}>{ACCOUNT_DATA_MY_BODY_P2}</p>
      <p className={styles.muted}>{ACCOUNT_DATA_MY_DEVICE_NOTE}</p>
      <div className={styles.links}>
        <Link href={ACCOUNT_DATA_REQUEST_HREF} className={styles.ctaPrimary}>
          {ACCOUNT_DATA_REQUEST_CTA_LABEL}
        </Link>
      </div>
    </div>
  );
}

function FirstTimeGuideSection() {
  return (
    <section
      className={styles.card}
      aria-label={MY_FIRST_TIME_GUIDE_TITLE}
      data-testid="m55-my-first-time-guide"
    >
      <h2 className={styles.sectionTitle}>{MY_FIRST_TIME_GUIDE_TITLE}</h2>
      <p className={styles.body}>{MY_FIRST_TIME_GUIDE_BODY}</p>
      <div className={styles.links}>
        <Link href={MY_FIRST_TIME_CTA_HREF} className={styles.ctaPrimary}>
          {MY_FIRST_TIME_CTA_LABEL}
        </Link>
      </div>
    </section>
  );
}

function SavedReportSection({
  state,
  ent,
  snap,
  onDeleteSuccess,
  deleteToastVisible,
}: {
  state: SavedReportVisualState;
  ent: EntitlementsResponse | null;
  snap: SnapshotReadyResponse | null;
  onDeleteSuccess: () => void;
  deleteToastVisible: boolean;
}) {
  const sectionBadge =
    state === 'no_profile' || state === 'ready_unpurchased'
      ? MY_BADGE_NOT_PURCHASED
      : state === 'processing'
      ? MY_BADGE_PREPARING
      : state === 'owned_ready'
      ? LABEL_STATE_OWNED
      : null;

  return (
    <section className={styles.card} aria-label={MY_SAVED_REPORT_SECTION_TITLE}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{MY_SAVED_REPORT_SECTION_TITLE}</h2>
        {sectionBadge && (
          <span
            className={`${styles.statusBadge} ${
              state === 'owned_ready'
                ? styles.statusPurchased
                : state === 'processing'
                ? styles.statusPending
                : styles.statusNotPurchased
            }`}
          >
            {sectionBadge}
          </span>
        )}
      </div>

      <p className={styles.sectionIntro}>{MY_SAVED_REPORT_INTRO_COMMON}</p>

      {state === 'owned_ready' && (
        <>
          <p className={styles.sectionIntro}>{MY_SAVED_REPORT_INTRO_OWNED}</p>
          <p className={styles.muted}>{MY_SAVED_REPORT_OWNED_NOTE_P1}</p>
          <p className={styles.muted}>{MY_SAVED_REPORT_OWNED_NOTE_P2}</p>
        </>
      )}

      {state === 'loading' && <p className={styles.body}>{MY_SAVED_REPORT_LOADING}</p>}

      {state === 'ent_error' && <p className={styles.muted}>{MY_SAVED_REPORT_ENT_ERROR}</p>}

      {state === 'snap_error' && <p className={styles.muted}>{MY_SAVED_REPORT_SNAP_ERROR}</p>}

      {state === 'no_profile' && <p className={styles.body}>{MY_SAVED_REPORT_EMPTY_NO_PROFILE}</p>}

      {state === 'ready_unpurchased' && (
        <>
          <p className={styles.body}>{MY_SAVED_REPORT_EMPTY_READY}</p>
          <div className={styles.links}>
            <Link href={MY_SAVED_REPORT_CTA_PLAN_HREF} className={styles.ctaPrimary}>
              {MY_SAVED_REPORT_CTA_PLAN_LABEL}
            </Link>
          </div>
        </>
      )}

      {state === 'processing' && <p className={styles.body}>{MY_SAVED_REPORT_PROCESSING}</p>}

      {state === 'owned_ready' && ent && (
        <>
          <OwnedReportsList
            ent={ent}
            snap={snap}
            onDeleteSuccess={onDeleteSuccess}
          />
          <div className={styles.links}>
            <Link href={MY_SAVED_REPORT_CTA_OPEN_HREF} className={styles.ctaPrimary}>
              {MY_SAVED_REPORT_CTA_OPEN_LABEL}
            </Link>
          </div>
          {snap?.savedReportTier?.canUpgradeFromLight &&
            snap.savedReportTier.reportInstanceId && (
              <LightToFullUpgradeCta
                reportInstanceId={snap.savedReportTier.reportInstanceId}
              />
            )}
          {deleteToastVisible && (
            <div
              className={styles.deleteToast}
              role="status"
              aria-live="polite"
              data-testid="m55-saved-report-delete-toast"
            >
              <p className={styles.deleteToastPrimary}>{DTR_SAVED_REPORT_DELETE_TOAST_PRIMARY}</p>
              <p className={styles.deleteToastSecondary}>{DTR_SAVED_REPORT_DELETE_TOAST_SECONDARY}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ConsultSection({ ownedReady }: { ownedReady: boolean }) {
  return (
    <section className={styles.card} aria-label={MY_CONSULT_SECTION_TITLE}>
      <h2 className={styles.sectionTitle}>{MY_CONSULT_SECTION_TITLE}</h2>
      {ownedReady ? (
        <>
          <p className={styles.body}>{MY_CONSULT_BODY_OWNED_P1}</p>
          <p className={styles.body}>{MY_CONSULT_BODY_OWNED_P2}</p>
          <div className={styles.links}>
            <Link href={MY_CONSULT_CTA_HREF} className={styles.ctaPrimary}>
              {MY_CONSULT_CTA_LABEL}
            </Link>
          </div>
        </>
      ) : (
        <p className={styles.body}>{MY_CONSULT_BODY_PRE_OWNED}</p>
      )}
    </section>
  );
}

function OwnedReportsList({
  ent,
  snap,
  onDeleteSuccess,
}: {
  ent: EntitlementsResponse;
  snap: SnapshotReadyResponse | null;
  onDeleteSuccess: () => void;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = computeRows(ent, snap);

  const handleDeleteConfirm = async () => {
    setDeleteConfirming(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/dtr/report-snapshot/hide', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.ok || res.status === 409) {
        setDeleteDialogOpen(false);
        onDeleteSuccess();
        return;
      }
      setDeleteError(DTR_SAVED_REPORT_DELETE_ERROR_GENERIC);
    } catch {
      setDeleteError(DTR_SAVED_REPORT_DELETE_ERROR_GENERIC);
    } finally {
      setDeleteConfirming(false);
    }
  };

  return (
    <>
      <SavedReportDeleteDialog
        open={deleteDialogOpen}
        confirming={deleteConfirming}
        onClose={() => {
          if (!deleteConfirming) {
            setDeleteDialogOpen(false);
            setDeleteError(null);
          }
        }}
        onConfirm={() => void handleDeleteConfirm()}
      />
      <ul className={styles.reportList} aria-label={MY_REPORT_LIST_ARIA_LABEL}>
        {rows.map((key, i) => {
          const isCore = isEntryReportCoreRight(key);
          return (
            <li key={`${key}-${i}`} className={styles.reportItem}>
              <div className={styles.reportItemTop}>
                <span className={styles.reportTitle}>{displayLabelForDtrRightKey(key)}</span>
                {isCore && (
                  <button
                    type="button"
                    className={styles.deleteReportBtn}
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteDialogOpen(true);
                    }}
                    disabled={deleteConfirming}
                    aria-haspopup="dialog"
                  >
                    {DTR_SAVED_REPORT_DELETE_TRIGGER_LABEL}
                  </button>
                )}
              </div>
              {deleteError && isCore && (
                <p className={styles.deleteError} role="alert">
                  {deleteError}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function useMyProfileState(userId: string | undefined): ProfileState | null {
  const [state, setState] = useState<ProfileState | null>(null);

  useEffect(() => {
    if (!userId) {
      setState(null);
      return;
    }

    const syncFromRepo = () => {
      const p = ProfileRepository.get(userId);
      setState(p?.birthDate ? 'ready' : 'no_profile');
    };

    syncFromRepo();
    window.addEventListener('m55:profile_updated', syncFromRepo);
    return () => window.removeEventListener('m55:profile_updated', syncFromRepo);
  }, [userId]);

  return state;
}

function hasEditableMyProfile(userId: string): boolean {
  const p = ProfileRepository.get(userId);
  return Boolean(p?.nickname?.trim());
}

function ProfileSection({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<BirthProfile | null>(null);
  const [nick, setNick] = useState('');
  const [mode, setMode] = useState<'ready' | 'editing'>('ready');

  useEffect(() => {
    const p = ProfileRepository.get(userId);
    if (p?.nickname?.trim() || p?.birthDate) {
      setProfile(p);
      setNick(p.nickname ?? '');
    }
  }, [userId, mode]);

  const canSave = nick.trim().length > 0;

  const handleSave = () => {
    const trimmed = nick.trim();
    if (!trimmed || !canSave) return;
    const p = ProfileRepository.saveNicknameOnly(userId, trimmed);
    if (!p) return;
    setProfile(p);
    setMode('ready');
    try {
      window.dispatchEvent(new Event('m55:profile_updated'));
    } catch {
      /* no-op */
    }
  };

  const handleEdit = () => {
    if (profile) {
      setNick(profile.nickname);
    }
    setMode('editing');
  };

  const handleCancel = () => {
    setMode('ready');
  };

  const handleNickKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canSave) handleSave();
  };

  if (mode === 'editing') {
    return (
      <section
        className={styles.card}
        aria-label={MY_PROFILE_SECTION_TITLE}
        data-testid="m55-my-profile-intake"
      >
        <h2 className={styles.sectionTitle}>{MY_PROFILE_SECTION_TITLE}</h2>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="mp-nick">
            ニックネーム
          </label>
          <input
            id="mp-nick"
            type="text"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            onKeyDown={handleNickKeyDown}
            placeholder="例：ソラ"
            autoComplete="nickname"
            className={styles.inputField}
            maxLength={30}
          />
        </div>
        {!canSave && (
          <p className={styles.muted}>ニックネームを入力してください。</p>
        )}
        <div className={styles.formActions}>
          <button type="button" onClick={handleSave} disabled={!canSave} className={styles.saveBtn}>
            保存する
          </button>
          <button type="button" onClick={handleCancel} className={styles.cancelBtn}>
            キャンセル
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card} aria-label={MY_PROFILE_SECTION_TITLE}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{MY_PROFILE_SECTION_TITLE}</h2>
        <button type="button" onClick={handleEdit} className={styles.editBtn}>
          {MY_PROFILE_EDIT_CTA_LABEL}
        </button>
      </div>
      <p className={styles.body}>{profile?.nickname}</p>
    </section>
  );
}
