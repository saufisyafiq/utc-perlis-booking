'use client';

import { useRouter } from 'next/navigation';

interface BookingButtonProps {
  facilityId: string;
  facilityType?: string;
}

export default function BookingButton({ facilityId, facilityType }: BookingButtonProps) {
  const router = useRouter();

  const handleBooking = () => {
    // Route to sport booking page if facility type is SPORT
    if (facilityType === 'SPORT') {
      router.push(`/tempahan/sport?facilityId=${facilityId}`);
    } else {
      // Default to regular booking page
      router.push(`/tempahan?facilityId=${facilityId}`);
    }
  };

  return (
    <button 
      onClick={handleBooking}
      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
    >
      Tempah Sekarang
    </button>
  );
}
