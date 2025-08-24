import { FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* UTC Perlis Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">UTC PERLIS</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FaMapMarkerAlt className="text-blue-400 mt-1 flex-shrink-0" />
                <p>No. 1, Aras 2, Blok B, Pusat Transformasi Bandar (UTC) Perlis, Jalan Seri Sena, 01000 Kangar Perlis.</p>
              </div>
              <div className="flex items-center gap-3">
                <FaPhone className="text-blue-400" />
                <p>04-9705310</p>
              </div>
              <div className="flex items-center gap-3">
                <FaEnvelope className="text-blue-400" />
                <p>utcperlis09@gmail.com</p>
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div>
            <h3 className="text-lg font-semibold mb-4">WAKTU OPERASI</h3>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Isnin hingga Jumaat:</span>
                <br />
                8:00 Pagi hingga 9:00 Malam
              </p>
              <p>
                <span className="font-medium">Sabtu & Ahad:</span>
                <br />
                8:00 Pagi hingga 5:00 Petang
              </p>
              <p>
                <span className="font-medium">Rehat:</span>
                <br />
                Jumaat (12:15 Tengah Hari hingga 2:45 Petang)
              </p>
            </div>
          </div>

          {/* PKENPs Information (Placeholder) */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Perbadanan Kemajuan Ekonomi Negeri Perlis (PKENPS)</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FaMapMarkerAlt className="text-blue-400 mt-1 flex-shrink-0" />
                <p>193, Jalan Raja Syed Alwi, Taman Perlis, 01000 Kangar, Perlis</p>
              </div>
              <div className="flex items-center gap-3">
                <FaPhone className="text-blue-400" />
                <p>04-976 1088</p>
              </div>
              <div className="flex items-center gap-3">
                <FaEnvelope className="text-blue-400" />
                <p>webmaster@pkenps.gov.my</p>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>© {new Date().getFullYear()} UTC Perlis. Hak Cipta Terpelihara.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
