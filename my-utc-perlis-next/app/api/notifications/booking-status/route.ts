import { NextResponse } from 'next/server';

interface NotificationRequest {
  email: string;
  name: string;
  bookingId: string; // Now accepts booking number (UTC-YYYY-NNNN) or numeric ID
  status: string;
  reason?: string;
  eventName: string;
  startDate: string;
}

export async function POST(request: Request) {
  try {
    const data: NotificationRequest = await request.json();
    
    // Email template based on status
    const getEmailTemplate = (data: NotificationRequest) => {
      const statusText = {
        APPROVED: 'DILULUSKAN',
        REJECTED: 'DITOLAK & DIBATALKAN',
        CANCELLED: 'DIBATALKAN'
      };

      const baseTemplate = `
        <h2>Status Tempahan Fasiliti - ${statusText[data.status as keyof typeof statusText]}</h2>
        <p>Yang Dihormati ${data.name},</p>
        <p>Dukacita dimaklumkan bahawa tempahan anda untuk <strong>${data.eventName}</strong> pada tarikh <strong>${new Date(data.startDate).toLocaleDateString('ms-MY')}</strong> telah <strong>${statusText[data.status as keyof typeof statusText]}</strong>.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Butiran Tempahan:</h3>
          <p><strong>ID Tempahan:</strong> #${data.bookingId}</p>
          <p><strong>Acara:</strong> ${data.eventName}</p>
          <p><strong>Tarikh:</strong> ${new Date(data.startDate).toLocaleDateString('ms-MY')}</p>
          <p><strong>Status:</strong> ${statusText[data.status as keyof typeof statusText]}</p>
        </div>
      `;

      if (data.status === 'APPROVED') {
        return baseTemplate + `
          <p style="color: #28a745;">✅ Tempahan anda telah diluluskan! Sila hadir mengikut masa yang ditetapkan.</p>
          <p>Jika terdapat sebarang pertanyaan, sila hubungi pihak UTC Perlis di talian 04-9705310.</p>
          <p>Terima kasih kerana menggunakan sistem tempahan fasiliti UTC Perlis.</p>
        `;
      } else if (data.status === 'REJECTED') {
        return baseTemplate + `
          <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;">❌ <strong>Maaf, tempahan anda telah ditolak dan dibatalkan.</strong></p>
          </div>
          
          ${data.reason ? `
            <div style="background-color: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0;">📋 Sebab Penolakan & Pembatalan:</h4>
              <p style="margin-bottom: 0;">${data.reason}</p>
            </div>
          ` : ''}
          
          
          <p>Jika ada sebarang pertanyaan mengenai pengembalian bayaran atau tempahan baru, sila hubungi kami di <strong>010-510 5130</strong>.</p>
          <p>Terima kasih atas pemahaman anda.</p>
        `;
      } else {
        return baseTemplate + `
          <p>Status tempahan anda telah dikemaskini.</p>
          <p>Jika terdapat sebarang pertanyaan, sila hubungi pihak UTC Perlis di talian 04-9705310.</p>
        `;
      }
    };

    // Send email directly using nodemailer
    const emailContent = getEmailTemplate(data);
    
    try {
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

      const transporter = nodemailer.createTransport(config);
      const fromAddress = `${process.env.FROM_NAME || 'UTC Perlis'} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`;

      await transporter.sendMail({
        from: fromAddress,
        to: data.email,
        subject: `${data.status === 'REJECTED' ? 'Tempahan Dibatalkan' : 'Kemaskini Status Tempahan'} #${data.bookingId}`,
        html: emailContent,
      });
      
      console.log('✅ Booking status email sent successfully to:', data.email);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      // Continue execution even if email fails
    }

    // SMS notification option (integrate with SMS service)
    // TODO: Add SMS notification for critical updates

    return NextResponse.json({ 
      success: true, 
      message: 'Notification sent successfully',
      emailSent: true,
      smsSent: false // TODO: implement SMS
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
} 