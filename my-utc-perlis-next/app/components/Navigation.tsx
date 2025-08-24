'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getLinkClasses = (path: string) => {
    const isActive = pathname === path;
    const baseClasses = 'font-medium transition-colors relative';
    const colorClasses = isScrolled
      ? 'text-gray-700 hover:text-blue-600'
      : 'text-white hover:text-blue-200';
    const activeClasses = isActive
      ? 'after:content-[""] after:absolute after:left-0 after:bottom-[-6px] after:w-full after:h-0.5 after:bg-current'
      : '';

    return `${baseClasses} ${colorClasses} ${activeClasses}`;
  };

  // Return a simpler version during SSR
  if (!isMounted) {
    return (
      <nav className="fixed w-full top-0 z-[100] bg-transparent">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 flex justify-center">
              <div className="flex space-x-8 items-center">
                <Link href="/" className="font-medium text-white">UTAMA</Link>
                <Link href="/fasiliti" className="font-medium text-white">FASILITI</Link>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <Link href="/" className="relative w-24 h-16">
                <img src="/logo-utc-perlis.png" alt="UTC Logo" fill className="object-contain" />
              </Link>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex space-x-8 items-center">
                <Link href="/services" className="font-medium text-white">SERVIS</Link>
                <Link href="/hebahan" className="font-medium text-white">HEBAHAN</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={`fixed w-full top-0 z-[100] transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
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

          <div className="flex-1 flex justify-center">
            <Link href="/" className="relative w-24 h-16">
              <img src="/logo-utc-perlis.png" alt="UTC Logo" fill className="object-contain" />
            </Link>
          </div>

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

export default Navigation;
