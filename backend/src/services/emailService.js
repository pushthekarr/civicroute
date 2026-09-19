const nodemailer = require('nodemailer');

function smtpConfiguration() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (![SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM].every(Boolean)) return null;
  const port = Number(SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS }, from: SMTP_FROM };
}

function resolutionText(etaDays) {
  if (!Number.isFinite(etaDays)) return 'The estimated resolution time will be updated as the complaint is processed.';
  const date = new Date(Date.now() + etaDays * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return `Estimated resolution: about ${etaDays} day${etaDays === 1 ? '' : 's'} (by approximately ${date}).`;
}

function confirmationMessage({ id, department, category, status, priority, etaDays }) {
  return {
    subject: `CivicRoute confirmation: ${id}`,
    text: `CivicRoute complaint registration confirmation\n\nYour civic grievance has been registered successfully.\n\nReference ID: ${id}\nDepartment: ${department}\nCategory: ${category}\nCurrent status: ${status}\nPriority: ${priority}\n${resolutionText(etaDays)}\n\nPlease keep your reference ID safe and use it to track your complaint through the CivicRoute citizen portal.\n\nCivicRoute Municipal Grievance Service`,
  };
}

async function sendComplaintConfirmation({ to, complaint, department }) {
  const config = smtpConfiguration();
  if (!config) return { attempted: false, delivered: false, reason: 'SMTP is not configured' };
  const message = confirmationMessage({ id: complaint.id, department, category: complaint.category, status: complaint.status, priority: complaint.priority, etaDays: complaint.eta_days });
  try {
    const transporter = nodemailer.createTransport(config);
    await transporter.sendMail({ from: config.from, to, ...message });
    return { attempted: true, delivered: true };
  } catch (error) {
    console.error(`Confirmation email failed for complaint ${complaint.id}:`, error.message);
    return { attempted: true, delivered: false, reason: 'Email provider unavailable' };
  }
}

module.exports = { sendComplaintConfirmation, smtpConfiguration, confirmationMessage };
