import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Apartment, Booking } from '../types';
import * as XLSX from 'xlsx';
import { Download, Plus, Image as ImageIcon, Trash2, Edit2, X, Eye } from 'lucide-react';

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'apartments' | 'booking_requests' | 'confirmed_bookings'>('apartments');

  // Form states for new apartment
  const [newApt, setNewApt] = useState({ buildingName: '', floor: '', apartmentNumber: '', description: '', price: '' });
  const [images, setImages] = useState<string[]>([]);
  
  const [editingApt, setEditingApt] = useState<Apartment | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const aptSnap = await getDocs(collection(db, 'apartments'));
      setApartments(aptSnap.docs.map(d => ({ id: d.id, ...d.data() } as Apartment)));
      
      const bkgSnap = await getDocs(collection(db, 'bookings'));
      setBookings(bkgSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)).sort((a,b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'كريم') {
      setIsAuthenticated(true);
    } else {
      alert('كلمة المرور غير صحيحة');
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1200;
              const MAX_HEIGHT = 1200;
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              // Compress to JPEG with 70% quality
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
              setImages(prev => [...prev, dataUrl]);
            };
            img.src = ev.target.result as string;
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };
  
  const handleAddApartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'apartments'), {
        ...newApt,
        price: Number(newApt.price),
        images,
        status: 'available'
      });
      alert('تم إضافة الشقة بنجاح');
      fetchData();
      setNewApt({ buildingName: '', floor: '', apartmentNumber: '', description: '', price: '' });
      setImages([]);
    } catch (e) {
      alert('حدث خطأ أثناء الإضافة');
    }
  };

  const toggleStatus = async (apt: Apartment) => {
    if (!apt.id) return;
    const newStatus = apt.status === 'available' ? 'occupied' : 'available';
    await updateDoc(doc(db, 'apartments', apt.id), { status: newStatus });
    fetchData();
  };

  const handleBookingStatus = async (booking: Booking, newStatus: 'approved' | 'rejected') => {
    if (!booking.id) return;
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { status: newStatus });
      if (newStatus === 'approved') {
        await updateDoc(doc(db, 'apartments', booking.apartmentId), { status: 'occupied' });
      } else if (newStatus === 'rejected') {
        await updateDoc(doc(db, 'apartments', booking.apartmentId), { status: 'available' });
      }
      fetchData();
    } catch (e) {
      alert('حدث خطأ أثناء تحديث حالة الحجز');
    }
  };

  const handleUpdateApartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApt?.id) return;
    try {
      await updateDoc(doc(db, 'apartments', editingApt.id), {
        buildingName: editingApt.buildingName,
        floor: editingApt.floor,
        apartmentNumber: editingApt.apartmentNumber,
        price: Number(editingApt.price),
        description: editingApt.description,
        status: editingApt.status,
        ...(images.length > 0 ? { images } : {})
      });
      alert('تم التعديل بنجاح');
      setEditingApt(null);
      setImages([]);
      fetchData();
    } catch (e) {
      alert('حدث خطأ أثناء التعديل');
    }
  };

  const deleteApartment = async (id?: string) => {
    if (!id || !window.confirm('هل أنت متأكد من الحذف؟')) return;
    await deleteDoc(doc(db, 'apartments', id));
    fetchData();
  };
  
  const deleteBooking = async (id?: string) => {
    if (!id || !window.confirm('هل أنت متأكد من إلغاء وحذف الحجز؟')) return;
    await deleteDoc(doc(db, 'bookings', id));
    fetchData();
    setViewingBooking(null);
  };
  
  const downloadBookingReceipt = (booking: Booking) => {
    const textContent = `
========================================
             تفاصيل الحجز
========================================
تاريخ الطلب: ${new Date(booking.createdAt).toLocaleString('ar-SA')}
الحالة: ${booking.status === 'approved' ? 'مؤكد' : booking.status === 'rejected' ? 'مرفوض' : 'معلق'}
اسم الضيف: ${booking.customerName}
رقم الهوية: ${booking.customerId}
الجوال: ${booking.customerMobile}
طريقة الدفع: ${booking.paymentMethod === 'transfer' ? 'تحويل بنكي' : 'عند الوصول'}
نوع الحجز: ${booking.bookingType === 'monthly' ? 'شهري' : 'يومي'}

-- معلومات الجناح --
مبنى: ${booking.apartmentDetails?.buildingName}
رقم الجناح: ${booking.apartmentDetails?.apartmentNumber}
الطابق: ${booking.apartmentDetails?.floor}
السعر: ${booking.apartmentDetails?.price} ﷼
========================================
    `;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking_${booking.customerName}_${booking.customerId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const exportToExcel = () => {
    const sortedBookings = [...bookings].sort((a, b) => b.createdAt - a.createdAt);
    const wsBookings = XLSX.utils.json_to_sheet(sortedBookings.map(b => ({
      'تاريخ الحجز': new Date(b.createdAt).toLocaleString('ar-SA'),
      'الاسم': b.customerName,
      'الهوية': b.customerId,
      'الجوال': b.customerMobile,
      'نوع الحجز': b.bookingType === 'monthly' ? 'شهري' : 'يومي',
      'طريقة الدفع': b.paymentMethod === 'transfer' ? 'تحويل بنكي' : 'عند الوصول',
      'العمارة': b.apartmentDetails?.buildingName || '',
      'الطابق': b.apartmentDetails?.floor || '',
      'الشقة': b.apartmentDetails?.apartmentNumber || '',
      'السعر': b.apartmentDetails?.price || '',
    })));
    
    const wsApartments = XLSX.utils.json_to_sheet(apartments.map(a => ({
      'العمارة': a.buildingName,
      'الطابق': a.floor,
      'الشقة': a.apartmentNumber,
      'السعر': a.price,
      'الحالة': a.status === 'available' ? 'متاحة' : 'مسكونة',
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsBookings, "الحجوزات");
    XLSX.utils.book_append_sheet(wb, wsApartments, "الشقق");
    
    const currentDate = new Date().toLocaleDateString('ar-SA').replace(/\//g, '-');
    XLSX.writeFile(wb, `تقرير_الحجوزات_${currentDate}.xlsx`);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center">
        <h2 className="text-3xl font-bold mb-8 text-royal-900 tracking-tight">تسجيل الدخول للإدارة</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <input 
            type="password" 
            placeholder="كلمة المرور" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 border-2 border-gray-100 rounded-xl text-center focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 outline-none transition-all font-medium text-lg"
          />
          <button type="submit" className="w-full bg-royal-900 text-white font-bold py-4 rounded-xl hover:bg-royal-800 transition-all shadow-md hover:shadow-xl text-lg">
            دخول
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm gap-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveTab('apartments')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'apartments' ? 'bg-royal-900 text-gold-500 shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>الأجنحة</button>
          <button onClick={() => setActiveTab('booking_requests')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'booking_requests' ? 'bg-royal-900 text-gold-500 shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>طلبات الحجوزات</button>
          <button onClick={() => setActiveTab('confirmed_bookings')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'confirmed_bookings' ? 'bg-royal-900 text-gold-500 shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>الحجوزات المؤكدة</button>
        </div>
        <button onClick={exportToExcel} className="flex items-center gap-2 bg-[#f9f6f0] text-[#8c7322] border border-[#D4AF37] px-6 py-2.5 rounded-xl font-bold hover:bg-[#f2ebd9] transition-all shadow-sm hover:shadow-md w-full md:w-auto justify-center">
          <Download className="w-4 h-4" />
          تصدير التقرير
        </button>
      </div>

      {activeTab === 'apartments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Form */}
          <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl h-fit">
            <h3 className="font-bold text-2xl mb-6 text-royal-900 flex items-center gap-2">
              <span className="w-1 h-6 bg-gold-500 rounded-full inline-block"></span>
              إضافة جناح جديد
            </h3>
            <form onSubmit={handleAddApartment} className="space-y-5">
              <input required placeholder="اسم المبنى" value={newApt.buildingName} onChange={e => setNewApt({...newApt, buildingName: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-xl bg-gray-50 focus:border-gold-500 outline-none transition-all" />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="الطابق" value={newApt.floor} onChange={e => setNewApt({...newApt, floor: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-xl bg-gray-50 focus:border-gold-500 outline-none transition-all" />
                <input required placeholder="رقم الجناح" value={newApt.apartmentNumber} onChange={e => setNewApt({...newApt, apartmentNumber: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-xl bg-gray-50 focus:border-gold-500 outline-none transition-all" />
              </div>
              <input required type="number" placeholder="السعر لليلة (﷼)" value={newApt.price} onChange={e => setNewApt({...newApt, price: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-xl bg-gray-50 focus:border-gold-500 outline-none transition-all" />
              <textarea required placeholder="وصف الجناح" value={newApt.description} onChange={e => setNewApt({...newApt, description: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-xl bg-gray-50 focus:border-gold-500 outline-none transition-all h-28" />
              
              <div>
                <label className="flex items-center justify-center gap-2 w-full p-6 border-2 border-dashed border-gold-500/40 rounded-xl cursor-pointer hover:bg-gold-50/30 text-gray-500 font-medium transition-all">
                  <ImageIcon className="w-6 h-6 text-gold-500" />
                  اختيار صور الجناح
                  <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {images.length > 0 && <p className="text-sm text-gold-600 mt-3 text-center font-bold">تم اختيار {images.length} صور</p>}
              </div>

              <button type="submit" className="w-full bg-royal-900 text-white font-bold py-4 rounded-xl hover:bg-royal-800 flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-xl">
                <Plus className="w-5 h-5 text-gold-500" /> إضافة الجناح
              </button>
            </form>
          </div>

          {/* List Apartments */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? <p className="text-center py-20 text-gray-400 font-medium text-lg">جاري تحميل الأجنحة...</p> : apartments.map(apt => (
              <div key={apt.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-center gap-6">
                <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                  {apt.images?.[0] ? (
                    <img src={apt.images[0]} className="w-full h-full object-cover" />
                  ) : (
                    <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200&q=80" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-grow text-center sm:text-right">
                  <h4 className="font-bold text-xl text-royal-900 mb-1">
                    <Link to={`/apartment/${apt.id}`} className="hover:text-gold-600 transition-colors">
                      مبنى {apt.buildingName} ({apt.description}) - جناح {apt.apartmentNumber}
                    </Link>
                  </h4>
                  <p className="text-gray-500 text-sm font-medium">الطابق {apt.floor} <span className="mx-2 text-gray-300">|</span> <span className="text-gold-600">{apt.price} ﷼</span></p>
                  <p className="text-sm mt-2 text-gray-600 line-clamp-1">{apt.description}</p>
                </div>
                <div className="flex sm:flex-col gap-3 shrink-0 w-full sm:w-auto">
                  <button onClick={() => toggleStatus(apt)} className={`px-5 py-2.5 rounded-xl font-bold text-sm flex-1 sm:flex-none transition-colors border ${apt.status === 'available' ? 'bg-[#f9f6f0] text-[#8c7322] border-[#D4AF37] hover:bg-[#f2ebd9]' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
                    {apt.status === 'available' ? 'متاح الآن' : 'مشغول'}
                  </button>
                  <div className="flex gap-2 flex-1 sm:flex-none">
                    <button onClick={() => { setEditingApt(apt); setImages([]); }} className="flex-1 px-5 py-2.5 bg-white border border-blue-100 text-blue-500 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteApartment(apt.id)} className="flex-1 px-5 py-2.5 bg-white border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'booking_requests' || activeTab === 'confirmed_bookings') && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-royal-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="p-5 font-bold">التاريخ</th>
                  <th className="p-5 font-bold">الضيف</th>
                  <th className="p-5 font-bold">الهوية</th>
                  <th className="p-5 font-bold">التواصل</th>
                  <th className="p-5 font-bold">الجناح</th>
                  <th className="p-5 font-bold">نوع الحجز</th>
                  <th className="p-5 font-bold">طريقة الدفع</th>
                  <th className="p-5 font-bold">الحالة</th>
                  <th className="p-5 font-bold">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings
                  .filter(b => activeTab === 'confirmed_bookings' ? b.status === 'approved' : (!b.status || b.status === 'pending' || b.status === 'rejected'))
                  .map(b => (
                  <tr key={b.id} className="hover:bg-royal-50/50 transition-colors">
                    <td className="p-5 text-gray-500">{new Date(b.createdAt).toLocaleDateString('ar-SA')}</td>
                    <td className="p-5 font-bold text-royal-900">{b.customerName}</td>
                    <td className="p-5 text-gray-500 font-medium">{b.customerId}</td>
                    <td className="p-5 text-gray-500 font-medium" dir="ltr">{b.customerMobile}</td>
                    <td className="p-5 font-medium text-royal-900">
                      مبنى {b.apartmentDetails?.buildingName} - جناح {b.apartmentDetails?.apartmentNumber}
                    </td>
                    <td className="p-5 font-bold text-gray-700">
                      {b.bookingType === 'monthly' ? 'شهري' : 'يومي'}
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${b.paymentMethod === 'transfer' ? 'bg-[#f9f6f0] text-[#8c7322] border-[#D4AF37]' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {b.paymentMethod === 'transfer' ? 'تحويل بنكي' : 'عند الوصول'}
                      </span>
                    </td>
                    <td className="p-5">
                      {b.status === 'approved' ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-200">مؤكد</span>
                      ) : b.status === 'rejected' ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">مرفوض</span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200">معلق</span>
                      )}
                    </td>
                    <td className="p-5 flex gap-2">
                      <button onClick={() => setViewingBooking(b)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 font-bold text-xs transition-colors shadow-sm flex items-center gap-1">
                        <Eye className="w-3 h-3" /> عرض
                      </button>
                      {(!b.status || b.status === 'pending') && (
                        <>
                          <button onClick={() => handleBookingStatus(b, 'approved')} className="bg-royal-900 text-gold-500 px-4 py-2 rounded-lg hover:bg-royal-800 font-bold text-xs transition-colors shadow-sm">تأكيد</button>
                          <button onClick={() => handleBookingStatus(b, 'rejected')} className="bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50 font-bold text-xs transition-colors shadow-sm">رفض</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {bookings.filter(b => activeTab === 'confirmed_bookings' ? b.status === 'approved' : (!b.status || b.status === 'pending' || b.status === 'rejected')).length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-16 text-center text-gray-400 font-medium text-lg">
                      لا توجد سجلات في هذا القسم.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editing Apartment Modal */}
      {editingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-royal-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
            <button onClick={() => setEditingApt(null)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-700 transition-colors">
              <X className="w-6 h-6" />
            </button>
            <h3 className="font-bold text-2xl mb-6 text-royal-900 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-500 rounded-full inline-block"></span>
              تعديل بيانات الجناح
            </h3>
            <form onSubmit={handleUpdateApartment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المبنى</label>
                <input required value={editingApt.buildingName} onChange={e => setEditingApt({...editingApt, buildingName: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl bg-gray-50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الطابق</label>
                  <input required value={editingApt.floor} onChange={e => setEditingApt({...editingApt, floor: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl bg-gray-50 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجناح</label>
                  <input required value={editingApt.apartmentNumber} onChange={e => setEditingApt({...editingApt, apartmentNumber: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl bg-gray-50 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السعر لليلة (﷼)</label>
                  <input required type="number" value={editingApt.price} onChange={e => setEditingApt({...editingApt, price: Number(e.target.value)})} className="w-full p-3 border-2 border-gray-100 rounded-xl bg-gray-50 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select value={editingApt.status} onChange={e => setEditingApt({...editingApt, status: e.target.value as 'available' | 'occupied'})} className="w-full p-3 border-2 border-gray-100 rounded-xl bg-gray-50 outline-none">
                    <option value="available">متاح</option>
                    <option value="occupied">مشغول</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea required value={editingApt.description} onChange={e => setEditingApt({...editingApt, description: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl bg-gray-50 outline-none h-24" />
              </div>
              
              <div>
                <label className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-blue-500/40 rounded-xl cursor-pointer hover:bg-blue-50/30 text-gray-500 font-medium transition-all">
                  <ImageIcon className="w-5 h-5 text-blue-500" />
                  تحديث الصور (اختياري)
                  <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {images.length > 0 && <p className="text-sm text-blue-600 mt-2 text-center font-bold">تم اختيار {images.length} صور جديدة</p>}
              </div>
              
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 mt-4 transition-all shadow-md">
                حفظ التعديلات
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Booking Modal */}
      {viewingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-royal-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
            <button onClick={() => setViewingBooking(null)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-700 transition-colors">
              <X className="w-6 h-6" />
            </button>
            <h3 className="font-bold text-2xl mb-6 text-royal-900 flex items-center gap-2 border-b pb-4">
              <span className="w-1 h-6 bg-gold-500 rounded-full inline-block"></span>
              تفاصيل الحجز
            </h3>
            
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">تاريخ الطلب</p>
                  <p className="font-bold text-gray-900">{new Date(viewingBooking.createdAt).toLocaleString('ar-SA')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">الحالة</p>
                  <p className="font-bold text-gray-900">
                    {viewingBooking.status === 'approved' ? 'مؤكد' : viewingBooking.status === 'rejected' ? 'مرفوض' : 'معلق'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">اسم الضيف</p>
                  <p className="font-bold text-gray-900">{viewingBooking.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">رقم الهوية</p>
                  <p className="font-bold text-gray-900">{viewingBooking.customerId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">الجوال</p>
                  <p className="font-bold text-gray-900" dir="ltr">{viewingBooking.customerMobile}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">طريقة الدفع</p>
                  <p className="font-bold text-gray-900">{viewingBooking.paymentMethod === 'transfer' ? 'تحويل بنكي' : 'عند الوصول'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">نوع الحجز</p>
                  <p className="font-bold text-gray-900">{viewingBooking.bookingType === 'monthly' ? 'شهري' : 'يومي'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mt-4">
                <p className="text-sm text-gray-500 mb-2">معلومات الجناح</p>
                <p className="font-bold text-royal-900 text-lg">مبنى {viewingBooking.apartmentDetails?.buildingName} - جناح {viewingBooking.apartmentDetails?.apartmentNumber}</p>
                <p className="text-sm text-gray-600 mt-1">الطابق: {viewingBooking.apartmentDetails?.floor} | السعر: {viewingBooking.apartmentDetails?.price} ﷼</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <button onClick={() => downloadBookingReceipt(viewingBooking)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 font-bold transition-all flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                تنزيل التفاصيل
              </button>
              {(!viewingBooking.status || viewingBooking.status === 'pending') && (
                <>
                  <button onClick={() => { handleBookingStatus(viewingBooking, 'approved'); setViewingBooking(null); }} className="flex-1 bg-royal-900 text-gold-500 py-3 rounded-xl hover:bg-royal-800 font-bold transition-all shadow-sm">
                    تأكيد
                  </button>
                  <button onClick={() => { handleBookingStatus(viewingBooking, 'rejected'); setViewingBooking(null); }} className="flex-1 bg-white border-2 border-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-50 font-bold transition-all shadow-sm">
                    رفض
                  </button>
                </>
              )}
              <button onClick={() => deleteBooking(viewingBooking.id)} className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl hover:bg-red-100 font-bold transition-all flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
