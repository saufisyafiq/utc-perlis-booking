import Image from 'next/image';

interface PageHeroProps {
  title: string;
  imageUrl: string;
}

const PageHero = ({ title, imageUrl }: PageHeroProps) => {
  return (
    <div className="relative h-[400px] w-full">
      <img 
        src={imageUrl} 
        alt={title} 
        fill 
        className="object-cover"
        priority 
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        <h1 className="text-5xl font-bold text-white text-center">
          {title}
        </h1>
      </div>
    </div>
  );
};

export default PageHero;
