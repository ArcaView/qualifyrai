// Supabase Edge Function: Send Feedback Email
// Purpose: Send email notifications when feedback/feature requests are submitted
// Deploy: supabase functions deploy send-feedback-email

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FEEDBACK_EMAIL = Deno.env.get('FEEDBACK_EMAIL') || 'info@qualifyrai.com';
const RESEND_API_URL = 'https://api.resend.com/emails';

interface FeedbackPayload {
  id: string;
  title: string;
  description: string;
  user_id?: string;
  created_at: string;
}

/**
 * Send email via Resend API
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Qualifyr.AI <noreply@qualifyrai.com>',
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', response.status, errorData);
      return {
        success: false,
        error: `Failed to send email: ${response.status} ${errorData}`,
      };
    }

    const data = await response.json();
    console.log('Email sent successfully:', data.id);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format feedback email HTML
 */
function formatFeedbackEmail(payload: FeedbackPayload): string {
  const isFeedback = payload.title.startsWith('Feedback:');
  const typeLabel = isFeedback ? 'Feedback' : 'Feature Request';
  
  // Extract contact email from description if present
  const contactMatch = payload.description.match(/Contact:\s*([^\n]+)/);
  const contactEmail = contactMatch ? contactMatch[1].trim() : null;
  
  // Clean description (remove contact info line)
  const cleanDescription = payload.description
    .replace(/\n\nContact:.*$/, '')
    .trim();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-top: none;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .label {
      font-weight: 600;
      color: #667eea;
      margin-top: 20px;
      margin-bottom: 8px;
      display: block;
    }
    .value {
      background: #f9fafb;
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid #667eea;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .meta {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
      font-size: 14px;
      color: #6b7280;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">New ${typeLabel} Received</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Qualifyr.AI</p>
  </div>
  <div class="content">
    <span class="label">Title:</span>
    <div class="value">${escapeHtml(payload.title)}</div>
    
    <span class="label">Description:</span>
    <div class="value">${escapeHtml(cleanDescription)}</div>
    
    ${contactEmail ? `
    <span class="label">Contact Email:</span>
    <div class="value">${escapeHtml(contactEmail)}</div>
    ` : ''}
    
    <div class="meta">
      <strong>Submission Details:</strong><br>
      ID: ${payload.id}<br>
      ${payload.user_id ? `User ID: ${payload.user_id}<br>` : 'Submitted anonymously<br>'}
      Submitted: ${new Date(payload.created_at).toLocaleString()}
    </div>
  </div>
  <div class="footer">
    <p>This is an automated notification from Qualifyr.AI</p>
    <p>View in dashboard: <a href="https://qualifyrai.com/feature-requests">Feature Requests</a></p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const payload: FeedbackPayload = await req.json();

    // Validate payload
    if (!payload.id || !payload.title || !payload.description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: id, title, description' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Format and send email
    const subject = `New ${payload.title.startsWith('Feedback:') ? 'Feedback' : 'Feature Request'}: ${payload.title.substring(0, 60)}`;
    const html = formatFeedbackEmail(payload);

    const result = await sendEmail(FEEDBACK_EMAIL, subject, html);

    if (!result.success) {
      console.error('Failed to send email:', result.error);
      // Don't fail the request - email is non-critical
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          message: 'Feedback saved but email notification failed',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-feedback-email function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

