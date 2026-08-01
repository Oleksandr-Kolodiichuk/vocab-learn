import { useEffect, useRef } from 'react';
import { api } from '../api/client';

export default function Login({ onLoggedIn }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    const handleCredentialResponse = async (response) => {
      try {
        const user = await api.loginWithGoogle(response.credential);
        onLoggedIn(user);
      } catch {}
    };

    const renderButton = () => {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        locale: 'de',
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          renderButton();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [onLoggedIn]);

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-mark">📚</div>
        <h1>Vocab Learn</h1>
        <p>Melde dich mit Google an, um deine Karten zu sehen.</p>
        <div ref={buttonRef} />
      </div>
    </div>
  );
}
