import * as nodemailer from 'nodemailer';

export async function sendEmailWithAttachment(
  to: string,
  subject: string,
  text: string,
  pdfBuffer: Buffer,
  filename = 'report.pdf'
) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    ]
  });
}
