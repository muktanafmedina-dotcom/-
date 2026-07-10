import { Link } from 'react-router-dom';
import { Home, Settings } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-royal-900 text-white shadow-xl border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 font-bold text-2xl text-gold-500 hover:text-gold-400 transition-colors">
          <Home className="w-8 h-8" />
          <span className="tracking-wide">شقق طيبة</span>
        </Link>
        <div className="flex items-center gap-8">
          <Link to="/" className="text-gray-300 hover:text-gold-500 font-medium transition-colors text-lg tracking-wide">
            الرئيسية
          </Link>
          <Link to="/admin" className="text-gray-300 hover:text-gold-500 font-medium transition-colors flex items-center gap-2 text-lg tracking-wide">
            <Settings className="w-5 h-5" />
            الإدارة
          </Link>
        </div>
      </div>
    </nav>
  );
}
