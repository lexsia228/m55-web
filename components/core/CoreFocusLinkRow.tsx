import styles from './CoreExperience.module.css';

/** 本文に「今の焦点」を置かず、ヒーロー直下の軽い導線のみ */
export default function CoreFocusLinkRow() {
  return (
    <div className={styles.focusJumpRow}>
      <span className={styles.focusJumpLink} aria-hidden="true">
        今の焦点を見る
      </span>
    </div>
  );
}
