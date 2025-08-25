import Link from 'next/link';
import { FaMapMarkerAlt, FaPhone, FaGlobe, FaArrowLeft } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ServiceImage from '../../components/ServiceImage';

interface Shift {
  id: number;
  startTime: string;
  endTime: string;
  isRest: boolean;
}

interface OperatingSchedule {
  id: number;
  dayRange: string;
  scheduleShift: Shift[];
}

const formatTime = (time: string) => {
  const [hours] = time.split(':');
  const hour = parseInt(hours);
  if (hour < 12) {
    return `${hour}:00 PG`;
  } else if (hour === 12) {
    return `${hour}:00 TGH`;
  } else if (hour > 12 && hour < 18) {
    return `${hour - 12}:00 PTG`;
  } else {
    return `${hour - 12}:00 MLM`;
  }
};



async function getService(documentId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/services?filters[documentId][$eq]=${documentId}&populate[operatingHours][populate][scheduleShift]=*&populate=image`, {
    cache: 'no-store'
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch service');
  }
  
  const data = await res.json();
  
  if (!data.data || data.data.length === 0) {
    notFound();
  }
  
  return data.data[0];
}

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getService(id);
  

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
        >
          <FaArrowLeft className="text-sm" />
          Kembali
        </Link>

        {/* Main Content */}
        <div className="bg-card rounded-xl shadow-lg overflow-hidden">
          {/* Hero Image */}
          {service.image && service.image.length > 0 && (
            <div className="relative h-64 w-full">
              <ServiceImage
                src={`${process.env.NEXT_PUBLIC_STRAPI_API_URL}${service.image[0].url}`}
                alt={service.name}
                className="object-cover rounded-t-xl"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          )}

          <div className="p-8">
            {/* Title and Location */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{service.name}</h1>
            <div className="flex items-center gap-2 text-gray-600 mb-6">
              <FaMapMarkerAlt className="text-blue-500" />
              <span>{service.location}</span>
            </div>

            {/* Description */}
            <div className="prose max-w-none mb-8">
              <p className="text-gray-600">{service.description}</p>
            </div>

            {/* Operating Hours */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Waktu Operasi</h2>
              <div className="space-y-4">
                {service.operatingHours.map((schedule: OperatingSchedule) => (
                  <div key={schedule.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="font-medium text-gray-800 mb-2">{schedule.dayRange}</div>
                    <div className="pl-4 space-y-1">
                      {schedule.scheduleShift
                        .sort((a: Shift, b: Shift) => {
                          if (a.isRest && !b.isRest) return 1;
                          if (!a.isRest && b.isRest) return -1;
                          return a.startTime.localeCompare(b.startTime);
                        })
                        .map((shift: Shift) => (
                          <div 
                            key={shift.id}
                            className={`${
                              shift.isRest 
                                ? 'text-orange-600 italic' 
                                : 'text-gray-600'
                            }`}
                          >
                            {shift.isRest ? '• Rehat: ' : '• '}
                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                          </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Maklumat Hubungan</h2>
              <div className="space-y-3">
                {service.phoneNumber && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <FaPhone className="text-blue-500" />
                    <span>{service.phoneNumber}</span>
                  </div>
                )}
                {service.email && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <MdEmail className="text-blue-500" />
                    <span>{service.email}</span>
                  </div>
                )}
                {service.website && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <FaGlobe className="text-blue-500" />
                    <a 
                      href={service.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {service.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
