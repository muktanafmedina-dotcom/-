import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Apartment } from '../types';
import { Link } from 'react-router-dom';
import { Building, Play, Pause, Radio } from 'lucide-react';
import bannerImage from '../assets/images/luxury_apartment_banner_1783645840159.jpg';

export default function Home() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleRadio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // To ensure fresh stream playback (not buffered), reset the src
        audioRef.current.src = "https://stream.radiojar.com/8s5u5tpdtwzuv";
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error("Failed to play stream:", err);
          setIsPlaying(false);
        });
      }
    }
  };
  
  useEffect(() => {
    const fetchApartments = async () => {
      try {
        const q = query(collection(db, 'apartments'), where('status', '==', 'available'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Apartment));
        setApartments(data);
      } catch (error) {
        console.error("Error fetching apartments: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchApartments();
  }, []);

  const uniqueBuildings = Array.from(new Map(apartments.map(a => [a.buildingName, `عمارة ${a.buildingName} (${a.description})`])).entries());
  const floors = Array.from(new Set(apartments.map(a => a.floor))).sort((a, b) => Number(a) - Number(b));
  
  let filtered = apartments;
  if (selectedBuilding) {
    filtered = filtered.filter(a => a.buildingName === selectedBuilding);
  }
  if (selectedFloor) {
    filtered = filtered.filter(a => String(a.floor) === String(selectedFloor));
  }

  if (loading) return <div className="text-center py-20 text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-12 pb-10">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl h-[400px]">
        <img 
          src={bannerImage} 
          alt="Luxury Apartment" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-royal-900/90 via-royal-900/40 to-transparent flex flex-col justify-end p-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 w-full">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg tracking-tight">
                استكشف الفخامة في الإقامة
              </h1>
              <p className="text-gold-400 text-lg md:text-xl max-w-2xl font-light">
                مجموعة استثنائية من الشقق الفندقية المصممة لراحتك.
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-royal-900/60 backdrop-blur-md px-6 py-4 rounded-full border border-gold-500/30">
              <div className="flex flex-col justify-center">
                <span className="text-white font-bold text-sm flex items-center gap-2">
                  <Radio className="w-4 h-4 text-gold-400" />
                  إذاعة القرآن الكريم
                </span>
              </div>
              <button 
                onClick={toggleRadio}
                className="w-12 h-12 bg-gold-500 hover:bg-gold-400 text-royal-900 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </button>
            </div>
          </div>
          
          <audio ref={audioRef} preload="none" />
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col md:flex-row gap-6 items-center justify-between -mt-20 relative z-10 mx-4 md:mx-10">
        <h2 className="text-2xl font-bold text-royal-900 flex items-center gap-2">
          <span className="w-1.5 h-8 bg-gold-500 rounded-full inline-block"></span>
          الشقق المتاحة
        </h2>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <select 
            value={selectedBuilding} 
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="w-full md:w-64 p-3.5 border-2 border-gray-100 rounded-xl bg-gray-50 outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all font-medium text-gray-700"
          >
            <option value="">جميع المباني</option>
            {uniqueBuildings.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select 
            value={selectedFloor} 
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="w-full md:w-48 p-3.5 border-2 border-gray-100 rounded-xl bg-gray-50 outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all font-medium text-gray-700"
          >
            <option value="">جميع الطوابق</option>
            {floors.map(f => (
              <option key={f} value={f}>الطابق {f}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(apt => (
          <Link key={apt.id} to={`/apartment/${apt.id}`} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 group flex flex-col">
            <div className="h-64 bg-gray-100 overflow-hidden relative">
              {apt.images && apt.images.length > 0 ? (
                <img src={apt.images[0]} alt="apartment" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80" alt="apartment default" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              )}
              <div className="absolute top-4 right-4 bg-royal-900/90 backdrop-blur-sm text-gold-400 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg border border-gold-500/30">
                متاحة الآن
              </div>
            </div>
            <div className="p-6 space-y-4 flex-grow flex flex-col">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-2xl text-royal-900 mb-1">جناح {apt.apartmentNumber}</h3>
                  <div className="flex items-center text-gray-500 text-sm gap-1.5 font-medium">
                    <Building className="w-4 h-4 text-gold-500" />
                    <span>مبنى {apt.buildingName} - الطابق {apt.floor}</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed flex-grow">{apt.description}</p>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">سعر الليلة</span>
                {apt.price && (
                  <div className="text-gold-600 font-bold text-xl">
                    {apt.price} <span className="text-sm text-gray-400 font-normal">﷼</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Building className="w-16 h-16 text-gray-200 mb-4" />
            <p className="text-xl font-medium text-gray-500">لا توجد أجنحة متاحة تطابق بحثك.</p>
          </div>
        )}
      </div>
    </div>
  );
}
