import { registerPlugin } from '@capacitor/core';

export interface AppleSignInCredential {
  identityToken: string;
  user: string;
  authorizationCode?: string;
  email?: string;
  fullName?: { givenName?: string; familyName?: string };
}

export interface AppleSignInPlugin {
  authorize(): Promise<AppleSignInCredential>;
}

export const AppleSignIn = registerPlugin<AppleSignInPlugin>('AppleSignIn');
