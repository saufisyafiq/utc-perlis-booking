import Image from 'next/image';
import Link from 'next/link';
import { FaMapMarkerAlt, FaArrowRight, FaClock } from 'react-icons/fa';

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

interface ServiceCardProps {
  name: string;
  location: string;
  description: string;
  imageUrl: string;
  href: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  operatingHours: OperatingSchedule[];
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

const ServiceCard = ({
  name,
  location,
  description,
  imageUrl,
  href,
  operatingHours
}: ServiceCardProps) => {
  // Get the first non-rest period from the first schedule
  const regularHours = operatingHours[0]?.scheduleShift.find(shift => !shift.isRest);
  
  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className="relative h-48 w-full">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
        />
      </div>

      <div className="p-6">
        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{name}</h3>
        
        {/* Location */}
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <FaMapMarkerAlt className="text-blue-500" />
          <span>{location}</span>
        </div>

        {/* Basic Operating Hours */}
        {/* {regularHours && (
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <FaClock className="text-blue-500" />
            <span>{formatTime(regularHours.startTime)} - {formatTime(regularHours.endTime)}</span>
          </div>
        )} */}

        {/* Description - Limited to 2 lines */}
        <p className="text-gray-600 text-sm mb-6 line-clamp-2">{description}</p>

        {/* View Details Link */}
        <div className="flex justify-end">
          <Link 
            href={href}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Selanjutnya
            <FaArrowRight className="text-sm" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
