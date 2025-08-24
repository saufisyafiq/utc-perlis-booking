import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FaMapMarkerAlt, FaUsers, FaClock, FaArrowLeft } from 'react-icons/fa';
import { MdMeetingRoom } from 'react-icons/md';
import HeroImage from '@/app/components/HeroImage';
import BookingButton from '@/app/components/BookingButton';

interface Rate {
  hourlyRate: number;
  fullDayRate: number;
  halfDayRate: number;
}

async function getFacility(documentId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/facilities?filters[documentId][$eq]=${documentId}&populate=*`, {
    cache: 'no-store'
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch facility');
  }
  
  const data = await res.json();
  
  if (!data.data || data.data.length === 0) {
    notFound();
  }
  
  return data.data[0];
}

  /**
   * Renders a facility detail page.
   * 
   * This page shows the facility's details, including its name, location, capacity, type, amenities, equipment rates, 
   * minimum duration, guidelines, and pricing information.
   * 
   * The page also includes a booking button that allows users to book the facility.
   * 
   * @param {Object} params - An object containing the facility ID as a string.
   * @returns {JSX.Element} - The facility detail page.
   */
export default async function FacilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const facility = await getFacility(id);

  return (
    <div className="min-h-screen bg-gray-50 py-32">
      <div className="max-w-7xl mx-auto px-4">
        {/* Back Button */}
        <Link 
          href="/fasiliti"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
        >
          <FaArrowLeft className="text-sm" />
          Kembali ke Fasiliti
        </Link>

        {/* Main Content */}
        <div className="bg-card rounded-xl shadow-lg overflow-hidden">
          {/* Hero Image */}
          <HeroImage
            imageUrl={`${process.env.NEXT_PUBLIC_STRAPI_API_URL}${facility.image[0].url}`}
            alt={facility.name}
          />

          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-8">
                {/* Title and Basic Info */}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{facility.name}</h1>
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaMapMarkerAlt className="text-blue-500" />
                      <span>{facility.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaUsers className="text-blue-500" />
                      <span>Kapasiti {facility.capacity} orang</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MdMeetingRoom className="text-blue-500" />
                      <span>
                        {facility.type === 'MEETING_ROOM'
                          ? 'Bilik Mesyuarat'
                          : facility.type === 'SEMINAR_ROOM'
                            ? 'Bilik Seminar'
                            : 'Dewan'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Kemudahan</h2>
                  <ul className="grid grid-cols-2 gap-3">
                    {facility.amenities.map((amenity: string, index: number) => (
                      <li key={index} className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Equipment Rates */}
                {facility.equipmentRates && Object.keys(facility.equipmentRates).length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Peralatan Tambahan</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(facility.equipmentRates as Record<string, number>).map(([name, price]) => (
                        <div key={name} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <span className="text-gray-600">{name}</span>
                          <span className="font-semibold">RM {price}/HARI</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

<div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Tempoh Minimum</h2>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaClock className="text-blue-500" />
                    <span>Minimum {facility.minimumDuration} jam sewaan</span>
                  </div>
                </div>

                {/* Guidelines */}
                {facility.guidelines && facility.guidelines.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Panduan</h2>
                    <div className="bg-yellow-50 rounded-xl p-6">
                      <ul className="space-y-4">
                        {facility.guidelines.map((guideline: string, index: number) => (
                          <li key={index} className="flex gap-3">
                            <span className="flex-shrink-0 font-semibold text-gray-900">{index + 1}.</span>
                            <span className="text-gray-600">{guideline}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Minimum Duration */}
                
              </div>

              {/* Right Column - Pricing Card */}
              <div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Kadar Sewaan</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Setiap Jam</span>
                      <span className="text-lg font-semibold">RM {facility.rates.hourlyRate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Separuh Hari</span>
                      <span className="text-lg font-semibold">RM {facility.rates.halfDayRate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Satu Hari</span>
                      <span className="text-lg font-semibold">RM {facility.rates.fullDayRate}</span>
                    </div>
                  </div>

                  <div className="mt-8">
                    <BookingButton facilityId={id} />
                  </div>

                  <p className="mt-4 text-sm text-gray-500 text-center">
                    * Tertakluk kepada terma dan syarat
                  </p>
                </div>

                {/* Facility Status */}
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      facility.facilityStatus === 'AVAILABLE' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {facility.facilityStatus === 'AVAILABLE' ? 'Tersedia' : 'Tidak Tersedia'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
