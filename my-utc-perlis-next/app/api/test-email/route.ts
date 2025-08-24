import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Test email template
    const testEmailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Email - UTC Perlis</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px 20px; border-radius: 0 0 10px 10px; }
            .success-box { background: #e8f5e8; padding: 20px; border-radius: 8px; border: 2px solid #4CAF50; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Email Test Berjaya!</h1>
              <p>Konfigurasi email berfungsi dengan baik</p>
            </div>
            
            <div class="content">
              <div class="success-box">
                <h3 style="margin-top: 0; color: #2e7d32;">✅ Ujian Email Berjaya</h3>
                <p>Sekiranya anda menerima email ini, bermakna konfigurasi SMTP untuk sistem UTC Perlis telah berfungsi dengan baik.</p>
                
                <p><strong>Maklumat Ujian:</strong></p>
                <ul>
                  <li>Masa: ${new Date().toLocaleString('ms-MY')}</li>
                  <li>Email Penerima: ${email}</li>
                  <li>Status: Berjaya</li>
                </ul>
              </div>

              <p>Email ini adalah ujian automatik dari sistem pengurusan tempahan UTC Perlis.</p>
              
              <div class="footer">
                <p><strong>UTC Perlis</strong><br>
                Jalan Kangar-Alor Setar, 01000 Kangar, Perlis<br>
                Tel: 04-976 8000 | Email: utcperlis@kpdnhep.gov.my</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Import nodemailer dynamically to work with Next.js
    const nodemailer = await import('nodemailer');
    
    const config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    console.log('📧 Creating transporter with config:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.auth.user?.substring(0, 3) + '***'
    });

    const transporter = nodemailer.createTransport(config);

    // First verify SMTP connection
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('❌ SMTP connection failed:', verifyError);
      return NextResponse.json(
        { error: 'SMTP connection failed. Please check your email configuration.' },
        { status: 500 }
      );
    }

    // Send test email
    const fromAddress = `${process.env.FROM_NAME || 'UTC Perlis'} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`;
    
    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: 'Test Email - Konfigurasi UTC Perlis Berjaya',
      html: testEmailHTML,
    };

    console.log('📧 Sending email to:', email);
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', result.messageId);

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
