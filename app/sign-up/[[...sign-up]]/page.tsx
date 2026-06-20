import { SignUp } from '@clerk/nextjs';
import { PublicFooter } from '../../_components/PublicFooter';

export default function SignUpPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#f9f7f4' }}>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <SignUp signInUrl="/sign-in" afterSignUpUrl="/dtr/lp" />
      </div>
      <PublicFooter />
    </div>
  );
}
