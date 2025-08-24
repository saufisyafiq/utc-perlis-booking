

import Link from 'next/link';
import Image from 'next/image';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
}

const FeatureCard = ({ title, description, icon, href }: FeatureCardProps) => {
  return (
    <Link href={href} className="block">
      <div className="bg-card hover:bg-blue-900 rounded-3xl shadow-lg p-8 transition-all duration-300 hover:-translate-y-1 group min-h-[240px] flex flex-col items-start text-left">
        <div className="w-24 h-24 bg-blue-50 group-hover:bg-blue-800 rounded-full flex items-center justify-center transition-colors mb-8">
          <Image 
            src={icon} 
            alt={title} 
            width={40} 
            height={40} 
            className="[&>path]:fill-blue-900 group-hover:[&>path]:fill-white transition-colors duration-300 group-hover:brightness-0 group-hover:invert" 
          />
        </div>
        
        <h3 className="text-xl lg:text-2xl font-bold text-gray-900 group-hover:text-white mb-3">{title}</h3>
        {/* <p className="text-gray-500 group-hover:text-blue-100">{description}</p> */}
      </div>
    </Link>
  );
};

export default FeatureCard;
