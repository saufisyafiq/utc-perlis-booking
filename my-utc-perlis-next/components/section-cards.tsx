"use client";

import { useState, useEffect } from "react";
import { TrendingDownIcon, TrendingUpIcon, AlertCircleIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface BookingStats {
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  rejectedBookings: number;
  totalRevenue: number;
}

export function SectionCards() {
  const [stats, setStats] = useState<BookingStats>({
    totalBookings: 0,
    pendingBookings: 0,
    approvedBookings: 0,
    rejectedBookings: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookingStats = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings?populate=facility`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch bookings');

        const data = await response.json();
        const bookings = data.data || [];

        const calculatedStats = {
          totalBookings: bookings.length,
          pendingBookings: bookings.filter((b: any) => b.bookingStatus === 'PENDING').length,
          approvedBookings: bookings.filter((b: any) => b.bookingStatus === 'APPROVED').length,
          rejectedBookings: bookings.filter((b: any) => b.bookingStatus === 'REJECTED').length,
          totalRevenue: bookings
            .filter((b: any) => b.bookingStatus === 'APPROVED')
            .reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0),
        };

        setStats(calculatedStats);
      } catch (error) {
        console.error('Error fetching booking stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 px-4 lg:px-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="shadow-sm bg-gradient-to-t from-primary/5 to-card">
            <CardHeader className="relative">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 px-4 lg:px-6">
      {/* Total Bookings */}
      <Card className="shadow-sm bg-gradient-to-t from-primary/5 to-card">
        <CardHeader className="relative">
          <CardDescription>Jumlah Tempahan</CardDescription>
          <CardTitle className="text-2xl xl:text-3xl font-semibold tabular-nums">
            {stats.totalBookings}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="text-muted-foreground">
            Semua tempahan dalam sistem
          </div>
        </CardFooter>
      </Card>

      {/* Pending Bookings - Highlighted for attention */}
      <Card className={`shadow-sm transition-all ${
        stats.pendingBookings > 0 
          ? 'bg-gradient-to-t from-yellow-50 to-yellow-100 border-yellow-200 shadow-lg' 
          : 'bg-gradient-to-t from-primary/5 to-card'
      }`}>
        <CardHeader className="relative">
          <CardDescription className="flex items-center gap-1">
            {stats.pendingBookings > 0 && <AlertCircleIcon className="h-4 w-4 text-yellow-600" />}
            Menunggu Kelulusan
          </CardDescription>
          <CardTitle className={`text-2xl xl:text-3xl font-semibold tabular-nums ${
            stats.pendingBookings > 0 ? 'text-yellow-700' : ''
          }`}>
            {stats.pendingBookings}
          </CardTitle>
          {stats.pendingBookings > 0 && (
            <div className="absolute right-4 top-4">
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                Perlu Tindakan
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          {stats.pendingBookings > 0 ? (
            <div className="flex items-center gap-1 font-medium text-yellow-700">
              <AlertCircleIcon className="h-4 w-4" />
              Memerlukan kelulusan segera
            </div>
          ) : (
            <div className="text-muted-foreground">
              Tiada tempahan menunggu
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Approved Bookings */}
      <Card className="shadow-sm bg-gradient-to-t from-green-50 to-green-100 border-green-200">
        <CardHeader className="relative">
          <CardDescription>Diluluskan</CardDescription>
          <CardTitle className="text-2xl xl:text-3xl font-semibold tabular-nums text-green-700">
            {stats.approvedBookings}
          </CardTitle>
          {stats.approvedBookings > 0 && (
            <div className="absolute right-4 top-4">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                <TrendingUpIcon className="size-3 mr-1" />
                Aktif
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="text-green-700 font-medium">
            Tempahan yang sah
          </div>
        </CardFooter>
      </Card>

      {/* Rejected Bookings */}
      <Card className="shadow-sm bg-gradient-to-t from-red-50 to-red-100 border-red-200">
        <CardHeader className="relative">
          <CardDescription>Ditolak</CardDescription>
          <CardTitle className="text-2xl xl:text-3xl font-semibold tabular-nums text-red-700">
            {stats.rejectedBookings}
          </CardTitle>
          {stats.rejectedBookings > 0 && (
            <div className="absolute right-4 top-4">
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                <TrendingDownIcon className="size-3 mr-1" />
                Ditolak
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="text-red-700 font-medium">
            Tempahan tidak diluluskan
          </div>
        </CardFooter>
      </Card>

      {/* Total Revenue */}
      <Card className="shadow-sm bg-gradient-to-t from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="relative">
          <CardDescription>Jumlah Hasil</CardDescription>
          <CardTitle className="text-2xl xl:text-3xl font-semibold tabular-nums text-blue-700">
            RM {stats.totalRevenue.toFixed(2)}
          </CardTitle>
          {stats.totalRevenue > 0 && (
            <div className="absolute right-4 top-4">
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                <TrendingUpIcon className="size-3 mr-1" />
                Hasil
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="text-blue-700 font-medium">
            Dari tempahan diluluskan
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
