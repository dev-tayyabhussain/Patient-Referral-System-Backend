const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.email,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || []
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error('Email sending failed');
  }
};

// Email templates
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to MediNet',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196f3;">Welcome to MediNet!</h2>
        <p>Hello ${name},</p>
        <p>Welcome to MediNet - the national healthcare referral and record management system.</p>
        <p>Your account has been successfully created and you can now access the platform.</p>
        <p>Best regards,<br>The MediNet Team</p>
      </div>
    `
  }),

  referralNotification: (referralData) => ({
    subject: `New Referral - ${referralData.patientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196f3;">New Patient Referral</h2>
        <p><strong>Patient:</strong> ${referralData.patientName}</p>
        <p><strong>From:</strong> ${referralData.fromHospital}</p>
        <p><strong>To:</strong> ${referralData.toHospital}</p>
        <p><strong>Reason:</strong> ${referralData.reason}</p>
        <p><strong>Priority:</strong> ${referralData.priority}</p>
        <p>Please log in to MediNet to review and respond to this referral.</p>
        <p>Best regards,<br>The MediNet Team</p>
      </div>
    `
  }),

  passwordReset: (resetLink) => ({
    subject: 'Password Reset - MediNet',
    html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2196f3;">Password Reset Request</h2>
            <p>You have requested to reset your password for your MediNet account.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}" style="background-color: #2196f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>The MediNet Team</p>
          </div>
        `
  }),

  accountApproved: (name, message) => ({
    subject: 'Account Approved - MediNet',
    html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4caf50;">Account Approved!</h2>
            <p>Hello ${name},</p>
            <p>Great news! Your MediNet account has been approved and you can now access the platform.</p>
            ${message ? `<p><strong>Message from admin:</strong> ${message}</p>` : ''}
            <p>You can now log in to your account and start using MediNet's features.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background-color: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to MediNet</a>
            <p>Best regards,<br>The MediNet Team</p>
          </div>
        `
  }),

  accountRejected: (name, reason) => ({
    subject: 'Account Application Rejected - MediNet',
    html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f44336;">Account Application Rejected</h2>
            <p>Hello ${name},</p>
            <p>We regret to inform you that your MediNet account application has been rejected.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>If you believe this is an error or would like to reapply, please contact our support team.</p>
            <p>Best regards,<br>The MediNet Team</p>
          </div>
        `
  }),

  hospitalApproved: (hospitalName, message) => ({
    subject: 'Hospital Approved - MediNet',
    html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4caf50;">Hospital Approved!</h2>
            <p>Congratulations!</p>
            <p>Your hospital "${hospitalName}" has been approved and is now part of the MediNet network.</p>
            ${message ? `<p><strong>Message from admin:</strong> ${message}</p>` : ''}
            <p>You can now manage your hospital and approve doctor applications.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="background-color: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Access Dashboard</a>
            <p>Best regards,<br>The MediNet Team</p>
          </div>
        `
  }),

  hospitalRejected: (hospitalName, reason) => ({
    subject: 'Hospital Application Rejected - MediNet',
    html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f44336;">Hospital Application Rejected</h2>
            <p>We regret to inform you that your hospital "${hospitalName}" application has been rejected.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>If you believe this is an error or would like to reapply, please contact our support team.</p>
            <p>Best regards,<br>The MediNet Team</p>
          </div>
        `
  })
};

module.exports = {
  sendEmail,
  emailTemplates
};
