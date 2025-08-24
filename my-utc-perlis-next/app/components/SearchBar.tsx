'use client';

import { FaSearch } from 'react-icons/fa';

const SearchBar = () => {
  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder="Enter Keyword for Buy"
          className="w-full px-8 py-6 rounded-full shadow-lg text-gray-700 focus:outline-none text-lg"
        />
        <button 
          className="absolute right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Search"
        >
          <FaSearch className="text-gray-500 text-xl" />
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
