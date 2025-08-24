"use client";

import { useState, useEffect, Suspense } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

interface Booking {
  id: number;
  bookingNumber: string; // Stable booking number (UTC-XXXXXXX)
  name: string;
  email: string;
  purpose: string;
  eventName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  attendance: number;
  totalPrice: number;
  bookingStatus: string;
  statusReason?: string;
  paymentStatus?: string;
  facility: {
    name: string;
  };
  createdAt: string;
  processedAt?: string;
}

function BookingStatusContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Payment upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Auto-populate from URL params
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const bookingParam = searchParams.get('booking');
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    if (bookingParam) {
      setBookingId(bookingParam);
    }
    
    // Auto-search if both params are present
    if (emailParam && bookingParam) {
      handleAutoSearch(decodeURIComponent(emailParam), bookingParam);
    }
  }, [searchParams]);

  const handleAutoSearch = async (emailValue: string, bookingValue: string) => {
    setLoading(true);
    setError('');
    setBooking(null);

    try {
      const response = await fetch(
        `/api/bookings/search?email=${encodeURIComponent(emailValue)}&id=${bookingValue}`
      );

      if (!response.ok) {
        throw new Error('Tempahan tidak dijumpai');
      }

      const data = await response.json();
      setBooking(data.booking);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ralat semasa mencari tempahan');
    } finally {
      setLoading(false);
    }
  };

  const searchBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAutoSearch(email, bookingId);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (images and PDFs)
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setUploadError('Sila pilih fail gambar (JPG, PNG) atau PDF sahaja');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Saiz fail tidak boleh melebihi 5MB');
        return;
      }
      
      setUploadFile(file);
      setUploadError('');
    }
  };

  const submitPaymentProof = async () => {
    if (!uploadFile || !booking) return;

    setUploadLoading(true);
    setUploadError('');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('bookingId', booking.bookingNumber);
      formData.append('email', booking.email);
      formData.append('paymentProof', uploadFile);

      const response = await fetch('/api/bookings/payment-upload', {
        method: 'POST',
        body: formData, // Send as FormData, don't set Content-Type header
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ralat semasa memuat naik bukti pembayaran');
      }

      setUploadSuccess(true);
      setUploadFile(null);
      
      // Refresh booking data
      await handleAutoSearch(email, bookingId);
      
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Ralat semasa memuat naik');
    } finally {
      setUploadLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'AWAITING PAYMENT':
      case 'AWAITING_PAYMENT': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REVIEW PAYMENT':
      case 'REVIEW_PAYMENT': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'UNPAID': return 'bg-red-100 text-red-800';
      case 'REFUNDED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>;
      case 'APPROVED':
        return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
      case 'REJECTED':
        return <div className="w-3 h-3 bg-red-500 rounded-full"></div>;
      case 'CANCELLED':
        return <div className="w-3 h-3 bg-gray-500 rounded-full"></div>;
      case 'AWAITING PAYMENT':
      case 'AWAITING_PAYMENT':
        return <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>;
      case 'REVIEW PAYMENT':
      case 'REVIEW_PAYMENT':
        return <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>;
      default:
        return <div className="w-3 h-3 bg-gray-300 rounded-full"></div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {searchParams.get('booking') ? 'Muat Naik Bukti Pembayaran' : 'Semak Status Tempahan'}
          </h1>
          <p className="text-gray-600">
            {searchParams.get('booking') 
              ? 'Muat naik bukti pembayaran untuk mengesahkan tempahan anda'
              : 'Masukkan email dan ID tempahan untuk melihat status terkini'
            }
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={searchBooking} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Alamat Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="contoh@email.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="bookingId" className="block text-sm font-medium text-gray-700 mb-2">
                  ID Tempahan
                </label>
                <input
                  type="text"
                  id="bookingId"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="cth: 12345"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Mencari...
                </div>
              ) : (
                'Cari Tempahan'
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Details */}
        {booking && (
          <div className="bg-card rounded-lg shadow-md overflow-hidden">
            {/* Header with Status */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Tempahan {booking.bookingNumber}
                  </h2>
                  <p className="text-blue-100">{booking.eventName}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(booking.bookingStatus)}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(booking.bookingStatus)}`}>
                    {booking.bookingStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Booking Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Maklumat Tempahan
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Pemohon</label>
                      <p className="text-gray-900">{booking.name}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fasiliti</label>
                      <p className="text-gray-900">{booking.facility?.name || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tujuan</label>
                      <p className="text-gray-900">{booking.purpose}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tarikh Mula</label>
                        <p className="text-gray-900">
                          {format(new Date(booking.startDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tarikh Tamat</label>
                        <p className="text-gray-900">
                          {format(new Date(booking.endDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Masa Mula</label>
                        <p className="text-gray-900">{booking.startTime?.slice(0, 5) || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Masa Tamat</label>
                        <p className="text-gray-900">{booking.endTime?.slice(0, 5) || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Bilangan Kehadiran</label>
                      <p className="text-gray-900">{booking.attendance} orang</p>
                    </div>
                  </div>
                </div>

                {/* Status & Payment Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Status & Pembayaran
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status Tempahan</label>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusIcon(booking.bookingStatus)}
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(booking.bookingStatus)}`}>
                          {booking.bookingStatus}
                        </span>
                      </div>
                    </div>

                    {booking.paymentStatus && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status Pembayaran</label>
                        <span className={`inline-block px-2 py-1 rounded text-sm font-medium mt-1 ${getPaymentStatusColor(booking.paymentStatus)}`}>
                          {booking.paymentStatus}
                        </span>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Jumlah Bayaran</label>
                      <p className="text-xl font-bold text-green-600">
                        RM {booking.totalPrice?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tarikh Tempahan</label>
                      <p className="text-gray-900">
                        {format(new Date(booking.createdAt), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>

                    {booking.processedAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tarikh Diproses</label>
                        <p className="text-gray-900">
                          {format(new Date(booking.processedAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    )}

                    {booking.statusReason && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Sebab/Catatan</label>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded border">
                          {booking.statusReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Tempahan Dihantar</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(booking.createdAt), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  
                  {booking.processedAt && (
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        booking.bookingStatus === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium">
                          Tempahan {booking.bookingStatus === 'APPROVED' ? 'Diluluskan' : 'Ditolak'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(booking.processedAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {booking.bookingStatus === 'APPROVED' && (
                <div className="mt-6 pt-4 border-t flex space-x-3">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Muat Turun Surat Kelulusan
                  </button>
                  <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                    Hubungi Pentadbiran
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Upload Section */}
        {booking && (booking.bookingStatus === 'AWAITING PAYMENT' || booking.bookingStatus === 'AWAITING_PAYMENT') && (
          <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Muat Naik Bukti Pembayaran
              </h2>
              <p className="text-blue-100 mt-1">
                Tempahan anda telah diluluskan. Sila muat naik bukti pembayaran untuk mengesahkan tempahan.
              </p>
            </div>

            <div className="p-6">
              {/* Payment Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">💳 Maklumat Pembayaran</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-2">Maklumat Bank:</h4>
                    <div className="space-y-1 text-sm text-blue-700">
                      <p><strong>Bank:</strong> CIMB Bank</p>
                      <p><strong>No. Akaun:</strong> 8006326050</p>
                      <p><strong>Nama:</strong> Perbadanan Kemajuan Ekonomi Negeri Perlis</p>
                      <p><strong>Jumlah:</strong> <span className="text-lg font-bold text-green-600">RM {booking.totalPrice?.toFixed(2) || '0.00'}</span></p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-blue-800 mb-2">Kod QR untuk Pembayaran:</p>
                    <Image
                      fill
                      src="/qr.png" 
                      alt="QR Code untuk Pembayaran" 
                      className="max-w-40 h-auto border-2 border-blue-300 rounded-lg mx-auto"
                    />
                    <p className="text-xs text-blue-600 mt-2">Imbas kod QR untuk pembayaran pantas</p>
                  </div>
                </div>
              </div>

              {/* Success Message */}
              {uploadSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-green-800 font-semibold">Bukti pembayaran berjaya dimuat naik!</p>
                      <p className="text-green-700 text-sm mt-1">
                        Tempahan anda kini dalam status "REVIEW PAYMENT". Kami akan mengesahkan pembayaran dalam masa 1-2 hari bekerja.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Error */}
              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-red-800">{uploadError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* File Upload */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Bukti Pembayaran
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={handleFileUpload}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Format yang diterima: JPG, PNG, PDF (Maksimum 5MB)
                  </p>
                </div>

                {uploadFile && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-gray-700">{uploadFile.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        onClick={() => setUploadFile(null)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={submitPaymentProof}
                  disabled={!uploadFile || uploadLoading}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploadLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Memuat naik...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Hantar Bukti Pembayaran
                    </div>
                  )}
                </button>
              </div>

              {/* Important Notes */}
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-yellow-800 font-semibold mb-2">⚠️ Penting:</h4>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• Pastikan bukti pembayaran jelas dan lengkap</li>
                  <li>• Jumlah pembayaran mesti tepat dengan jumlah yang dinyatakan</li>
                  <li>• Bukti pembayaran akan disemak dalam tempoh 1-2 hari bekerja</li>
                  <li>• Anda akan menerima notifikasi melalui email setelah pembayaran disahkan</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Review Payment Status */}
        {booking && (booking.bookingStatus === 'REVIEW PAYMENT' || booking.bookingStatus === 'REVIEW_PAYMENT') && (
          <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pembayaran Sedang Disemak
              </h2>
            </div>
            <div className="p-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-purple-800">
                  <strong>Status:</strong> Bukti pembayaran anda telah diterima dan sedang dalam proses semakan.
                </p>
                <p className="text-purple-700 mt-2 text-sm">
                  Kami akan mengesahkan pembayaran dalam tempoh 1-2 hari bekerja. 
                  Anda akan menerima notifikasi melalui email setelah pembayaran disahkan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Perlukan Bantuan?
          </h3>
          <p className="text-blue-800 mb-4">
            Jika anda menghadapi masalah atau mempunyai pertanyaan mengenai tempahan anda, 
            sila hubungi pihak pentadbiran.
          </p>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <a
              href="tel:04-XXX-XXXX"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Hubungi Telefon
            </a>
            <a
              href="mailto:admin@utcperlis.edu.my"
              className="inline-flex items-center px-4 py-2 bg-background text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Hantar Email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingStatus() {
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
      <BookingStatusContent />
    </Suspense>
  );
} 