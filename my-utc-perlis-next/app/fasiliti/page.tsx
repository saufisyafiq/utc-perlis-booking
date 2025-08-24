import PageHero from '../components/PageHero';
import FacilityCard from '../components/FacilityCard';

async function getFacilities() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/facilities?populate=*`, {
    cache: 'no-store'
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch facilities');
  }
  
  return res.json();
}

export default async function FacilityPage() {
  const facilitiesData = await getFacilities();
  const facilities = facilitiesData.data || [];

  return (
    <div className="min-h-screen">
      <PageHero 
        title="Fasiliti" 
        imageUrl="/hero-utc.jpg"
      />
      
      <main className="max-w-7xl mx-auto px-4 py-16">
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
      </main>
    </div>
  );
}
