"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  AlertCircleIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  EyeIcon,
  DownloadIcon,
  FilterIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from 'lucide-react';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Booking {
  id: number;
  documentId: string;
  bookingNumber: string; // Stable booking number (UTC-XXXXXXX)
  name: string;
  email: string;
  phoneNo: string;
  jabatan?: string;
  address?: string;
  purpose: string;
  eventName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  attendance: number;
  totalPrice: number;
  bookingStatus: 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVIEW PAYMENT';
  statusReason?: string;
  paymentStatus: 'PAID' | 'FAILED' | 'VERIFIED';
  packageType: 'HOURLY' | 'HALF_DAY' | 'FULL_DAY';
  facility: {
    id: number;
    documentId: string;
    name: string;
    location: string;
    capacity: number;
    type: string;
    amenities: string[];
    rates: {
      hourlyRate: number;
      fullDayRate: number;
      halfDayRate: number;
    };
    equipmentRates: {
      [key: string]: number;
    };
    guidelines: string[];
  };
  rentDetails?: {
    duration: string;
    additionalEquipment: Record<string, boolean>;
  };
  meal?: {
    breakfast?: boolean;
    lunch?: boolean;
    dinner?: boolean;
    supper?: boolean;
    mineralWater?: number;
  };
  createdAt: string;
  processedAt?: string;
  sessionId: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface BookingResponse {
  data: Booking[];
  meta: {
    pagination: PaginationMeta;
  };
}

interface BookingStats {
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  rejectedBookings: number;
  totalRevenue: number;
  todayBookings: number;
  weekBookings: number;
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  

  const [stats, setStats] = useState<BookingStats>({
    totalBookings: 0,
    pendingBookings: 0,
    approvedBookings: 0,
    rejectedBookings: 0,
    totalRevenue: 0,
    todayBookings: 0,
    weekBookings: 0,
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    page: 1,
    pageSize: 5,
    pageCount: 1,
    total: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  
  // Filters and search
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showEmailTestDialog, setShowEmailTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Debug function to test API connectivity
  const testAPIConnection = async () => {
    try {
      console.log('Testing API connection...');
      console.log('STRAPI URL:', process.env.NEXT_PUBLIC_STRAPI_API_URL);
      console.log('API Token exists:', !!process.env.STRAPI_API_TOKEN);
      
      // Test basic connectivity
      const testResponse = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings?pagination[pageSize]=1`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
          },
        }
      );
      
      console.log('Test response status:', testResponse.status);
      
      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log('Test response data:', data);
        alert('API connection successful!');
      } else {
        const errorText = await testResponse.text();
        console.error('Test API error:', errorText);
        alert(`API connection failed: ${testResponse.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('API test error:', error);
      alert(`API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Fetch bookings with pagination
  const fetchBookings = async (page = 1, status = 'ALL', search = '') => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (status !== 'ALL') {
        params.append('status', status);
      }
      
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/booking/all?${params.toString()}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch bookings');
      
      const result: BookingResponse = await response.json();
      
      console.log(`[INFO] Loaded ${result.data.length} bookings (page ${result.meta.pagination.page} of ${result.meta.pagination.pageCount}, total: ${result.meta.pagination.total})`);
      
      setBookings(result.data);
      setPaginationMeta(result.meta.pagination);
      
      // Calculate stats from current data
      const calculatedStats = calculateStats(result.data, result.meta.pagination.total);
      setStats(calculatedStats);
      
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats helper function
  const calculateStats = (currentBookings: Booking[], total: number): BookingStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // For current page stats
    const reviewCount = currentBookings.filter(b => b.bookingStatus === 'REVIEW PAYMENT').length;
    const approvedCount = currentBookings.filter(b => b.bookingStatus === 'APPROVED').length;
    const rejectedCount = currentBookings.filter(b => b.bookingStatus === 'REJECTED').length;
    const revenue = currentBookings
      .filter(b => b.bookingStatus === 'APPROVED')
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const todayCount = currentBookings.filter(b => 
      new Date(b.createdAt) >= today
    ).length;
    const weekCount = currentBookings.filter(b => 
      new Date(b.createdAt) >= weekAgo
    ).length;
    
    return {
      totalBookings: total,
      pendingBookings: reviewCount, // Now represents bookings under review
      approvedBookings: approvedCount,
      rejectedBookings: rejectedCount,
      totalRevenue: revenue,
      todayBookings: todayCount,
      weekBookings: weekCount,
    };
  };

  // Update booking status
  const updateBookingStatus = async (bookingId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      setActionLoading(bookingId);
      
      console.log('Updating booking:', bookingId, 'to', status);
      
      const updatePayload: {
        documentId: string;
        bookingStatus: string;
        statusReason?: string;
        processedAt: string;
        paymentStatus?: string;
      } = {
        documentId: bookingId,
        bookingStatus: status,
        statusReason: reason,
        processedAt: new Date().toISOString(),
      };

      // When approving a booking, keep payment status as VERIFIED
      // When rejecting a booking, set payment status to FAILED
      if (status === 'APPROVED') {
        updatePayload.paymentStatus = 'VERIFIED';
      } else if (status === 'REJECTED') {
        updatePayload.paymentStatus = 'FAILED';
      }
      
      const response = await fetch('/api/admin/bookings/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', errorData);
        throw new Error(`Failed to update booking: ${response.status} - ${errorData}`);
      }
      
      const result = await response.json();
      console.log('Update successful:', result);
      
      // Send notification (implement separately if needed)
      if (selectedBooking) {
        await sendStatusNotification(selectedBooking, status, reason);
      }
      
      // Refresh data
      await fetchBookings(currentPage, statusFilter, searchTerm);
      setSelectedBooking(null);
      setRejectionReason('');
      setShowRejectionDialog(false);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert(`Failed to update booking status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };


  // Test email functionality
  const handleTestEmail = async () => {
    if (!testEmail) {
      alert('Sila masukkan alamat email untuk ujian');
      return;
    }

    try {
      setActionLoading('test-email');
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: testEmail }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage(`Email ujian telah berjaya dihantar ke ${testEmail}. Sila semak peti masuk anda.`);
        setShowSuccessDialog(true);
        setShowEmailTestDialog(false);
        setTestEmail('');
      } else {
        alert(`Gagal menghantar email ujian: ${result.error}`);
      }
    } catch (error) {
      console.error('Test email error:', error);
      alert('Gagal menghantar email ujian');
    } finally {
      setActionLoading(null);
    }
  };


  const sendStatusNotification = async (booking: Booking, status: string, reason?: string) => {
    try {
      await fetch('/api/notifications/booking-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: booking.email,
          name: booking.name,
          bookingId: booking.bookingNumber,
          status,
          reason,
          eventName: booking.eventName,
          startDate: booking.startDate,
        }),
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };


  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchBookings(page, statusFilter, searchTerm);
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    fetchBookings(1, statusFilter, searchTerm);
  };

  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
    fetchBookings(1, status, searchTerm);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
      case 'REVIEW PAYMENT': return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircleIcon className="h-4 w-4" />;
      case 'REJECTED': return <XCircleIcon className="h-4 w-4" />;
      case 'REVIEW PAYMENT': return <EyeIcon className="h-4 w-4" />;
      default: return <AlertCircleIcon className="h-4 w-4" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'FAILED': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'PAID': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'VERIFIED': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pengurusan Tempahan</h1>
          <p className="text-muted-foreground">Urus dan pantau semua tempahan fasiliti</p>
        </div>
        <div className="flex gap-2">
          {/* <Button variant="outline" size="sm" onClick={testAPIConnection} className="text-foreground">
            🔍 Test API
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEmailTestDialog(true)} className="text-foreground">
            📧 Test Email
          </Button>
          <Button variant="outline" size="sm" className="text-foreground">
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export Data
          </Button> */}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-sm">Jumlah Tempahan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm flex items-center">
              <EyeIcon className="h-4 w-4 mr-1 text-purple-600 dark:text-purple-400" />
              Semakan Bayaran
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.pendingBookings}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600 dark:text-green-400" />
              Diluluskan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.approvedBookings}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm flex items-center">
              <XCircleIcon className="h-4 w-4 mr-1 text-red-600 dark:text-red-400" />
              Ditolak
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.rejectedBookings}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm flex items-center">
              <DownloadIcon className="h-4 w-4 mr-1 text-blue-600 dark:text-blue-400" />
              Jumlah Hasil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">RM {stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-sm">Hari Ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-sm">7 Hari Lepas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weekBookings}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cari nama, email, atau acara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={handleSearch} variant="default">
              <SearchIcon className="h-4 w-4 mr-2" />
              Cari
            </Button>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[150px]">
                <FilterIcon className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="REVIEW PAYMENT">Semakan Bayaran</SelectItem>
                <SelectItem value="APPROVED">Diluluskan</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
          <Card>
            <CardHeader>
          <CardTitle>Senarai Tempahan</CardTitle>
              <CardDescription>
            Paparan {paginationMeta.pageSize} daripada {paginationMeta.total} tempahan
              </CardDescription>
            </CardHeader>
            <CardContent>
                            {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : bookings.length === 0 ? (
                <div className="text-center py-12">
              <p className="text-muted-foreground">Tiada tempahan ditemui</p>
                </div>
              ) : (
                <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisasi/Jabatan</TableHead>
                    <TableHead>Pemohon</TableHead>
                    <TableHead>Fasiliti</TableHead>
                    <TableHead>Tarikh & Masa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-semibold">{booking.jabatan}</div>
                          <div className="text-sm text-muted-foreground">
                            No. Tempahan: {booking.bookingNumber || `#${booking.id}`}
                          </div>
                          </div>
                      </TableCell>
                      <TableCell>
                            <div>
                          <div className="font-medium">{booking.name}</div>
                          <div className="text-sm text-muted-foreground">{booking.email}</div>
                          <div className="text-sm text-muted-foreground">{booking.phoneNo}</div>
                            </div>
                      </TableCell>
                      <TableCell>
                            <div>
                          <div className="font-medium">{booking.facility.name}</div>
                          <div className="text-sm text-muted-foreground">Kedatangan: {booking.attendance} orang</div>
                            </div>
                      </TableCell>
                      <TableCell>
                            <div>
                          <div className="font-medium">{format(new Date(booking.startDate), 'dd/MM/yyyy')}</div>
                          <div className="text-sm text-muted-foreground">{booking.startTime?.slice(0, 5)} - {booking.endTime?.slice(0, 5)}</div>
                          
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(booking.bookingStatus)}>
                          {getStatusIcon(booking.bookingStatus)}
                          <span className="ml-1">{booking.bookingStatus}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">RM {booking.totalPrice?.toFixed(2)}</div>
                        <Badge variant="outline" className={getPaymentStatusColor(booking.paymentStatus)}>
                          {booking.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            Lihat
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Paparan {((currentPage - 1) * pageSize) + 1} hingga {Math.min(currentPage * pageSize, paginationMeta.total)} daripada{' '}
                  {paginationMeta.total} tempahan
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!paginationMeta.hasPrevPage || loading}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Sebelum
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, paginationMeta.pageCount) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {paginationMeta.pageCount > 5 && (
                      <>
                        <span>...</span>
                        <Button
                          variant={currentPage === paginationMeta.pageCount ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(paginationMeta.pageCount)}
                          disabled={loading}
                        >
                          {paginationMeta.pageCount}
                        </Button>
                      </>
                    )}
                  </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!paginationMeta.hasNextPage || loading}
                            >
                    Seterusnya
                    <ChevronRightIcon className="h-4 w-4" />
                            </Button>
                      </div>
                    </div>
                </div>
              )}
            </CardContent>
          </Card>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-background text-foreground">
            <DialogHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold">
                  Butiran Tempahan #{selectedBooking.bookingNumber}
                </DialogTitle>
                <Badge variant="outline" className={getStatusColor(selectedBooking.bookingStatus)}>
                  {getStatusIcon(selectedBooking.bookingStatus)}
                  <span className="ml-1">{selectedBooking.bookingStatus}</span>
                </Badge>
              </div>
              <DialogDescription className="text-base">
                {selectedBooking.eventName} - {selectedBooking.facility.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Primary Information Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Applicant Info Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircleIcon className="h-5 w-5 text-primary" />
                      Maklumat Pemohon
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nama:</span>
                        <span className="font-medium">{selectedBooking.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{selectedBooking.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Telefon:</span>
                        <span className="font-medium">{selectedBooking.phoneNo}</span>
                      </div>
                      {selectedBooking.jabatan && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Jabatan:</span>
                          <span className="font-medium">{selectedBooking.jabatan}</span>
                        </div>
                      )}
                      {selectedBooking.address && (
                        <div className="flex flex-col space-y-1">
                          <span className="text-muted-foreground">Alamat:</span>
                          <span className="font-medium text-sm">{selectedBooking.address}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Event Info Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClockIcon className="h-5 w-5 text-primary" />
                      Maklumat Acara
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nama Acara:</span>
                        <span className="font-medium">{selectedBooking.eventName}</span>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">Tujuan:</span>
                        <span className="font-medium text-sm">{selectedBooking.purpose}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kehadiran:</span>
                        <span className="font-medium">{selectedBooking.attendance} orang</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pakej:</span>
                        <Badge variant="secondary">{selectedBooking.packageType}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Facility and Schedule Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Facility Info Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <EyeIcon className="h-5 w-5 text-primary" />
                      Maklumat Fasiliti
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nama:</span>
                        <span className="font-medium">{selectedBooking.facility.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lokasi:</span>
                        <span className="font-medium">{selectedBooking.facility.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kapasiti:</span>
                        <span className="font-medium">{selectedBooking.facility.capacity} orang</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Jenis:</span>
                        <Badge variant="outline">{selectedBooking.facility.type}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Schedule Info Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClockIcon className="h-5 w-5 text-primary" />
                      Jadual Tempahan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tarikh Mula:</span>
                        <span className="font-medium">{format(new Date(selectedBooking.startDate), 'dd MMMM yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tarikh Tamat:</span>
                        <span className="font-medium">{format(new Date(selectedBooking.endDate), 'dd MMMM yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Masa:</span>
                        <span className="font-medium">{selectedBooking.startTime?.slice(0, 5)} - {selectedBooking.endTime?.slice(0, 5)}</span>
                      </div>
                      {selectedBooking.rentDetails && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tempoh:</span>
                          <span className="font-medium">{selectedBooking.rentDetails.duration}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DownloadIcon className="h-5 w-5 text-primary" />
                    Maklumat Kewangan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between p-4 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Jumlah Harga:</span>
                      <span className="font-bold text-lg">RM {selectedBooking.totalPrice?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-4 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Status Pembayaran:</span>
                      <Badge variant="outline" className={getPaymentStatusColor(selectedBooking.paymentStatus)}>
                        {selectedBooking.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Services */}
              {(selectedBooking.rentDetails?.additionalEquipment || selectedBooking.meal) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-primary" />
                      Perkhidmatan Tambahan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {selectedBooking.rentDetails?.additionalEquipment && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-foreground">Peralatan Tambahan</h4>
                          <div className="space-y-1">
                            {Object.entries(selectedBooking.rentDetails.additionalEquipment)
                              .filter(([_, selected]) => selected)
                              .map(([equipment, _]) => (
                                <div key={equipment} className="flex items-center gap-2">
                                  <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  <span className="text-sm">{equipment}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      {selectedBooking.meal && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-foreground">Makanan & Minuman</h4>
                          <div className="space-y-1">
                            {selectedBooking.meal.breakfast && (
                              <div className="flex items-center gap-2">
                                <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm">Makan Pagi</span>
                              </div>
                            )}
                            {selectedBooking.meal.lunch && (
                              <div className="flex items-center gap-2">
                                <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm">Makan Tengahari</span>
                              </div>
                            )}
                            {selectedBooking.meal.dinner && (
                              <div className="flex items-center gap-2">
                                <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm">Makan Petang</span>
                              </div>
                            )}
                            {selectedBooking.meal.supper && (
                              <div className="flex items-center gap-2">
                                <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm">Makan Malam</span>
                              </div>
                            )}
                            {selectedBooking.meal.mineralWater && (
                              <div className="flex items-center gap-2">
                                <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm">Air Mineral: {selectedBooking.meal.mineralWater} botol</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Status and Timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(selectedBooking.bookingStatus)}
                    Status Tempahan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-muted-foreground text-sm">Tarikh Permohonan</span>
                        <p className="font-medium">{format(new Date(selectedBooking.createdAt), 'dd MMMM yyyy, HH:mm')}</p>
                      </div>
                      {selectedBooking.processedAt && (
                        <div className="space-y-2">
                          <span className="text-muted-foreground text-sm">Tarikh Diproses</span>
                          <p className="font-medium">{format(new Date(selectedBooking.processedAt), 'dd MMMM yyyy, HH:mm')}</p>
                        </div>
                      )}
                    </div>
                    {selectedBooking.statusReason && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <span className="text-muted-foreground text-sm">
                          Sebab {selectedBooking.bookingStatus === 'REJECTED' ? 'Penolakan' : 'Status'}
                        </span>
                        <p className="font-medium mt-1">{selectedBooking.statusReason}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {selectedBooking.bookingStatus === 'REVIEW PAYMENT' && (
              <DialogFooter className="flex gap-4 pt-6 border-t">
                <Button
                  onClick={() => updateBookingStatus(selectedBooking.documentId, 'APPROVED')}
                  disabled={actionLoading === selectedBooking.documentId}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  {actionLoading === selectedBooking.documentId ? 'Memproses...' : 'Terima Tempahan'}
                </Button>
                
                <Button 
                  variant="destructive"
                  onClick={() => setShowRejectionDialog(true)}
                  disabled={actionLoading === selectedBooking.documentId}
                >
                  <XCircleIcon className="h-4 w-4 mr-2" />
                  Tolak Tempahan
                </Button>
              </DialogFooter>
            )}
            
            {selectedBooking.bookingStatus === 'APPROVED' && (
              <DialogFooter className="flex gap-4 pt-6 border-t">
                <Button 
                  variant="destructive"
                  onClick={() => setShowRejectionDialog(true)}
                  disabled={actionLoading === selectedBooking.documentId}
                >
                  <XCircleIcon className="h-4 w-4 mr-2" />
                  Batalkan Tempahan
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-md bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircleIcon className="h-5 w-5 text-destructive" />
              Tolak Tempahan
            </DialogTitle>
            <DialogDescription>
              Sila berikan sebab penolakan/pembatalan untuk tempahan ini. Sebab ini akan dihantar kepada pemohon melalui email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Sebab penolakan/pembatalan (contoh: Bukti pembayaran tidak sah, Fasiliti tidak tersedia, Pelanggaran terma dan syarat, dll.)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectionDialog(false);
                setRejectionReason('');
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (selectedBooking) {
                  updateBookingStatus(selectedBooking.documentId, 'REJECTED', rejectionReason);
                  setShowRejectionDialog(false);
                }
              }}
              disabled={!rejectionReason.trim() || actionLoading === selectedBooking?.documentId}
              variant="destructive"
            >
              <XCircleIcon className="h-4 w-4 mr-2" />
              {actionLoading === selectedBooking?.documentId ? 'Memproses...' : 
                (selectedBooking?.bookingStatus === 'APPROVED' ? 'Batalkan Tempahan' : 'Tolak Tempahan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              Berjaya!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Test Dialog */}
      <Dialog open={showEmailTestDialog} onOpenChange={setShowEmailTestDialog}>
        <DialogContent className="max-w-md bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📧 Ujian Email
            </DialogTitle>
            <DialogDescription>
              Masukkan alamat email untuk menguji konfigurasi SMTP. Email ujian akan dihantar untuk memastikan sistem email berfungsi dengan baik.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="test-email" className="text-sm font-medium">
                Alamat Email:
              </label>
              <Input
                id="test-email"
                type="email"
                placeholder="contoh@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                disabled={actionLoading === 'test-email'}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailTestDialog(false);
                setTestEmail('');
              }}
              disabled={actionLoading === 'test-email'}
            >
              Batal
            </Button>
            <Button
              onClick={handleTestEmail}
              disabled={actionLoading === 'test-email' || !testEmail.trim()}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              📧 {actionLoading === 'test-email' ? 'Menghantar...' : 'Hantar Email Ujian'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 