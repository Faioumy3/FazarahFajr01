
import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord } from './types';
import { getFajrStatus, getHijriDateString, getGregorianDateString, getCairoDate, isSameDay } from './timeUtils';
import { checkInUser, claimReward, sendMessageToAdmin, changeUserPassword } from './storageService';
import { GoogleGenAI } from "@google/genai";

interface Props {
  user: User;
  onLogout: () => void;
  onUpdateUser: (u: User) => void;
}

const MOSQUES = ['الشرقي', 'خطاب', 'البحري', 'القبلي', 'الكبير', 'الفردوس', 'زاوية الفيومي'];

const UserDashboard: React.FC<Props> = ({ user, onLogout, onUpdateUser }) => {
  const [fajrStatus, setFajrStatus] = useState(getFajrStatus());
  const [currentTime, setCurrentTime] = useState(getCairoDate().toLocaleTimeString('ar-EG'));
  const [aiMessage, setAiMessage] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check-in Form State
  const [isCheckInModalOpen, setCheckInModalOpen] = useState(false);
  const [selectedMosque, setSelectedMosque] = useState('');
  const [imamName, setImamName] = useState('');

  // Password Change State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Contact Admin State
  const [messageText, setMessageText] = useState('');
  const [isMsgSending, setIsMsgSending] = useState(false);

  // Determine if checked in today
  const today = getCairoDate();
  const isCheckedInToday = user.lastCheckIn && isSameDay(new Date(user.lastCheckIn), today);
  
  // Get today's record if exists
  const todayRecord = isCheckedInToday && user.attendanceLog 
    ? user.attendanceLog.find(log => isSameDay(new Date(log.date), today)) 
    : null;

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setFajrStatus(getFajrStatus());
      setCurrentTime(getCairoDate().toLocaleTimeString('ar-EG'));
    }, 10000); // Check every 10 sec

    // Initial greeting if newly logged in
    generateGreeting();

    return () => clearInterval(timer);
  }, []);

  const generateGreeting = async () => {
    if (!process.env.API_KEY) return; 
    
    // Simple logic to only generate once per session/component mount if empty
    if (aiMessage) return;

    setIsLoadingAi(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `أنشئ رسالة قصيرة جداً ومشجعة باللغة العربية لشاب اسمه ${user.fullName.split(' ')[0]} يحافظ على صلاة الفجر. لا تزيد عن 20 كلمة.`,
        });
        setAiMessage(response.text);
    } catch (e) {
        console.error("AI error", e);
    } finally {
        setIsLoadingAi(false);
    }
  };

  const handleOpenCheckIn = () => {
      if (isCheckedInToday) {
          alert("لقد قمت بتسجيل الحضور اليوم بالفعل. تقبل الله.");
          return;
      }
      setCheckInModalOpen(true);
  };

  const handleConfirmCheckIn = async () => {
    if (!selectedMosque) {
        alert("يرجى اختيار المسجد الذي صليت فيه");
        return;
    }
    if (!imamName.trim()) {
        alert("يرجى كتابة اسم الإمام");
        return;
    }

    setIsProcessing(true);
    const result = await checkInUser(user.id, selectedMosque, imamName);
    
    if (result.success && result.user) {
      alert(result.message);
      onUpdateUser(result.user);
      setCheckInModalOpen(false);
      
      // Reset form
      setSelectedMosque('');
      setImamName('');
      
      // Trigger a celebratory AI message
      if (process.env.API_KEY) {
           const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
           ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `بارك للمستخدم ${user.fullName} على صلاته للفجر اليوم في مسجد ${selectedMosque} وشجعه للاستمرار لإكمال 30 يوماً.`,
           }).then(res => setAiMessage(res.text));
      }

    } else {
      alert(result.message);
      setCheckInModalOpen(false);
    }
    setIsProcessing(false);
  };

  const handleClaimReward = async () => {
    if(!confirm("هل أنت متأكد من طلب الجائزة؟")) return;
    setIsProcessing(true);
    const updated = await claimReward(user.id);
    if (updated) {
      onUpdateUser(updated);
      alert("مبارك! تم تسجيل طلب الجائزة. تواصل مع الإدارة.");
    } else {
        alert("حدث خطأ أثناء الطلب");
    }
    setIsProcessing(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!messageText.trim()) return;
    
    setIsMsgSending(true);
    const updatedUser = await sendMessageToAdmin(user.id, messageText);
    if(updatedUser) {
        onUpdateUser(updatedUser);
        setMessageText('');
        alert("تم إرسال رسالتك إلى الإدارة بنجاح");
    } else {
        alert("فشل الإرسال");
    }
    setIsMsgSending(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword.length < 4) {
          alert("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
          return;
      }
      if (newPassword !== confirmPassword) {
          alert("كلمتا المرور غير متطابقتين");
          return;
      }

      setIsProcessing(true);
      const success = await changeUserPassword(user.id, newPassword);
      if (success) {
          alert("تم تغيير كلمة المرور بنجاح");
          setIsSettingsOpen(false);
          setNewPassword('');
          setConfirmPassword('');
      } else {
          alert("حدث خطأ أثناء تغيير كلمة المرور");
      }
      setIsProcessing(false);
  };

  // Calculate progress circle
  const progress = Math.min((user.streak / 30) * 100, 100);
  const strokeDashoffset = 440 - (440 * progress) / 100;

  // Filter messages that are "Replies" or "Admin Notifications"
  // Assuming messages from admin start with "📩" or "⚠️" or similar, 
  // OR we can just show all messages in the inbox since user messages are also stored there in the current model.
  // Ideally, we'd have a senderId, but for now we'll show all and style them.
  // Actually, sendMessageToAdmin adds to 'messages', and resetUserStreakCompletely adds to 'messages'.
  // Let's display the messages array in reverse order.
  const userMessages = user.messages ? [...user.messages].reverse() : [];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center bg-white p-4 rounded-lg shadow-md border-b-4 border-islamic-gold">
        <div>
          <h2 className="text-xl font-bold text-islamic-dark">أهلاً بك، {user.fullName}</h2>
          <p className="text-sm text-gray-500">فجر فزارة المشرق</p>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => setIsSettingsOpen(true)} className="text-gray-500 hover:text-islamic-dark font-semibold text-sm flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                الإعدادات
            </button>
            <button onClick={onLogout} className="text-red-500 hover:text-red-700 font-semibold text-sm">
            خروج
            </button>
        </div>
      </header>

      {/* Date & Time Card */}
      <div className="bg-gradient-to-r from-islamic-dark to-teal-900 text-white p-6 rounded-xl shadow-lg text-center relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-lg opacity-90">{getHijriDateString()}</p>
          <p className="text-3xl font-bold font-serif my-2">{currentTime}</p>
          <p className="text-sm opacity-80">{getGregorianDateString()}</p>
          <p className="mt-4 text-islamic-gold font-bold bg-black bg-opacity-20 inline-block px-4 py-1 rounded-full">
            توقيت الإسكندرية
          </p>
        </div>
        {/* Decorative circle */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
      </div>

      {/* AI Message */}
      {aiMessage && (
        <div className="bg-indigo-50 border-r-4 border-indigo-400 p-4 rounded shadow-sm">
           <p className="text-indigo-800 italic text-center text-lg font-serif">"{aiMessage}"</p>
        </div>
      )}

      {/* Status & Action */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Progress Card */}
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center justify-center">
            <h3 className="text-lg font-bold text-gray-700 mb-4">سجل المواظبة</h3>
            <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="10" fill="transparent" />
                    <circle cx="80" cy="80" r="70" stroke="#d4af37" strokeWidth="10" fill="transparent"
                            strokeDasharray="440" strokeDashoffset={strokeDashoffset} className="transition-all duration-1000" />
                </svg>
                <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-islamic-dark">{user.streak}</span>
                    <span className="text-xs text-gray-500">من 30 يوم</span>
                </div>
            </div>
            {user.streak >= 30 ? (
                <div className="mt-6 text-center">
                    <p className="text-green-600 font-bold mb-2">أتممت 30 يوماً! ما شاء الله</p>
                    {user.claimedReward ? (
                        <div className="bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg border border-yellow-200">
                             تم طلب الجائزة
                        </div>
                    ) : (
                        <button 
                            onClick={handleClaimReward} 
                            disabled={isProcessing}
                            className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-2 rounded-full shadow hover:scale-105 transition animate-pulse font-bold disabled:opacity-50"
                        >
                            {isProcessing ? 'جاري الطلب...' : 'استلام الجائزة'}
                        </button>
                    )}
                </div>
            ) : (
                <p className="mt-4 text-center text-gray-600 text-sm">
                    حافظ على الصلاة يومياً حتى لا يعود العد للصفر!
                </p>
            )}
        </div>

        {/* Action Card */}
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center justify-between">
            <div className="text-center w-full">
                <h3 className="text-lg font-bold text-gray-700 mb-2">تسجيل اليوم</h3>
                
                {isCheckedInToday ? (
                     <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
                        <div className="flex items-center justify-center text-green-600 mb-2">
                             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <p className="text-green-800 font-bold">تم تسجيل حضور اليوم</p>
                        {todayRecord && (
                            <div className="text-sm text-gray-600 mt-2 space-y-1">
                                <p>مسجد: <span className="font-semibold text-islamic-dark">{todayRecord.mosque}</span></p>
                                <p>الإمام: <span className="font-semibold text-islamic-dark">{todayRecord.imam}</span></p>
                            </div>
                        )}
                     </div>
                ) : (
                    <>
                        <div className="bg-gray-100 p-3 rounded mb-4">
                            <p className="text-gray-600 text-sm">موعد الفجر التقريبي</p>
                            <p className="text-2xl font-serif text-islamic-dark">{fajrStatus.fajrTime}</p>
                        </div>
                        
                        <p className={`text-sm mb-6 p-2 rounded ${fajrStatus.isOpen ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                            {fajrStatus.message}
                        </p>
                        
                        {!fajrStatus.isOpen && fajrStatus.nextFajrCountdown && (
                            <p className="text-xs text-gray-500 mb-4">
                                متبقي على الفتح: {fajrStatus.nextFajrCountdown}
                            </p>
                        )}
                    </>
                )}
            </div>

            <button
                onClick={handleOpenCheckIn}
                disabled={!fajrStatus.isOpen || !!isCheckedInToday}
                className={`w-full py-4 rounded-xl text-xl font-bold transition shadow-lg flex items-center justify-center gap-2
                    ${isCheckedInToday 
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : fajrStatus.isOpen 
                            ? 'bg-islamic-accent text-white hover:bg-emerald-600 hover:-translate-y-1' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
                {isCheckedInToday ? (
                     <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        تم التسجيل
                     </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        صليت الفجر
                    </>
                )}
            </button>
        </div>
      </div>

       {/* INBOX / NOTIFICATIONS SECTION */}
       {userMessages.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  التنبيهات والرسائل
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                  {userMessages.map((msg) => (
                      <div key={msg.id} className={`p-3 rounded-lg border text-sm ${msg.content.includes('⚠️') ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                          <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-gray-700">
                                  {msg.content.includes('⚠️') ? 'تنبيه إداري' : 'رسالة'}
                              </span>
                              <span className="text-xs text-gray-500">{new Date(msg.date).toLocaleDateString('ar-EG')}</span>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                  ))}
              </div>
          </div>
       )}

      {/* Contact Admin Section */}
      <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-bold text-islamic-dark mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              تواصل مع الإدارة
          </h3>
          <p className="text-sm text-gray-500 mb-4">هل لديك استفسار أو واجهت مشكلة؟ أرسل لنا رسالة.</p>
          <form onSubmit={handleSendMessage} className="space-y-3">
              <textarea 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-islamic-accent outline-none bg-gray-50 h-24 text-sm"
              />
              <button 
                type="submit" 
                disabled={isMsgSending || !messageText.trim()}
                className={`bg-islamic-dark text-white px-4 py-2 rounded shadow text-sm font-semibold transition ${isMsgSending ? 'opacity-50' : 'hover:bg-teal-900'}`}
              >
                  {isMsgSending ? 'جاري الإرسال...' : 'إرسال الرسالة'}
              </button>
          </form>
      </div>

        {/* Check-In Modal */}
        {isCheckInModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl transform transition-all scale-100">
                    <h3 className="text-xl font-bold text-islamic-dark mb-4 text-center border-b pb-2">تأكيد صلاة الفجر</h3>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2 text-sm">في أي مسجد صليت؟</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                            {MOSQUES.map(m => (
                                <button
                                    key={m}
                                    onClick={() => setSelectedMosque(m)}
                                    className={`p-2 rounded border text-sm transition text-center ${selectedMosque === m ? 'bg-islamic-dark text-white border-islamic-dark shadow-md' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2 text-sm">من كان الإمام في الصلاة؟</label>
                        <input
                            type="text"
                            value={imamName}
                            onChange={(e) => setImamName(e.target.value)}
                            placeholder="اكتب اسم الإمام هنا..."
                            className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-islamic-accent bg-gray-50"
                        />
                    </div>

                    {/* WARNING ALERT */}
                    <div className="bg-red-50 border-r-4 border-red-500 p-3 mb-6 rounded text-right">
                        <p className="font-bold text-red-700 text-sm">⚠️ تنبيه هام:</p>
                        <p className="text-xs text-red-600 mt-1 leading-relaxed">
                            سيتم التحقق من هذه المعلومات. إذا ثبت أن البيانات غير صحيحة، سيتم 
                            <span className="font-bold underline"> تصفير العداد </span>
                            وحذف الدورة بالكامل للمشترك.
                        </p>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button 
                            onClick={handleConfirmCheckIn}
                            disabled={isProcessing}
                            className={`flex-1 bg-islamic-accent text-white py-2 rounded-lg font-bold transition shadow ${isProcessing ? 'opacity-50' : 'hover:bg-emerald-600'}`}
                        >
                            {isProcessing ? 'جاري التسجيل...' : 'تأكيد وتسجيل'}
                        </button>
                        <button 
                            onClick={() => setCheckInModalOpen(false)}
                            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-bold hover:bg-gray-300 transition"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Change Password Modal */}
        {isSettingsOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                 <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-2xl">
                    <h3 className="text-xl font-bold text-islamic-dark mb-4 text-center">تغيير كلمة المرور</h3>
                    <form onSubmit={handleChangePassword}>
                        <div className="mb-4">
                            <label className="block text-gray-700 font-bold mb-2 text-sm">كلمة المرور الجديدة</label>
                            <input 
                                type="password" 
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-islamic-accent"
                                placeholder="******"
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2 text-sm">تأكيد كلمة المرور</label>
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-islamic-accent"
                                placeholder="******"
                            />
                        </div>
                        <div className="flex gap-2">
                             <button type="submit" disabled={isProcessing} className="flex-1 bg-islamic-dark text-white py-2 rounded hover:bg-opacity-90 transition font-bold disabled:opacity-50">
                                {isProcessing ? '...' : 'حفظ'}
                            </button>
                            <button type="button" onClick={() => setIsSettingsOpen(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300">
                                إلغاء
                            </button>
                        </div>
                    </form>
                 </div>
            </div>
        )}

    </div>
  );
};

export default UserDashboard;
