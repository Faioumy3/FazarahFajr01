import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
    getAllUsersForAdmin, 
    resetUserStreakCompletely, 
    deleteMessage, 
    checkAdminPassword, 
    changeAdminPassword 
} from '../services/storageService';
import { getCairoDate, isSameDay } from '../services/timeUtils';

interface Props {
  onBack: () => void;
}

type Tab = 'USERS' | 'TODAY_LOGS' | 'MESSAGES' | 'SETTINGS';

const AdminPanel: React.FC<Props> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('USERS');
  const [loading, setLoading] = useState(false);

  // Change Password State
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');

  // Refresh users list whenever tab changes to ensure fresh data
  useEffect(() => {
      if (isAuthenticated) {
          fetchUsers();
      }
  }, [isAuthenticated, activeTab]);

  const fetchUsers = async () => {
      setLoading(true);
      const data = await getAllUsersForAdmin();
      setUsers(data);
      setLoading(false);
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (await checkAdminPassword(password)) {
      setIsAuthenticated(true);
      await fetchUsers();
    } else {
      alert("كلمة المرور غير صحيحة");
    }
    setLoading(false);
  };

  const handleResetStreak = async (e: React.MouseEvent, userId: string, userName: string) => {
    e.preventDefault();
    // 1. Confirm Action
    if (!window.confirm(`هل أنت متأكد من تصفير عداد المشترك "${userName}" وإعادته للبداية؟`)) {
        return;
    }
    
    // 2. Ask for Reason
    const reason = window.prompt("من فضلك أدخل سبب إعادة العد (سيتم إرساله للمشترك):", "تغيب عن صلاة الفجر ليوم كامل");
    
    if (reason && reason.trim().length > 0) {
        setLoading(true);
        const updatedList = await resetUserStreakCompletely(userId, reason);
        setUsers(updatedList);
        setLoading(false);
        alert(`تم إعادة العداد للمشترك ${userName} وتم إرسال رسالة بالسبب.`);
    } else if (reason !== null) {
        alert("إلغاء العملية: يجب كتابة سبب للإعادة.");
    }
  };

  const handleDeleteMessage = async (e: React.MouseEvent, userId: string, msgId: string) => {
      e.preventDefault();
      if(window.confirm("هل تريد حذف هذه الرسالة؟")) {
          setLoading(true);
          const updatedList = await deleteMessage(userId, msgId);
          setUsers(updatedList);
          setLoading(false);
      }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newAdminPass.length < 4) {
          alert("كلمة المرور قصيرة جداً");
          return;
      }
      if (newAdminPass !== confirmAdminPass) {
          alert("كلمتا المرور غير متطابقتين");
          return;
      }
      setLoading(true);
      await changeAdminPassword(newAdminPass);
      alert("تم تغيير كلمة مرور المدير بنجاح.");
      setNewAdminPass('');
      setConfirmAdminPass('');
      setLoading(false);
  };

  const today = getCairoDate();
  
  const getTodayLogs = () => {
    const logs = [];
    for (const user of users) {
      if (user.attendanceLog) {
        const todayEntry = user.attendanceLog.find(log => isSameDay(new Date(log.date), today));
        if (todayEntry) {
          logs.push({
            user: user,
            record: todayEntry
          });
        }
      }
    }
    return logs;
  };

  const getAllMessages = () => {
    const msgs: {user: User, content: string, date: string, id: string}[] = [];
    users.forEach(u => {
        if(u.messages && u.messages.length > 0) {
            u.messages.forEach(m => {
                msgs.push({
                    user: u,
                    content: m.content,
                    date: m.date,
                    id: m.id
                });
            });
        }
    });
    return msgs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const todayLogs = getTodayLogs();
  const allMessages = getAllMessages();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full border-t-4 border-islamic-dark">
          <h2 className="text-2xl font-bold mb-4 text-center text-islamic-dark font-serif">لوحة تحكم المشرف</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-1">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-islamic-accent outline-none"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-islamic-dark text-white p-2 rounded hover:bg-opacity-90 transition disabled:opacity-50">
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
            <button type="button" onClick={onBack} className="w-full text-gray-500 text-sm hover:underline">
              العودة للرئيسية
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-islamic-dark font-serif">لوحة التحكم</h2>
        <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 rounded ${activeTab === 'USERS' ? 'bg-islamic-dark text-white' : 'bg-white text-gray-700'}`}>
                المشتركون
            </button>
            <button onClick={() => setActiveTab('TODAY_LOGS')} className={`px-4 py-2 rounded ${activeTab === 'TODAY_LOGS' ? 'bg-islamic-dark text-white' : 'bg-white text-gray-700'}`}>
                سجل اليوم ({todayLogs.length})
            </button>
            <button onClick={() => setActiveTab('MESSAGES')} className={`px-4 py-2 rounded ${activeTab === 'MESSAGES' ? 'bg-islamic-dark text-white' : 'bg-white text-gray-700'}`}>
                الرسائل ({allMessages.length})
            </button>
            <button onClick={() => setActiveTab('SETTINGS')} className={`px-4 py-2 rounded ${activeTab === 'SETTINGS' ? 'bg-islamic-dark text-white' : 'bg-white text-gray-700'}`}>
                الإعدادات
            </button>
            <button onClick={onBack} className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
            خروج
            </button>
        </div>
      </div>

      {loading && <div className="text-center py-2 text-islamic-accent">جاري تحديث البيانات...</div>}

      <div className="overflow-x-auto bg-white rounded-lg shadow min-h-[400px]">
        {activeTab === 'USERS' && (
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                الاسم
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                الهاتف
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                أيام المواظبة
              </th>
               <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                حالة الجائزة
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                إجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">لا يوجد مشتركين حتى الآن</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap font-bold">{user.fullName}</p>
                    <p className="text-xs text-gray-400">كلمة السر: {user.password}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap" dir="ltr">{user.phoneNumber}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                    <span className={`relative inline-block px-3 py-1 font-semibold leading-tight ${user.streak >= 30 ? 'text-green-900' : 'text-gray-900'}`}>
                      <span aria-hidden className={`absolute inset-0 opacity-50 rounded-full ${user.streak >= 30 ? 'bg-green-200' : 'bg-gray-200'}`}></span>
                      <span className="relative">{user.streak} / 30</span>
                    </span>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                      {user.claimedReward ? (
                          <div className="flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold border border-yellow-300">
                                  تم طلب الجائزة
                              </span>
                          </div>
                      ) : (
                          <span className="text-gray-400 text-xs">-</span>
                      )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                      <button 
                        onClick={(e) => handleResetStreak(e, user.id, user.fullName)}
                        className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded hover:bg-red-100 text-xs font-bold transition shadow-sm"
                      >
                          إعادة العد
                      </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
        
        {activeTab === 'TODAY_LOGS' && (
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-islamic-light text-right text-xs font-semibold text-islamic-dark uppercase tracking-wider">
                    الاسم
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-islamic-light text-right text-xs font-semibold text-islamic-dark uppercase tracking-wider">
                    وقت التسجيل
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-islamic-light text-right text-xs font-semibold text-islamic-dark uppercase tracking-wider">
                    المسجد
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-islamic-light text-right text-xs font-semibold text-islamic-dark uppercase tracking-wider">
                    الإمام
                  </th>
                </tr>
              </thead>
              <tbody>
                  {todayLogs.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-4">لم يسجل أحد صلاة الفجر اليوم بعد</td></tr>
                  ) : (
                      todayLogs.map((log, idx) => (
                          <tr key={idx}>
                              <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm font-bold">{log.user.fullName}</td>
                              <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm dir-ltr text-right">
                                  {new Date(log.record.date).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}
                              </td>
                              <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{log.record.mosque}</td>
                              <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{log.record.imam}</td>
                          </tr>
                      ))
                  )}
              </tbody>
            </table>
        )}

        {activeTab === 'MESSAGES' && (
            <div className="p-4">
                {allMessages.length === 0 ? (
                    <p className="text-center text-gray-500">لا توجد رسائل جديدة</p>
                ) : (
                    <div className="space-y-4">
                        {allMessages.map((msg) => (
                            <div key={msg.id} className="border border-gray-200 rounded p-4 bg-gray-50 shadow-sm relative">
                                <button 
                                    onClick={(e) => handleDeleteMessage(e, msg.user.id, msg.id)}
                                    className="absolute top-2 left-2 text-red-400 hover:text-red-600"
                                    title="حذف الرسالة"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-islamic-dark">{msg.user.fullName}</h4>
                                    <span className="text-xs text-gray-500">{new Date(msg.date).toLocaleString('ar-EG')}</span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                                <div className="mt-2 text-xs text-gray-500">
                                    رقم الهاتف: {msg.user.phoneNumber}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'SETTINGS' && (
            <div className="p-8 max-w-xl mx-auto">
                <h3 className="text-xl font-bold mb-6 text-islamic-dark border-b pb-2">إعدادات لوحة التحكم</h3>
                
                <form onSubmit={handleChangePassword} className="bg-gray-50 p-6 rounded-lg border shadow-sm">
                    <h4 className="font-bold text-gray-700 mb-4">تغيير كلمة مرور المشرف</h4>
                    
                    <div className="mb-4">
                        <label className="block text-gray-600 mb-2 text-sm">كلمة المرور الجديدة</label>
                        <input 
                            type="password"
                            value={newAdminPass}
                            onChange={(e) => setNewAdminPass(e.target.value)}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-islamic-accent outline-none"
                            placeholder="أدخل كلمة مرور قوية"
                        />
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-gray-600 mb-2 text-sm">تأكيد كلمة المرور</label>
                        <input 
                            type="password"
                            value={confirmAdminPass}
                            onChange={(e) => setConfirmAdminPass(e.target.value)}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-islamic-accent outline-none"
                            placeholder="أعد إدخال كلمة المرور"
                        />
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-islamic-dark text-white py-2 rounded hover:bg-opacity-90 transition font-bold disabled:opacity-50">
                        {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                </form>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;