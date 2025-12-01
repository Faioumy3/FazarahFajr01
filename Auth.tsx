import React, { useState } from 'react';
import { User, ViewState } from './types';
import { loginUser, registerUser } from './storageService';

interface Props {
  onLoginSuccess: (user: User) => void;
  onAdminClick: () => void;
}

const Auth: React.FC<Props> = ({ onLoginSuccess, onAdminClick }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegistering) {
      // Validation
      if (fullName.trim().split(' ').length < 4) {
        setError('يرجى إدخال الاسم رباعياً');
        setLoading(false);
        return;
      }
      if (password !== confirmPass) {
        setError('كلمة السر غير متطابقة');
        setLoading(false);
        return;
      }
      if (phone.length < 10) {
        setError('يرجى إدخال رقم هاتف صحيح');
        setLoading(false);
        return;
      }

      const res = await registerUser(fullName, phone, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message);
      }
    } else {
      // Login
      const res = await loginUser(phone, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-lg mt-4">
      <div className="md:flex">
        <div className="w-full p-8">
          <div className="uppercase tracking-wide text-sm text-islamic-accent font-semibold mb-1">
            {isRegistering ? 'تسجيل مشترك جديد' : 'تسجيل الدخول'}
          </div>
          <h2 className="block mt-1 text-lg leading-tight font-medium text-black">
            ربنا يوفقك في رحلة الفجر يا عزيزي
          </h2>
          
          <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-y-4">
            {isRegistering && (
              <div>
                <label className="block text-gray-700 font-bold mb-2 text-sm">الاسم رباعي</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-islamic-accent focus:ring-1 focus:ring-islamic-accent"
                  placeholder="الاسم الأول الثاني الثالث الرابع"
                  required={isRegistering}
                />
              </div>
            )}

            <div>
              <label className="block text-gray-700 font-bold mb-2 text-sm">رقم الهاتف</label>
              <input 
                type="tel" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-islamic-accent focus:ring-1 focus:ring-islamic-accent"
                placeholder="01xxxxxxxxx"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-2 text-sm">كلمة السر</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-islamic-accent focus:ring-1 focus:ring-islamic-accent"
                required
              />
            </div>

            {isRegistering && (
              <div>
                <label className="block text-gray-700 font-bold mb-2 text-sm">تأكيد كلمة السر</label>
                <input 
                  type="password" 
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-islamic-accent focus:ring-1 focus:ring-islamic-accent"
                  required={isRegistering}
                />
              </div>
            )}

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            <button 
                type="submit" 
                disabled={loading}
                className={`bg-islamic-dark text-white font-bold py-3 px-4 rounded-lg transition duration-300 shadow-lg mt-2 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-900'}`}
            >
              {loading ? 'جاري التحميل...' : (isRegistering ? 'إنشاء حساب' : 'دخول')}
            </button>
          </form>

          <div className="mt-6 text-center border-t pt-4">
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
              className="text-islamic-dark hover:underline text-sm font-semibold"
            >
              {isRegistering ? 'لديك حساب بالفعل؟ سجل دخول' : 'ليس لديك حساب؟ اشترك الآن'}
            </button>
          </div>

           <div className="mt-8 text-center">
            <button 
              onClick={onAdminClick} 
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              دخول المشرفين
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;