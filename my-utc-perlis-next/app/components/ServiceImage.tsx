'use client';

import Image from 'next/image';

interface ServiceImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}

export default function ServiceImage({ src, alt, className, sizes }: ServiceImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = '/hero-utc.jpg'; // Fallback image
      }}
    />
  );
}
