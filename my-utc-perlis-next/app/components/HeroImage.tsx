'use client';

import Image from 'next/image';
import { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import ImageModal from './ImageModal';

interface HeroImageProps {
  imageUrl: string;
  alt: string;
}

const HeroImage = ({ imageUrl, alt }: HeroImageProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div 
        className="relative h-[400px] w-full cursor-pointer group"
        onClick={() => setIsModalOpen(true)}
      >
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-cover"
        />
        {/* Overlay with zoom icon */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <FaSearch className="text-white h-8 w-8" />
        </div>
      </div>

      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={imageUrl}
        alt={alt}
      />
    </>
  );
};

export default HeroImage;
