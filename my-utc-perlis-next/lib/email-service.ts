interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Create transporter function that works with Next.js/Turbopack
async function createEmailTransporter() {
  // Use dynamic import like the working email functionality
  const nodemailer = await import('nodemailer');
  
  const config: EmailConfig = {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT!),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  };

  console.log('📧 Creating transporter with config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user.substring(0, 3) + '***' // Hide sensitive info
  });

  return nodemailer.createTransport(config);
}

class EmailService {
  constructor() {
    // Validate required environment variables
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const transporter = await createEmailTransporter();
      
      const fromAddress = options.from || 
        `${process.env.FROM_NAME || 'UTC Perlis'} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`;

      const mailOptions = {
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      console.log('📧 Sending email to:', options.to);
      console.log('📧 Subject:', options.subject);

      const result = await transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw new Error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const transporter = await createEmailTransporter();
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return false;
    }
  }
}

// Singleton instance
let emailService: EmailService | null = null;

export const getEmailService = (): EmailService => {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
};

export default EmailService;
