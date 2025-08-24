'use client';

import { FaHeart } from 'react-icons/fa';
import { useState } from 'react';

const FavoriteButton = () => {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <button 
      onClick={(e) => {
        e.preventDefault(); // Prevent Link navigation
        setIsFavorite(!isFavorite);
      }}
      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
    >
      <FaHeart 
        className={`transition-colors ${
          isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
        }`} 
      />
    </button>
  );
};

export default FavoriteButton;
