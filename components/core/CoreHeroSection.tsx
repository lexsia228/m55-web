import Image from 'next/image';
import type { CoreResult } from '../../lib/m55/coreResult/types';
import {
  CORE_TYPE_EN_TAG,
  formatFirstObservationJa,
  heroNarrative,
  withNickname,
} from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreHeroSection({
  result,
  nickname,
}: {
  result: CoreResult;
  nickname: string;
}) {
  const nick = nickname.trim();
  const en = CORE_TYPE_EN_TAG[result.coreType] ?? result.coreType;
  const { tagline, body } = heroNarrative(result);
  const [para1, para2] = body;

  return (
    <header className={styles.heroPoster}>
      <div className={styles.heroPosterArt} aria-hidden />
      <div className={styles.heroPosterInner}>
        <div className={styles.heroPosterTop}>
          <div className={styles.heroPosterCopy}>
            <h1 className={styles.heroPosterKicker}>{withNickname('t の本質', nick)}</h1>
            <p className={styles.heroPosterMeta}>{formatFirstObservationJa(result.lockedAt)}</p>
            <p className={styles.heroPosterAnchor} aria-hidden={false}>
              {nick}
            </p>
            <p className={styles.heroPosterEn}>{en}</p>
            <p className={styles.heroPosterJaType}>{result.coreLabel}</p>
            <p className={styles.heroPosterTagline}>{tagline}</p>
            {para1 ? <p className={styles.heroPosterBody}>{para1}</p> : null}
            {para2 ? <p className={styles.heroPosterBody}>{para2}</p> : null}
          </div>
          <div className={styles.heroPosterMark} aria-hidden>
            <Image src="/icons/m55-monomark.svg" alt="" fill sizes="64px" />
          </div>
        </div>
      </div>
    </header>
  );
}
