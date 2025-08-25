
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface BookingDetails {
  bookingNumber: string;
  applicantName: string;
  email: string;
  eventName: string;
  facilityName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isPaymentFlow, setIsPaymentFlow] = useState(false);

  useEffect(() => {
    // Get booking details from URL parameters
    const bookingNumber = searchParams.get('bookingNumber');
    const applicantName = searchParams.get('name');
    const email = searchParams.get('email');
    const eventName = searchParams.get('eventName');
    const facilityName = searchParams.get('facility');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const totalPrice = searchParams.get('totalPrice');
    const paymentFlow = searchParams.get('paymentFlow');

    if (bookingNumber && applicantName && email) {
      setBookingDetails({
        bookingNumber,
        applicantName,
        email,
        eventName: eventName || 'Tidak dinyatakan',
        facilityName: facilityName || 'Tidak dinyatakan',
        startDate: startDate || '',
        endDate: endDate || '',
        startTime: startTime || '',
        endTime: endTime || '',
        totalPrice: totalPrice ? parseFloat(totalPrice) : 0
      });
      setIsPaymentFlow(paymentFlow === 'true');
    } else {
      setError('Maklumat tempahan tidak dijumpai. Sila hubungi pentadbir sistem.');
    }
    
    setIsLoading(false);
  }, [searchParams]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('ms-MY', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('ms-MY', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-lg text-gray-600">Memuat maklumat tempahan...</p>
      </div>
    );
  }

  if (error || !bookingDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
        <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ralat Berlaku
          </h2>
          <p className="text-gray-600 mb-8">
            {error || 'Tidak dapat memuat maklumat tempahan.'}
          </p>
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 transition-colors"
          >
            Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="bg-card rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-8 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-20 w-20 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {isPaymentFlow ? '🎉 Tempahan Berjaya! Sila Buat Pembayaran' : '🎉 Tempahan Berjaya Dihantar!'}
            </h1>
            <p className="text-green-100 text-lg">
              {isPaymentFlow 
                ? 'Tempahan anda telah berjaya diterima. Sila buat pembayaran untuk mengesahkan tempahan anda.'
                : 'Permohonan tempahan anda telah berjaya diterima dan sedang dalam proses semakan'
              }
            </p>
          </div>

          {/* Booking Number Highlight */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-blue-900">
                  Nombor Rujukan Tempahan
                </h3>
                <p className="text-2xl font-bold text-blue-600 mt-1 tracking-wider">
                  {bookingDetails.bookingNumber}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Sila simpan nombor ini untuk rujukan masa hadapan
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking Details */}
          <div className="bg-card rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="h-6 w-6 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Maklumat Tempahan
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Nama Pemohon:</span>
                <span className="font-medium text-gray-900">{bookingDetails.applicantName}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900">{bookingDetails.email}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Nama Acara:</span>
                <span className="font-medium text-gray-900">{bookingDetails.eventName}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Fasiliti:</span>
                <span className="font-medium text-gray-900">{bookingDetails.facilityName}</span>
              </div>
              
              {bookingDetails.startDate && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Tarikh Mula:</span>
                  <span className="font-medium text-gray-900">{formatDate(bookingDetails.startDate)}</span>
                </div>
              )}
              
              {bookingDetails.endDate && bookingDetails.endDate !== bookingDetails.startDate && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Tarikh Tamat:</span>
                  <span className="font-medium text-gray-900">{formatDate(bookingDetails.endDate)}</span>
                </div>
              )}
              
              {bookingDetails.startTime && bookingDetails.endTime && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Masa:</span>
                  <span className="font-medium text-gray-900">
                    {formatTime(bookingDetails.startTime)} - {formatTime(bookingDetails.endTime)}
                  </span>
                </div>
              )}
              
              {bookingDetails.totalPrice > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Jumlah Bayaran:</span>
                  <span className="font-bold text-green-600 text-lg">RM {bookingDetails.totalPrice.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-card rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="h-6 w-6 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Langkah Seterusnya
            </h2>
            
            <div className="space-y-4">
              {isPaymentFlow ? (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-medium text-yellow-800 mb-2">📧 Email Pembayaran</h3>
                    <p className="text-sm text-yellow-700">
                      Email arahan pembayaran telah dihantar ke <strong>{bookingDetails.email}</strong>. 
                      Sila semak kotak masuk anda untuk maklumat terperinci.
                    </p>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-medium text-red-800 mb-2">⚠️ Penting - Buat Pembayaran</h3>
                    <p className="text-sm text-red-700 mb-2">
                      Sila buat pembayaran dalam tempoh <strong>7 hari</strong> untuk mengesahkan tempahan anda.
                    </p>
                    <p className="text-sm text-red-700">
                      Tempahan akan dibatalkan secara automatik jika pembayaran tidak dibuat dalam tempoh yang ditetapkan.
                    </p>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-800 mb-2">💳 Muat Naik Bukti Pembayaran</h3>
                    <p className="text-sm text-green-700 mb-3">
                      Selepas membuat pembayaran, sila muat naik bukti pembayaran melalui sistem kami.
                    </p>
                    <Link
                      href={`/tempahan/status?booking=${bookingDetails.bookingNumber}&email=${encodeURIComponent(bookingDetails.email)}`}
                      className="inline-flex items-center bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Muat Naik Bukti Pembayaran
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-medium text-yellow-800 mb-2">📧 Pengesahan Email</h3>
                    <p className="text-sm text-yellow-700">
                      Email pengesahan telah dihantar ke <strong>{bookingDetails.email}</strong>. 
                      Sila semak kotak masuk anda.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-800 mb-2">⏳ Proses Semakan</h3>
                    <p className="text-sm text-blue-700">
                      Permohonan anda sedang dalam proses semakan oleh pihak pengurusan. 
                      Anda akan menerima notifikasi dalam tempoh 1-2 hari bekerja.
                    </p>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-800 mb-2">💳 Pembayaran</h3>
                    <p className="text-sm text-green-700">
                      Sekiranya tempahan diluluskan, anda akan menerima arahan pembayaran melalui email.
                    </p>
                  </div>
                </>
              )}
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">📞 Bantuan</h3>
                <p className="text-sm text-gray-700">
                  Sekiranya anda mempunyai pertanyaan, sila hubungi kami di <strong>010-510 5130</strong> 
                  dengan menyebut nombor rujukan: <strong>{bookingDetails.bookingNumber}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {isPaymentFlow ? (
            <>
              <Link
                href={`/tempahan/status?booking=${bookingDetails.bookingNumber}&email=${encodeURIComponent(bookingDetails.email)}`}
                className="flex items-center justify-center bg-green-600 text-white rounded-lg px-8 py-3 hover:bg-green-700 transition-colors font-medium"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Muat Naik Bukti Pembayaran
              </Link>
              
              <Link
                href="/"
                className="flex items-center justify-center bg-blue-600 text-white rounded-lg px-8 py-3 hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Kembali ke Halaman Utama
              </Link>
              
              <Link
                href="/fasiliti"
                className="flex items-center justify-center bg-gray-200 text-gray-700 rounded-lg px-8 py-3 hover:bg-gray-300 transition-colors font-medium"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Buat Tempahan Baru
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/"
                className="flex items-center justify-center bg-blue-600 text-white rounded-lg px-8 py-3 hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Kembali ke Halaman Utama
              </Link>
              
              <Link
                href="/fasiliti"
                className="flex items-center justify-center bg-gray-200 text-gray-700 rounded-lg px-8 py-3 hover:bg-gray-300 transition-colors font-medium"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Buat Tempahan Baru
              </Link>
              
              <Link
                href="/tempahan/status"
                className="flex items-center justify-center bg-green-600 text-white rounded-lg px-8 py-3 hover:bg-green-700 transition-colors font-medium"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Semak Status Tempahan
              </Link>
            </>
          )}
        </div>

        {/* Print/Save Instructions */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <h3 className="font-medium text-gray-800 mb-2">💾 Simpan Maklumat Ini</h3>
          <p className="text-sm text-gray-600 mb-4">
            Disyorkan untuk menyimpan halaman ini (Ctrl+S) atau mengambil tangkapan skrin 
            untuk rujukan masa hadapan.
          </p>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center bg-gray-600 text-white rounded-lg px-6 py-2 hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Cetak Halaman Ini
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Memuatkan...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}
