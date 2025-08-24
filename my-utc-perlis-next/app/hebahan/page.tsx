import PageHero from '../components/PageHero';
import AnnouncementCard from '../components/AnnouncementCard';

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen">
      <PageHero 
        title="Hebahan" 
        imageUrl="/hero-utc.jpg"
      />
      
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnnouncementCard 
            title="Perkhidmatan JPJ Ditutup Sementara"
            date="22 Dec 2024"
            category="Notis"
            description="Perkhidmatan Jabatan Pengangkutan Jalan (JPJ) di UTC Perlis akan ditutup sementara pada 25 Disember 2024 sempena Hari Krismas."
            imageUrl="/hero-utc.jpg"
            href="/announcements/jpj-closure"
          />
          <AnnouncementCard 
            title="Program Kesihatan Komuniti"
            date="20 Dec 2024"
            category="Program"
            description="Program pemeriksaan kesihatan percuma akan diadakan pada 27 Disember 2024 di UTC Perlis. Orang ramai dijemput hadir."
            imageUrl="/hero-utc.jpg"
            href="/announcements/health-program"
          />
          <AnnouncementCard 
            title="Waktu Operasi Tahun Baru"
            date="19 Dec 2024"
            category="Notis"
            description="Waktu operasi UTC Perlis pada 31 Disember 2024 dan 1 Januari 2024 akan diubah. Sila rujuk notis untuk maklumat lanjut."
            imageUrl="/hero-utc.jpg"
            href="/announcements/new-year-hours"
          />
          <AnnouncementCard 
            title="Karnival Usahawan UTC Perlis"
            date="18 Dec 2024"
            category="Program"
            description="Karnival Usahawan UTC Perlis akan berlangsung dari 28-30 Disember 2024. Pelbagai aktiviti menarik menanti anda!"
            imageUrl="/hero-utc.jpg"
            href="/announcements/entrepreneur-carnival"
          />
          <AnnouncementCard 
            title="Penambahbaikan Sistem Tempahan"
            date="15 Dec 2024"
            category="Notis"
            description="Sistem tempahan akan ditambahbaik pada 26 Disember 2024. Perkhidmatan akan terganggu dari jam 10 pagi hingga 2 petang."
            imageUrl="/hero-utc.jpg"
            href="/announcements/lhdn-system-upgrade"
          />
          <AnnouncementCard 
            title="Program Derma Darah"
            date="14 Dec 2024"
            category="Program"
            description="Program derma darah akan diadakan pada 29 Disember 2023 di UTC Perlis. Anda dijemput untuk menyertai program ini."
            imageUrl="/hero-utc.jpg"
            href="/announcements/blood-donation"
          />
        </div>
      </main>
    </div>
  );
}
