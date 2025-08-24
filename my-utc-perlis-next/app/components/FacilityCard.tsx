import Image from 'next/image';
import Link from 'next/link';
import { FaMapMarkerAlt, FaUserFriends } from 'react-icons/fa';

interface FacilityCardProps {
  title: string;
  location: string;
  capacity: number;
  price: number;
  imageUrl: string;
  documentId: string;
}

const FacilityCard = ({
  title,
  location,
  capacity,
  price,
  imageUrl,
  documentId
}: FacilityCardProps) => {
  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <Link href={`/fasiliti/${documentId}`}>
        <div className="relative">
          {/* Image container */}
          <div className="relative h-64 w-full">
            <img
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
            />
          </div>
        </div>

        <div className="p-6">
          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
          
          {/* Meta information */}
          <div className="flex items-center gap-4 text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <FaMapMarkerAlt className="text-blue-500" />
              <span>{location}</span>
            </div>
          </div>

          {/* Capacity and Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-gray-600">
              <FaUserFriends className='h-7 w-7' />
              <span className="text-xl text-gray-900">{capacity}</span>
              <p className='text-gray-500'>pax</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900">RM{price}</span>
              <p className="text-sm text-gray-500">per jam</p>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default FacilityCard;
