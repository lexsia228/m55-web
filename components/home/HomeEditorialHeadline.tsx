import styles from './HomePanel.module.css';
import { HomeEditorialHeadline as HomeEditorialHeadlineBase } from './homeEditorialJapaneseLine';

type Props = {
  id?: string;
  className?: string;
  textJa: string;
};

export default function HomeEditorialHeadline({ id, className, textJa }: Props) {
  return (
    <HomeEditorialHeadlineBase
      id={id}
      className={className}
      textJa={textJa}
      nowrapClassName={styles.headlineSemanticUnit}
    />
  );
}
