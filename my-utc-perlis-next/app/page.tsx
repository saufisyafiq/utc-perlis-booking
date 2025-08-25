import FeatureCard from './components/FeatureCard';
import FacilityCard from './components/FacilityCard';
import ServiceCard from './components/ServiceCard';
import Image from 'next/image';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';

async function getFacilities() {
  // Fetch only 3 facilities for the homepage preview
  const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/facilities?populate=*&pagination[limit]=3`, {
    cache: 'no-store'
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch facilities');
  }
  
  return res.json();
}

async function getServices() {
  // Fetch only 3 services for the homepage preview
  const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/services?populate[operatingHours][populate][scheduleShift]=*&populate=image&pagination[limit]=3`, {
    cache: 'no-store'
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch services');
  }
  
  return res.json();
}

export default async function Home() {
  const facilitiesData = await getFacilities();
  const servicesData = await getServices();
  
  const facilities = facilitiesData.data || [];
  const services = servicesData.data || [];

  return (
    <div className="min-h-screen">
      <div className="relative h-[650px] w-full">
        <Image src="/hero-utc.jpg" alt="Hero" fill className="object-cover" priority />
        
        {/* Content overlay */}
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          <h1 className="text-5xl md:text-7xl font-bold text-white text-center mb-6">
            Selamat Datang ke UTC PERLIS
          </h1>
          <p className="text-xl text-white text-center mb-12">
            Pusat Transformasi Bandar Perlis
          </p>
        </div>
      </div>
      
      <main>
        {/* Feature Cards */}
        <div className="max-w-7xl mx-auto px-4 lg:-mt-28 relative z-20">
          <div className="grid grid-cols-2 gap-4 sm:gap-8 pt-8 lg:pt-0">
            <FeatureCard 
              title="Fasiliti"
              description="Lihat Senarai Fasiliti yang tersedia di UTC Perlis"
              icon="/fasiliti.svg"
              href="/fasiliti"
            />
            <FeatureCard 
              title="Servis"
              description="Lihat Senarai Servis yang tersedia di UTC Perlis"
              icon="/services.svg"
              href="/services"
            />
            {/* <FeatureCard 
              title="Bisnes"
              description="22 Directory"
              icon="/stall.svg"
              href="/bisnes"
            />
            <FeatureCard 
              title="Hebahan"
              description="22 Directory"
              icon="/announcement.svg"
              href="/hebahan"
            /> */}
          </div>
        </div>

        {/* Facilities Section */}
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Fasiliti UTC Perlis</h2>
            <p className="text-gray-600">Temui pelbagai fasiliti sedia menerima tempahan di UTC Perlis</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {facilities.map((facility: any) => (
              <FacilityCard 
                key={facility.id}
                title={facility.name}
                location={facility.location}
                capacity={facility.capacity}
                price={facility.rates.hourlyRate}
                imageUrl={`${process.env.NEXT_PUBLIC_STRAPI_API_URL}${facility.image[0].url}`}
                documentId={facility.documentId}
              />
            ))}
          </div>

          {/* View All Button */}
          <div className="mt-12 text-center">
            <Link 
              href="/fasiliti"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Lihat Semua Fasiliti
              <FaArrowRight />
            </Link>
          </div>
        </div>

        {/* Services Section */}
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Servis UTC Perlis</h2>
            <p className="text-gray-600">Temui pelbagai perkhidmatan kerajaan di UTC Perlis</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service: any) => (
              <ServiceCard 
                key={service.id}
                name={service.name}
                location={service.location}
                description={service.description}
                imageUrl={`${process.env.NEXT_PUBLIC_STRAPI_API_URL}${service.image[0].url}`}
                href={`/services/${service.documentId}`}
                phoneNumber={service.phoneNumber}
                email={service.email}
                website={service.website}
                operatingHours={service.operatingHours}
              />
            ))}
          </div>

          {/* View All Button */}
          <div className="mt-12 text-center">
            <Link 
              href="/services"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Lihat Semua Servis
              <FaArrowRight />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
