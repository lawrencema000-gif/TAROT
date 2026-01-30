import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface WelcomeEmailPayload {
  user_id: string;
}

const generateWelcomeEmailHtml = (name: string) => `
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
                Dear <strong style="color: #d4af37;">${name}</strong>,
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
                    <a href="https://arcana.app" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #0f0f1a; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 20px rgba(212, 175, 55, 0.3);">
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
                      You're receiving this because you signed up for Arcana with newsletter subscription enabled.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #606070;">
                      <a href="https://arcana.app/unsubscribe" style="color: #808090; text-decoration: underline;">Unsubscribe</a>
                      &nbsp;&bull;&nbsp;
                      <a href="https://arcana.app/privacy" style="color: #808090; text-decoration: underline;">Privacy Policy</a>
                    </p>
                    <p style="margin: 15px 0 0; font-size: 11px; color: #505060;">
                      &copy; 2025 Arcana. All rights reserved.
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
</html>
`;

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { user_id }: WelcomeEmailPayload = await req.json();

    if (!user_id || user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - can only send to your own email" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user_id)
      .maybeSingle();

    const displayName = profile?.name || user.email?.split("@")[0] || "there";
    const email = user.email;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "User has no email" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const htmlContent = generateWelcomeEmailHtml(displayName);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.log("Welcome email would be sent to:", email);
      console.log("No RESEND_API_KEY configured - email not sent");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email queued (API key not configured)",
          email,
          name: displayName
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Arcana <hello@arcana.app>",
        to: [email],
        subject: "Welcome to Arcana - Your Cosmic Journey Begins",
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Resend API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorData }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-welcome-email:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
