// Minimal types for Google Identity Services ("Sign in with Google"),
// loaded from https://accounts.google.com/gsi/client.

interface GoogleCredentialResponse {
  /** ID token (JWT) to send to POST /api/auth/google */
  credential: string;
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
        renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
      };
    };
  };
}
