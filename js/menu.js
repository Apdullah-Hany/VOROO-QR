import React, { useState, useEffect } from 'react';
import { Menu, Search, Coffee, UtensilsCrossed, IceCream, Loader2, QrCode } from 'lucide-react';

// ضع معلومات Supabase الخاصة بك هنا
const SUPABASE_URL = 'https://ffavhmndcnqgrdcxcnuo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmYXZobW5kY25xZ3JkY3hjbnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzIwODEsImV4cCI6MjA4MDYwODA4MX0.b80wJ2rZo_iiuO-HN-wzxyQ0bqh_Z_6p5h6unzL9G1E';

const MenuApp = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [searchTerm, setSearchTerm] = useState('');

  // جلب البيانات من Supabase
  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/menu_items?select=*&available=eq.true&order=category,name`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) throw new Error('فشل في تحميل المنيو');
      
      const data = await response.json();
      setMenuItems(data);
      setError(null);
    } catch (err) {
      setError('حدث خطأ في تحميل المنيو. تأكد من إعدادات Supabase.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // الفلترة حسب الفئة
  const categories = ['الكل', ...new Set(menuItems.map(item => item.category))];

  // الفلترة والبحث
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'الكل' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'وجبات': return <UtensilsCrossed className="w-5 h-5" />;
      case 'مشروبات': return <Coffee className="w-5 h-5" />;
      case 'حلويات': return <IceCream className="w-5 h-5" />;
      default: return <Menu className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل المنيو...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <UtensilsCrossed className="w-8 h-8" />
            <h1 className="text-3xl font-bold">مطعمنا</h1>
          </div>
          <p className="text-center text-orange-100">اختر من قائمتنا المميزة</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border-r-4 border-red-500 p-4 mb-6 rounded">
            <div className="flex items-start">
              <div className="flex-1">
                <p className="text-red-800 font-medium">{error}</p>
                <p className="text-red-600 text-sm mt-2">
                  قم بتحديث المتغيرات SUPABASE_URL و SUPABASE_ANON_KEY في الكود
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ابحث عن صنف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-orange-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-orange-50'
              }`}
            >
              {getCategoryIcon(category)}
              <span className="font-medium">{category}</span>
            </button>
          ))}
        </div>

        {/* Menu Items */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Menu className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">لا توجد أصناف متاحة</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">{item.name}</h3>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                          {item.category}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-orange-600">{item.price} ج.م</span>
                    <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                      اطلب الآن
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QR Code Info */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6 text-center">
          <QrCode className="w-12 h-12 text-orange-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">امسح QR Code</h3>
          <p className="text-gray-600 text-sm">
            للوصول لهذا المنيو من جوالك، قم بمسح QR Code الموجود على طاولتك
          </p>
        </div>
      </div>
    </div>
  );
};

export default MenuApp;