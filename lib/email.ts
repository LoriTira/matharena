import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Use EMAIL_FROM env var for production (requires verified domain in Resend).
// Falls back to Resend's shared test domain which works without domain setup.
const FROM_EMAIL = process.env.EMAIL_FROM || 'MathArena <onboarding@resend.dev>';

export async function sendChallengeEmail({
  to,
  challengerName,
  challengeUrl,
}: {
  to: string;
  challengerName: string;
  challengeUrl: string;
}) {
  if (!resend) return;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${challengerName} challenged you on MathArena`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 400; color: #1a1a1e; margin-bottom: 8px;">
            You've been challenged!
          </h1>
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 24px;">
            <strong>${challengerName}</strong> wants to battle you in a mental math duel on MathArena.
            First to 5 wins. Your Elo rating is on the line.
          </p>
          <a href="${challengeUrl}" style="display: inline-block; padding: 14px 32px; background: #b45309; color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; border-radius: 2px;">
            ACCEPT CHALLENGE
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 32px;">
            This challenge expires in 7 days.
          </p>
        </div>
      `,
    });
    console.log('Challenge email sent:', { to, result });
  } catch (e) {
    console.error('Failed to send challenge email:', e);
  }
}
