import { NextRequest, NextResponse } from 'next/server';

interface PaymentApprovalRequest {
  email: string;
  name: string;
  bookingId: string; // Now accepts booking number (UTC-YYYY-NNNN) or numeric ID
  eventName: string;
  startDate: string;
  totalPrice: number;
  facility: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentApprovalRequest = await request.json();
    const { email, name, bookingId, eventName, startDate, totalPrice, facility } = body;

    // Validate required fields
    if (!email || !name || !bookingId || !eventName || !startDate || !totalPrice || !facility) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Format date for display
    const formattedDate = new Date(startDate).toLocaleDateString('ms-MY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create payment upload link
    const paymentUploadLink = `${process.env.NEXT_PUBLIC_SITE_URL}/tempahan/status?booking=${bookingId}&email=${encodeURIComponent(email)}`;

    // Email template for payment approval
    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tempahan Diluluskan - Sila Buat Pembayaran</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px 20px; border-radius: 0 0 10px 10px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .payment-section { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #4CAF50; }
            .payment-button { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
            .bank-details { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .important-note { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Tempahan Anda Telah Diluluskan!</h1>
              <p>Sila buat pembayaran untuk mengesahkan tempahan</p>
            </div>
            
            <div class="content">
              <p>Assalamualaikum dan salam sejahtera <strong>${name}</strong>,</p>
              
              <p>Kami dengan gembira memaklumkan bahawa tempahan fasiliti anda telah <strong>DILULUSKAN</strong> oleh pihak pengurusan.</p>
              
              <div class="booking-details">
                <h3 style="margin-top: 0; color: #667eea;">📋 Butiran Tempahan</h3>
                <div class="detail-row">
                  <span class="detail-label">No. Tempahan:</span>
                  <span class="detail-value">${bookingId}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Nama Acara:</span>
                  <span class="detail-value">${eventName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Fasiliti:</span>
                  <span class="detail-value">${facility}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Tarikh:</span>
                  <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Jumlah Bayaran:</span>
                  <span class="detail-value" style="font-size: 18px; font-weight: bold; color: #4CAF50;">RM ${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div class="payment-section">
                <h3 style="margin-top: 0; color: #2e7d32;">💳 Maklumat Pembayaran</h3>
                <p><strong>Langkah seterusnya:</strong> Sila buat pembayaran mengikut jumlah yang dinyatakan dan muat naik bukti pembayaran.</p>
                
                <div class="bank-details">
                  <h4>Maklumat Bank:</h4>
                  <div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 250px;">
                      <p><strong>Nama Bank:</strong> CIMB Bank</p>
                      <p><strong>No. Akaun:</strong> 8006326050</p>
                      <p><strong>Nama Pemegang Akaun:</strong> Perbadanan Kemajuan Ekonomi Negeri Perlis</p>
                      <p><strong>Jumlah:</strong> RM ${totalPrice.toFixed(2)}</p>
                    </div>
                    <div style="text-align: center; min-width: 200px;">
                      <p><strong>Kod QR untuk Pembayaran:</strong></p>
                      <Image src="${process.env.NEXT_PUBLIC_SITE_URL}/qr.png" alt="QR Code untuk Pembayaran" style="max-width: 200px; height: auto; border: 2px solid #ddd; border-radius: 8px; margin: 10px 0;" />
                      <p style="font-size: 12px; color: #666; margin-top: 10px;">Imbas kod QR ini untuk pembayaran pantas</p>
                    </div>
                  </div>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                  <a href="${paymentUploadLink}" class="payment-button">
                    📤 Muat Naik Bukti Pembayaran
                  </a>
                </div>
              </div>

              <div class="important-note">
                <h4 style="margin-top: 0;">⚠️ Penting:</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Sila buat pembayaran dalam tempoh <strong>7 hari</strong> dari tarikh email ini</li>
                  <li>Muat naik bukti pembayaran yang jelas dan lengkap</li>
                  <li>Tempahan akan dibatalkan jika pembayaran tidak dibuat dalam tempoh yang ditetapkan</li>
                  <li>Untuk sebarang pertanyaan, sila hubungi kami di <strong>010-510 5130</strong></li>
                </ul>
              </div>

              <p>Terima kasih atas pemilihan anda terhadap fasiliti UTC Perlis.</p>
              
              <p>Sekian, terima kasih.</p>
              
              <div class="footer">
                <p><strong>Pusat Transformasi Bandar (UTC) Perlis,</strong><br>
                Jalan Seri Sena, 01000 Kangar Perlis.<br>
                Tel: 010-510 5130 | Email: utcperlis09@gmail.com</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email directly using nodemailer
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
        to: email,
        subject: `Tempahan Diluluskan - Sila Buat Pembayaran #${bookingId}`,
        html: emailHTML,
      });
      
      console.log('✅ Payment approval email sent successfully to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      // Continue execution even if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Payment approval notification sent successfully',
      data: {
        bookingId,
        email,
        paymentUploadLink
      }
    });

  } catch (error) {
    console.error('Error sending payment approval notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
