import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendVerificationEmail(to, token) {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Verify your StoryForge account',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#7c3aed">Welcome to StoryForge!</h2>
        <p>Click the button below to verify your email address.</p>
        <a href="${url}"
           style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;
                  text-decoration:none;border-radius:8px;font-weight:bold">
          Verify Email
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">
          Link expires in 24 hours. If you didn't create an account, ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to, token) {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Reset your StoryForge password',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#7c3aed">Password Reset</h2>
        <p>Click the button below to reset your password.</p>
        <a href="${url}"
           style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;
                  text-decoration:none;border-radius:8px;font-weight:bold">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">
          Link expires in 1 hour. If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendChapterUpdateEmail(to, storyTitle, chapterTitle, storyId) {
  const url = `${process.env.CLIENT_URL}/story/${storyId}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `New chapter in "${storyTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#7c3aed">New Chapter Available!</h2>
        <p>A new chapter has been published in a story you're following:</p>
        <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0;font-weight:bold;color:#1f2937">${storyTitle}</p>
          <p style="margin:8px 0 0 0;color:#6b7280">Chapter: ${chapterTitle}</p>
        </div>
        <a href="${url}"
           style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;
                  text-decoration:none;border-radius:8px;font-weight:bold">
          Read Now
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">
          You received this email because you bookmarked this story.
        </p>
      </div>
    `,
  });
}
