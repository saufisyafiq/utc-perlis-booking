'use client';

import { useRouter } from 'next/navigation';

interface BookingButtonProps {
  facilityId: string;
}

export default function BookingButton({ facilityId }: BookingButtonProps) {
  const router = useRouter();

  const handleBooking = () => {
    router.push(`/tempahan?facilityId=${facilityId}`);
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
