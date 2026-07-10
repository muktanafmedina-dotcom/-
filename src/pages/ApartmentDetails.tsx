import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Apartment } from '../types';
import { Building, CheckCircle } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function ApartmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [mobile, setMobile] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'arrival'>('arrival');
  const [bookingType, setBookingType] = useState<'daily' | 'monthly'>('daily');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchApt = async () => {
      if (!id) return;
      const docRef = doc(db, 'apartments', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setApartment({ id: docSnap.id, ...docSnap.data() } as Apartment);
      }
      setLoading(false);
    };
    fetchApt();
  }, [id]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apartment || !id) return;
    setSubmitting(true);
    
    try {
      const bookingData = {
        apartmentId: id,
        apartmentDetails: apartment,
        customerName: name,
        customerId: nationalId,
        customerMobile: mobile,
        paymentMethod,
        bookingType,
        status: 'pending',
        createdAt: Date.now()
      };
      await addDoc(collection(db, 'bookings'), bookingData);
      
      setSuccess(true);
      setTimeout(generatePDF, 100);
    } catch (error) {
      console.error("Error booking: ", error);
      alert('حدث خطأ أثناء الحجز. حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const generatePDF = async () => {
    if (!receiptRef.current) return;
    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, style: { background: 'white' } });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      // Estimate height based on aspect ratio of standard A4, or we can get element dimensions.
      const elWidth = receiptRef.current.offsetWidth || 800;
      const elHeight = receiptRef.current.offsetHeight || 600;
      const pdfHeight = (elHeight * pdfWidth) / elWidth;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`حجز-شقة-${apartment?.apartmentNumber}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('حدث خطأ أثناء تحميل الحجز. يرجى المحاولة مرة أخرى.');
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">جاري التحميل...</div>;
  if (!apartment) return <div className="text-center py-20 text-gray-500">الشقة غير موجودة.</div>;

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
        <CheckCircle className="w-24 h-24 text-[#D4AF37] mx-auto drop-shadow-md" />
        <h2 className="text-4xl font-bold text-gray-900 tracking-tight">تم الحجز بنجاح!</h2>
        <p className="text-gray-600 text-lg">تم حفظ بيانات الحجز وجاري تحميل الحجز (PDF)...</p>
        <div className="pt-8 space-x-4 space-x-reverse flex flex-wrap justify-center gap-y-4">
          <button onClick={() => navigate('/')} className="bg-gray-900 text-white px-8 py-4 rounded-xl hover:bg-gray-800 font-bold transition-all shadow-md hover:shadow-lg">
            العودة للرئيسية
          </button>
          <button onClick={generatePDF} className="bg-[#f9f6f0] text-[#8c7322] border border-[#D4AF37] px-8 py-4 rounded-xl hover:bg-[#f2ebd9] font-bold transition-all shadow-sm hover:shadow-md">
            تحميل الحجز مجدداً
          </button>
          <a
            href={`https://wa.me/966570671642?text=${encodeURIComponent(`السلام عليكم، لقد قمت للتو بحجز شقة رقم ${apartment.apartmentNumber} في مبنى ${apartment.buildingName}.\nالاسم: ${name}\nرقم الهوية: ${nationalId}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-white px-8 py-4 rounded-xl hover:bg-[#1ebe5d] font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            مشاركة للإدارة واتساب
          </a>
        </div>

        <div className="absolute -left-[9999px]">
          <div ref={receiptRef} className="bg-white p-16 w-[800px] text-right border-8 border-double border-[#D4AF37] rounded-sm" dir="rtl">
            <div className="text-center mb-12 border-b-2 border-[#D4AF37] pb-8">
              <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">شقق طيبة</h1>
              <p className="text-2xl text-[#8c7322] font-medium tracking-widest">تأكيد حجز إقامة فاخرة</p>
            </div>
            <div className="grid grid-cols-2 gap-y-12 gap-x-10 text-xl">
              <div>
                <p className="text-gray-500 mb-2 text-sm uppercase tracking-wider">اسم الضيف</p>
                <p className="font-bold text-3xl text-gray-900">{name}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-2 text-sm uppercase tracking-wider">رقم الهوية</p>
                <p className="font-bold text-3xl text-gray-900">{nationalId}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-2 text-sm uppercase tracking-wider">رقم التواصل</p>
                <p className="font-bold text-3xl text-gray-900" dir="ltr">{mobile}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-2 text-sm uppercase tracking-wider">طريقة الدفع</p>
                <p className="font-bold text-3xl text-gray-900">{paymentMethod === 'transfer' ? 'تحويل بنكي' : 'الدفع عند الوصول'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-2 text-sm uppercase tracking-wider">نوع الحجز</p>
                <p className="font-bold text-3xl text-gray-900">{bookingType === 'monthly' ? 'شهري' : 'يومي'}</p>
              </div>
              <div className="col-span-2 pt-8 mt-4 bg-gray-50 p-10 rounded-lg border border-gray-200 shadow-inner">
                <h3 className="font-bold text-2xl mb-8 text-gray-900 flex items-center gap-3">
                  <span className="w-2 h-8 bg-[#D4AF37] inline-block rounded-full"></span>
                  تفاصيل الجناح
                </h3>
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <p className="text-gray-500 mb-1 text-sm">المبنى</p>
                    <p className="font-bold text-2xl text-gray-800">{apartment.buildingName} ({apartment.description})</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1 text-sm">الطابق</p>
                    <p className="font-bold text-2xl text-gray-800">{apartment.floor}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1 text-sm">رقم الجناح</p>
                    <p className="font-bold text-2xl text-gray-800">{apartment.apartmentNumber}</p>
                  </div>
                </div>
                <div className="mt-10 pt-8 border-t border-gray-300 flex justify-between items-end">
                  <p className="text-gray-600 font-medium text-lg uppercase tracking-wider">القيمة الإجمالية للإقامة</p>
                  <p className="font-bold text-5xl text-[#D4AF37]">{apartment.price} <span className="text-2xl text-gray-500 font-normal">﷼</span></p>
                </div>
              </div>
            </div>
            <div className="mt-20 text-center">
              <p className="text-[#8c7322] font-medium text-lg tracking-widest border-t border-[#D4AF37] inline-block pt-6 px-12">نتمنى لكم إقامة سعيدة</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7 space-y-8">
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 p-2 relative">
          {apartment.images && apartment.images.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              <img src={apartment.images[0]} alt="main" className="w-full h-[500px] object-cover rounded-2xl" />
              <div className="grid grid-cols-3 gap-2">
                {apartment.images.slice(1).map((img, idx) => (
                  <img key={idx} src={img} alt={`apt-${idx}`} className="w-full h-40 object-cover rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80" alt="main" className="w-full h-[500px] object-cover rounded-2xl" />
              <div className="grid grid-cols-3 gap-2">
                  <img src="https://images.unsplash.com/photo-1502672260266-1c1de2d9d344?w=400&q=80" alt="apt-1" className="w-full h-40 object-cover rounded-xl" />
                  <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80" alt="apt-2" className="w-full h-40 object-cover rounded-xl" />
                  <img src="https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80" alt="apt-3" className="w-full h-40 object-cover rounded-xl" />
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-royal-900 tracking-tight">جناح رقم {apartment.apartmentNumber}</h1>
              <div className="flex items-center text-gray-500 mt-3 gap-2 text-lg font-medium">
                <Building className="w-5 h-5 text-gold-500" />
                <span>مبنى {apartment.buildingName} ({apartment.description}) - الطابق {apartment.floor}</span>
              </div>
            </div>
            {apartment.price && (
              <div className="text-right">
                <span className="block text-sm text-gray-500 uppercase tracking-wide mb-1">سعر الليلة</span>
                <div className="text-3xl font-bold text-gold-600 bg-gold-50/50 border border-gold-500/20 px-6 py-3 rounded-2xl">
                  {apartment.price} <span className="text-lg text-gold-600/70 font-normal">﷼</span>
                </div>
              </div>
            )}
          </div>
          <p className="text-gray-600 leading-relaxed pt-8 border-t border-gray-100 text-lg font-light">{apartment.description}</p>
        </div>
      </div>

      <div className="lg:col-span-5">
        <div className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 sticky top-28">
          <h2 className="text-3xl font-bold mb-8 text-royal-900 flex items-center gap-3">
            <span className="w-1.5 h-8 bg-gold-500 rounded-full inline-block"></span>
            حجز الجناح
          </h2>
          <form onSubmit={handleBooking} className="space-y-6">
            <div>
              <label className="block text-royal-800 font-medium mb-2">الاسم الثلاثي</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 border-2 border-gray-100 rounded-xl bg-gray-50 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 outline-none transition-all font-medium text-royal-900" />
            </div>
            <div>
              <label className="block text-royal-800 font-medium mb-2">رقم الهوية</label>
              <input required type="text" value={nationalId} onChange={e => setNationalId(e.target.value)} className="w-full p-4 border-2 border-gray-100 rounded-xl bg-gray-50 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 outline-none transition-all font-medium text-royal-900" />
            </div>
            <div>
              <label className="block text-royal-800 font-medium mb-2">رقم الجوال</label>
              <input required type="tel" dir="ltr" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full p-4 border-2 border-gray-100 rounded-xl bg-gray-50 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 outline-none text-right transition-all font-medium text-royal-900" />
            </div>
            <div className="pt-2">
              <label className="block text-royal-800 font-medium mb-3">نوع الحجز</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setBookingType('daily')}
                  className={`p-4 border-2 rounded-xl font-bold text-lg transition-all ${bookingType === 'daily' ? 'border-gold-500 bg-gold-50/50 text-gold-600 shadow-sm' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                >
                  يومي
                </button>
                <button
                  type="button"
                  onClick={() => setBookingType('monthly')}
                  className={`p-4 border-2 rounded-xl font-bold text-lg transition-all ${bookingType === 'monthly' ? 'border-gold-500 bg-gold-50/50 text-gold-600 shadow-sm' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                >
                  شهري
                </button>
              </div>
            </div>
            <div className="pt-2">
              <label className="block text-royal-800 font-medium mb-3">طريقة الدفع</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('arrival')}
                  className={`p-4 border-2 rounded-xl font-bold text-lg transition-all ${paymentMethod === 'arrival' ? 'border-gold-500 bg-gold-50/50 text-gold-600 shadow-sm' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                >
                  عند الوصول
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-4 border-2 rounded-xl font-bold text-lg transition-all ${paymentMethod === 'transfer' ? 'border-gold-500 bg-gold-50/50 text-gold-600 shadow-sm' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                >
                  تحويل بنكي
                </button>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-royal-900 text-white font-bold text-xl p-5 rounded-xl hover:bg-royal-800 disabled:opacity-70 transition-all mt-8 shadow-xl hover:shadow-2xl flex justify-center items-center gap-2"
            >
              {submitting ? 'جاري تأكيد الحجز...' : 'تأكيد الحجز الآن'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
