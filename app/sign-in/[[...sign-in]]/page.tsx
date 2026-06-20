import { SignIn } from '@clerk/nextjs';
import { PublicFooter } from '../../_components/PublicFooter';

export default function SignInPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#f9f7f4' }}>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <SignIn signUpUrl="/sign-up" afterSignInUrl="/dtr/lp" />
      </div>
      <PublicFooter />
    </div>
  );
}
