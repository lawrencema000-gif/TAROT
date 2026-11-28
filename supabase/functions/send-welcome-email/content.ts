/**
 * The welcome email (WP-P5-03). Pure: no imports, no I/O, so the outbox
 * drain and the vitest goldens build exactly the same message.
 *
 * The template is the one send-welcome-email always had, with four changes:
 * the greeting uses the member's display name (escaped; the old code read
 * profiles.name, a column that does not exist), the Unsubscribe link carries
 * the member's own token (it was /unsubscribe with none, which the page
 * answers "Link not recognised"), the footer shows the year of sending (it
 * said 2025), and the footer says why it was sent in D35's words. It goes
 * with a List-Unsubscribe header and no List-Unsubscribe-Post: the link is a
 * page, not an endpoint that takes a POST.
 */

export interface WelcomeEmailInput {
  displayName: string;
  unsubscribeUrl: string;
  year: number;
  siteUrl: string;
}

export interface WelcomeEmail {
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

export const WELCOME_SUBJECT = "Welcome to Arcana - Your Cosmic Journey Begins";

/** D35: the footer says what the member asked for. */
const WHY_SENT = "You’re receiving this because you asked for Arcana’s welcome email.";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * False for the names RFC 2606 and RFC 6761 reserve: example.com, example.net,
 * example.org and their subdomains, and .test, .example, .invalid, .localhost
 * (and localhost itself). Every QA account is arcana-qa-p7-<tag>@example.com,
 * and a send there would hard-bounce on the owner's sender.
 */
export function isDeliverableAddress(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase().replace(/\.$/, "");
  if (!domain) return false;
  if (domain === "localhost") return false;
  for (const reserved of ["example.com", "example.net", "example.org"]) {
    if (domain === reserved || domain.endsWith(`.${reserved}`)) return false;
  }
  for (const tld of [".test", ".example", ".invalid", ".localhost"]) {
    if (domain.endsWith(tld)) return false;
  }
  return true;
}

export function buildWelcomeEmail({ displayName, unsubscribeUrl, year, siteUrl }: WelcomeEmailInput): WelcomeEmail {
  const name = displayName.trim();
  const greeting = name
    ? `Dear <strong style="color: #d4af37;">${escapeHtml(name)}</strong>,`
    : "Hello,";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Arcana</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f1a; color: #e5e5e5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(212, 175, 55, 0.2);">

          <!-- Header with cosmic gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(30, 30, 60, 0.8) 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(30, 30, 60, 0.8) 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid rgba(212, 175, 55, 0.3);">
                <span style="font-size: 36px;">&#10024;</span>
              </div>
              <h1 style="margin: 0; font-size: 32px; font-weight: 600; color: #d4af37; letter-spacing: -0.5px;">Welcome to Arcana</h1>
              <p style="margin: 10px 0 0; font-size: 16px; color: #a0a0b0;">Your cosmic journey begins now</p>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 18px; color: #e5e5e5; margin: 0 0 20px; line-height: 1.6;">
                ${greeting}
              </p>

              <p style="font-size: 16px; color: #c0c0c0; margin: 0 0 30px; line-height: 1.7;">
                Thank you for joining Arcana. You've taken the first step toward deeper self-discovery through the ancient wisdom of tarot, astrology, and personality insights.
              </p>

              <!-- Features section -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background: rgba(212, 175, 55, 0.05); border-radius: 12px; border: 1px solid rgba(212, 175, 55, 0.1);">
                    <h3 style="margin: 0 0 15px; color: #d4af37; font-size: 18px;">What awaits you:</h3>

                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                          <span style="color: #d4af37; margin-right: 10px;">&#127775;</span>
                          <span style="color: #e5e5e5;"><strong>Daily Horoscopes</strong> - Personalized cosmic guidance based on your birth chart</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                          <span style="color: #d4af37; margin-right: 10px;">&#127183;</span>
                          <span style="color: #e5e5e5;"><strong>Tarot Readings</strong> - Draw cards for insight into any situation</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                          <span style="color: #d4af37; margin-right: 10px;">&#128221;</span>
                          <span style="color: #e5e5e5;"><strong>Reflection Journal</strong> - Track your thoughts and spiritual growth</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #d4af37; margin-right: 10px;">&#129504;</span>
                          <span style="color: #e5e5e5;"><strong>Personality Quizzes</strong> - Discover your MBTI, love language, and more</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Getting started tips -->
              <h3 style="color: #d4af37; font-size: 18px; margin: 30px 0 15px;">Getting Started</h3>
              <ol style="margin: 0; padding-left: 20px; color: #c0c0c0; line-height: 1.8;">
                <li style="margin-bottom: 10px;">Complete your daily ritual each morning for personalized insights</li>
                <li style="margin-bottom: 10px;">Try a 3-card tarot spread when facing a decision</li>
                <li style="margin-bottom: 10px;">Write in your journal to track patterns and growth</li>
                <li>Take a personality quiz to unlock deeper self-understanding</li>
              </ol>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 40px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${siteUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #0f0f1a; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 20px rgba(212, 175, 55, 0.3);">
                      Begin Your Daily Ritual
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; color: #808090; margin: 30px 0 0; line-height: 1.6;">
                May the stars guide your path,<br>
                <strong style="color: #d4af37;">The Arcana Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05);">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 10px; font-size: 12px; color: #606070;">
                      ${WHY_SENT}
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #606070;">
                      <a href="${escapeHtml(unsubscribeUrl)}" style="color: #808090; text-decoration: underline;">Unsubscribe</a>
                      &nbsp;&bull;&nbsp;
                      <a href="${siteUrl}/privacy-policy.html" style="color: #808090; text-decoration: underline;">Privacy Policy</a>
                    </p>
                    <p style="margin: 15px 0 0; font-size: 11px; color: #505060;">
                      &copy; ${year} Arcana. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    name ? `Dear ${name},` : "Hello,",
    "",
    "Thank you for joining Arcana. You've taken the first step toward deeper self-discovery through the ancient wisdom of tarot, astrology, and personality insights.",
    "",
    "What awaits you:",
    "- Daily Horoscopes - Personalized cosmic guidance based on your birth chart",
    "- Tarot Readings - Draw cards for insight into any situation",
    "- Reflection Journal - Track your thoughts and spiritual growth",
    "- Personality Quizzes - Discover your MBTI, love language, and more",
    "",
    "Getting Started",
    "1. Complete your daily ritual each morning for personalized insights",
    "2. Try a 3-card tarot spread when facing a decision",
    "3. Write in your journal to track patterns and growth",
    "4. Take a personality quiz to unlock deeper self-understanding",
    "",
    `Begin your daily ritual: ${siteUrl}`,
    "",
    "May the stars guide your path,",
    "The Arcana Team",
    "",
    "--",
    WHY_SENT,
    `Unsubscribe: ${unsubscribeUrl}`,
    `Privacy Policy: ${siteUrl}/privacy-policy.html`,
    `© ${year} Arcana. All rights reserved.`,
    "",
  ].join("\n");

  return {
    subject: WELCOME_SUBJECT,
    html,
    text,
    headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
  };
}
