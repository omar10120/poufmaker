import nodemailer from 'nodemailer';

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

export function generateConfirmationEmail(to: string, token: string) {
  const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`;
  
  return {
    to,
    subject: 'Confirm Your Email - Poufmaker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Poufmaker!</h2>
        <p>Thank you for registering. Please confirm your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmationUrl}" 
             style="background-color: #0070f3; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Confirm Email
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p>${confirmationUrl}</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eaeaea;" />
        <p style="color: #666; font-size: 14px;">
          This is an automated message, please do not reply to this email.
        </p>
      </div>
    `,
  };
}
