// Sends email over SMTP (free with a Gmail account + app password, or any SMTP provider).
// Env: SMTP_USER, SMTP_PASS, optional SMTP_HOST (default smtp.gmail.com), SMTP_PORT (default 465), MAIL_FROM, MAIL_REPLY_TO.
// Tests set MAIL_TRANSPORT=file to write messages to dev/.mailbox.json instead of sending them.
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';

let transport = null;

export function mailConfigured() {
  return process.env.MAIL_TRANSPORT === 'file' || !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (transport) return transport;
  const port = Number(process.env.SMTP_PORT || 465);
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    disableFileAccess: true, disableUrlAccess: true,
  });
  return transport;
}

export async function sendMail({ to, subject, text, html, attachments }) {
  const from = process.env.MAIL_FROM || `Confetti Club <${process.env.SMTP_USER || 'no-reply@example.com'}>`;
  if (process.env.MAIL_TRANSPORT === 'file') {
    const file = path.join(process.cwd(), 'dev/.mailbox.json');
    const box = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    box.push({ from, to, subject, text, html, attachments: (attachments || []).map((a) => a.filename) });
    fs.writeFileSync(file, JSON.stringify(box, null, 2));
    return;
  }
  const replyTo = process.env.MAIL_REPLY_TO || undefined; // optional: where parents' replies go (defaults to the sending address)
  await getTransport().sendMail({ from, to, replyTo, subject, text, html, attachments });
}
