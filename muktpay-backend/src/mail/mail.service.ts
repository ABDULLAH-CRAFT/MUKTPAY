import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Sends the emails MuktPay needs: email verification and password reset codes.
 *
 * MAIL_HOST set     → real SMTP delivery.
 * MAIL_HOST missing → development only: the email is printed in the API log instead, so you can
 *                     copy the code without any mail account (production refuses to boot this way).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('MAIL_HOST')?.trim();
    const user = config.get<string>('MAIL_USER')?.trim();
    const pass = config.get<string>('MAIL_PASSWORD');
    this.from = config.get<string>('MAIL_FROM')?.trim() || 'MuktPay <no-reply@muktpay.local>';

    this.transporter = host
      ? createTransport({
          host,
          port: Number(config.get('MAIL_PORT') ?? 587),
          secure: config.get('MAIL_SECURE') === 'true', // true for port 465, false for 587 (STARTTLS)
          auth: user ? { user, pass } : undefined,
          // Never let a slow mail server hang a request.
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
        })
      : null;
  }

  sendVerificationCode(to: string, name: string, code: string, minutes: number) {
    return this.sendCode({
      to,
      name,
      code,
      minutes,
      subject: 'Your MuktPay verification code',
      intro: 'Use this code to verify your email address in MuktPay.',
    });
  }

  sendPasswordResetCode(to: string, name: string, code: string, minutes: number) {
    return this.sendCode({
      to,
      name,
      code,
      minutes,
      subject: 'Reset your MuktPay password',
      intro: 'Use this code to choose a new MuktPay password.',
    });
  }

  private async sendCode(input: {
    to: string;
    name: string;
    code: string;
    minutes: number;
    subject: string;
    intro: string;
  }): Promise<void> {
    const { to, name, code, minutes, subject, intro } = input;
    const firstName = name.trim().split(/\s+/)[0] || 'there';

    const text =
      `Hi ${firstName},\n\n${intro}\n\n    ${code}\n\n` +
      `The code expires in ${minutes} minutes. If you didn't ask for it, you can ignore this email: ` +
      `nothing will change on your account.\n\n- MuktPay`;

    const html =
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">` +
      `<h2 style="color:#1F5EFF;margin:0 0 16px">MuktPay</h2>` +
      `<p>Hi ${escapeHtml(firstName)},</p>` +
      `<p>${escapeHtml(intro)}</p>` +
      `<p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:24px 0">${escapeHtml(code)}</p>` +
      `<p style="color:#555">The code expires in ${minutes} minutes. If you didn't ask for it, you can ignore this email: ` +
      `nothing will change on your account.</p>` +
      `</div>`;

    if (!this.transporter) {
      // Development convenience. Production cannot reach this branch (MAIL_HOST is required there).
      if (process.env.NODE_ENV !== 'test') {
        this.logger.warn(`[dev mail, not sent] To: ${to}\nSubject: ${subject}\n${text}`);
      }
      return;
    }

    await this.transporter.sendMail({ from: this.from, to, subject, text, html });
  }
}
