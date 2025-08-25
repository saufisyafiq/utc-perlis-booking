import FeatureCard from './components/FeatureCard';
import FacilityCard from './components/FacilityCard';
import ServiceCard from './components/ServiceCard';
import Image from 'next/image';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';

async function getFacilities() {
  try {
    // Fetch only 3 facilities for the homepage preview
    const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL;
    if (!apiUrl) {
      throw new Error('NEXT_PUBLIC_STRAPI_API_URL is not configured');
    }

    console.log('Fetching facilities from:', `${apiUrl}/api/facilities?populate=*&pagination[limit]=3`);
    
    const res = await fetch(`${apiUrl}/api/facilities?populate=*&pagination[limit]=3`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000) // 10 seconds timeout
    });
    
    if (!res.ok) {
      console.error('Failed to fetch facilities:', res.status, res.statusText);
      throw new Error(`Failed to fetch facilities: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('Facilities fetched successfully:', data.data?.length || 0, 'items');
    return data;
  } catch (error) {
    console.error('Error in getFacilities:', error);
    throw error;
  }
}

async function getServices() {
  try {
    // Fetch only 3 services for the homepage preview
    const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL;
    if (!apiUrl) {
      throw new Error('NEXT_PUBLIC_STRAPI_API_URL is not configured');
    }

    console.log('Fetching services from:', `${apiUrl}/api/services?populate[operatingHours][populate][scheduleShift]=*&populate=image&pagination[limit]=3`);
    
    const res = await fetch(`${apiUrl}/api/services?populate[operatingHours][populate][scheduleShift]=*&populate=image&pagination[limit]=3`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000) // 10 seconds timeout
    });
    
    if (!res.ok) {
      console.error('Failed to fetch services:', res.status, res.statusText);
      throw new Error(`Failed to fetch services: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('Services fetched successfully:', data.data?.length || 0, 'items');
    return data;
  } catch (error) {
    console.error('Error in getServices:', error);
    throw error;
  }
}

export default async function Home() {
  let facilitiesData;
  let servicesData;
  
  try {
    facilitiesData = await getFacilities();
  } catch (error) {
    console.error('Failed to load facilities:', error);
    facilitiesData = { data: [] };
  }
  
  try {
    servicesData = await getServices();
  } catch (error) {
    console.error('Failed to load services:', error);
    servicesData = { data: [] };
  }
  
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
            {facilities.length > 0 ? (
              facilities.map((facility: any) => (
                <FacilityCard 
                  key={facility.id}
                  title={facility.name}
                  location={facility.location}
                  capacity={facility.capacity}
                  price={facility.rates.hourlyRate}
                  imageUrl={`${process.env.NEXT_PUBLIC_STRAPI_API_URL}${facility.image[0].url}`}
                  documentId={facility.documentId}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Fasiliti Tidak Tersedia</h3>
                <p className="text-gray-500">Maaf, maklumat fasiliti tidak dapat dipaparkan buat masa ini. Sila cuba lagi kemudian.</p>
              </div>
            )}
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
            {services.length > 0 ? (
              services.map((service: any) => (
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
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Servis Tidak Tersedia</h3>
                <p className="text-gray-500">Maaf, maklumat servis tidak dapat dipaparkan buat masa ini. Sila cuba lagi kemudian.</p>
              </div>
            )}
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
