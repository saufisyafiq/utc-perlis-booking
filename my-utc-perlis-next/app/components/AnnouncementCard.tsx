'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaCalendarAlt, FaTag } from 'react-icons/fa';

interface AnnouncementCardProps {
  title: string;
  date: string;
  category: string;
  description: string;
  imageUrl: string;
  href: string;
}

const AnnouncementCard = ({
  title,
  date,
  category,
  description,
  imageUrl,
  href
}: AnnouncementCardProps) => {
  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <Link href={href}>
        <div className="relative h-48 w-full">
          <img
            src={imageUrl}
            alt={title}
            
            className="object-cover"
          />
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-1">
              <FaCalendarAlt className="text-blue-600" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <FaTag className="text-blue-600" />
              <span>{category}</span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
            {title}
          </h3>
          
          <p className="text-gray-600 line-clamp-3">
            {description}
          </p>
        </div>
      </Link>
    </div>
  );
};

export default AnnouncementCard;
