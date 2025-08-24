import PageHero from '../components/PageHero';
import ServiceCard from '../components/ServiceCard';

async function getServices() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/services?populate[operatingHours][populate][scheduleShift]=*&populate=image`, {
    cache: 'no-store'
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch services');
  }
  
  return res.json();
}

export default async function ServicesPage() {
  const servicesData = await getServices();
  const services = servicesData.data || [];

  return (
    <div className="min-h-screen">
      <PageHero 
        title="Servis" 
        imageUrl="/hero-utc.jpg"
      />
      
      <main className="max-w-7xl mx-auto px-4 py-16">
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
      </main>
    </div>
  );
}
