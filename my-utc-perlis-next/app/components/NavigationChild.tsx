'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const NavigationChild = () => {
  const pathname = usePathname();

  const getLinkClasses = (path: string) => {
    const isActive = pathname === path;
    const baseClasses = 'font-medium transition-colors relative';
    const colorClasses = 'text-black hover:text-black';
    const activeClasses = isActive
      ? 'after:content-[""] after:absolute after:left-0 after:bottom-[-6px] after:w-full after:h-0.5 after:bg-current'
      : '';

    return `${baseClasses} ${colorClasses} ${activeClasses}`;
  };

  return (
    <nav className="fixed w-full top-0 z-[100] bg-background shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo in center */}
          <div className="flex-1 flex justify-center">
            <div className="flex space-x-8 items-center">
              <Link href="/" className={getLinkClasses('/')}>
                UTAMA
              </Link>
              <Link href="/fasiliti" className={getLinkClasses('/fasiliti')}>
                FASILITI
              </Link>
            </div>
          </div>

          {/* UTC Logo */}
          <div className="flex-1 flex justify-center">
            <Link href="/" className="relative w-24 h-16">
              <Image src="/logo-utc-perlis.png" alt="UTC Logo" fill className="object-contain" />
            </Link>
          </div>

          {/* Right side links */}
          <div className="flex-1 flex justify-center">
            <div className="flex space-x-8 items-center">
              <Link href="/services" className={getLinkClasses('/services')}>
                SERVIS
              </Link>
              <Link href="/hebahan" className={getLinkClasses('/hebahan')}>
                HEBAHAN
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationChild;
