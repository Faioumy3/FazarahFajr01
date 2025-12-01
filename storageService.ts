
import { User, UserMessage } from '../types';
import { getCairoDate, isSameDay, isYesterday } from './timeUtils';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';

const CURRENT_USER_KEY = 'fazara_current_user_id';
const DEFAULT_ADMIN_PASS = "Faioumy9954";

// Collections
const USERS_COLLECTION = 'users';
const CONFIG_COLLECTION = 'config';
const ADMIN_DOC_ID = 'admin_settings';

// Helper to handle Firestore errors gracefully
const handleFirestoreError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    if (error.code === 'not-found' || (error.message && error.message.includes('database'))) {
        return 'خطأ: قاعدة البيانات غير مفعلة. يرجى من المدير إنشاء Firestore Database في Firebase Console.';
    }
    if (error.code === 'unavailable' || (error.message && error.message.includes('offline'))) {
        return 'خطأ في الاتصال بالانترنت أو الخادم.';
    }
    return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
};

// --- AUTH & USER MANAGEMENT ---

export const registerUser = async (fullName: string, phone: string, pass: string): Promise<{ success: boolean; message: string; user?: User }> => {
  try {
    // Check if phone exists
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where("phoneNumber", "==", phone));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { success: false, message: 'رقم الهاتف مسجل بالفعل' };
    }

    const newId = Date.now().toString(); // Simple ID generation
    const newUser: User = {
      id: newId,
      fullName,
      phoneNumber: phone,
      password: pass, // In production, hash this!
      streak: 0,
      lastCheckIn: null,
      history: [],
      attendanceLog: [],
      claimedReward: false,
      messages: []
    };

    await setDoc(doc(db, USERS_COLLECTION, newId), newUser);
    localStorage.setItem(CURRENT_USER_KEY, newUser.id);
    
    return { success: true, message: 'تم التسجيل بنجاح', user: newUser };
  } catch (error) {
    const msg = handleFirestoreError(error, 'registerUser');
    return { success: false, message: msg };
  }
};

export const loginUser = async (phone: string, pass: string): Promise<{ success: boolean; message: string; user?: User }> => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where("phoneNumber", "==", phone));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: 'بيانات الدخول غير صحيحة' };
    }

    const userDoc = querySnapshot.docs[0];
    const user = userDoc.data() as User;

    if (user.password !== pass) {
      return { success: false, message: 'بيانات الدخول غير صحيحة' };
    }

    // Update streak validity on login
    const updatedUser = await checkStreakValidity(user);
    
    localStorage.setItem(CURRENT_USER_KEY, updatedUser.id);
    return { success: true, message: 'تم تسجيل الدخول', user: updatedUser };
  } catch (error) {
    const msg = handleFirestoreError(error, 'loginUser');
    return { success: false, message: msg };
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const id = localStorage.getItem(CURRENT_USER_KEY);
  if (!id) return null;

  try {
    const userRef = doc(db, USERS_COLLECTION, id);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const user = userSnap.data() as User;
      // Check streak and update if necessary
      return await checkStreakValidity(user);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
  } catch (error) {
    handleFirestoreError(error, 'getCurrentUser');
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const changeUserPassword = async (userId: string, newPass: string): Promise<boolean> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, { password: newPass });
    return true;
  } catch (error) {
    console.error("Error changing password:", error);
    return false;
  }
};

// --- ADMIN AUTH ---

export const checkAdminPassword = async (inputPass: string): Promise<boolean> => {
  try {
    const adminRef = doc(db, CONFIG_COLLECTION, ADMIN_DOC_ID);
    const adminSnap = await getDoc(adminRef);

    let realPassword = DEFAULT_ADMIN_PASS;

    if (adminSnap.exists()) {
      const data = adminSnap.data();
      realPassword = data?.password || DEFAULT_ADMIN_PASS;
    } else {
      // First time? Try to create the doc (might fail if DB not exists)
      try {
        await setDoc(adminRef, { password: DEFAULT_ADMIN_PASS });
      } catch (e) {
          console.warn("Could not create admin config, using default");
      }
    }

    return realPassword === inputPass;
  } catch (error) {
    console.error("Error checking admin pass:", error);
    // If DB error, fallback to default hardcoded pass so admin can at least try to login
    return inputPass === DEFAULT_ADMIN_PASS;
  }
};

export const changeAdminPassword = async (newPass: string) => {
  try {
    const adminRef = doc(db, CONFIG_COLLECTION, ADMIN_DOC_ID);
    await setDoc(adminRef, { password: newPass }, { merge: true });
  } catch (error) {
    console.error("Error changing admin password:", error);
    alert(handleFirestoreError(error, 'changeAdminPassword'));
  }
};

// --- CHECK IN & REWARDS ---

export const checkInUser = async (userId: string, mosque: string, imam: string): Promise<{ success: boolean; message: string; user?: User }> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return { success: false, message: 'المستخدم غير موجود' };
    
    let user = userSnap.data() as User;
    const now = getCairoDate();
    
    if (user.lastCheckIn && isSameDay(new Date(user.lastCheckIn), now)) {
        return { success: false, message: 'لقد قمت بتسجيل الحضور اليوم بالفعل' };
    }

    let newStreak = user.streak;
    if (user.lastCheckIn && isYesterday(now, new Date(user.lastCheckIn))) {
        newStreak += 1;
    } else {
        newStreak = 1;
    }

    const isoDate = now.toISOString();
    
    const updatedFields = {
      streak: newStreak,
      lastCheckIn: isoDate,
      history: [...(user.history || []), isoDate],
      attendanceLog: [...(user.attendanceLog || []), {
          date: isoDate,
          mosque,
          imam
      }]
    };

    await updateDoc(userRef, updatedFields);

    // Return updated local object
    user = { ...user, ...updatedFields };
    return { success: true, message: 'تقبل الله! تم تسجيل صلاة الفجر', user: user };
  } catch (error) {
    const msg = handleFirestoreError(error, 'checkInUser');
    return { success: false, message: msg };
  }
};

export const claimReward = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, { claimedReward: true });
    
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? (userSnap.data() as User) : null;
  } catch (error) {
    console.error("Error claiming reward:", error);
    return null;
  }
};

// --- ADMIN ACTIONS ---

export const resetUserStreakCompletely = async (userId: string, reason: string): Promise<User[]> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if(userSnap.exists()) {
        const user = userSnap.data() as User;
        const reasonMsg: UserMessage = {
            id: Date.now().toString(),
            date: getCairoDate().toISOString(),
            content: `⚠️ تنبيه من الإدارة: تم تصفير العداد.\nالسبب: ${reason}`
        };

        const updates = {
            streak: 0,
            lastCheckIn: null,
            history: [],
            claimedReward: false,
            messages: [reasonMsg, ...(user.messages || [])]
        };

        await updateDoc(userRef, updates);
    }
    
    return await getAllUsersForAdmin();
  } catch (error) {
    console.error("Error resetting streak:", error);
    return await getAllUsersForAdmin(); 
  }
};

export const sendMessageToAdmin = async (userId: string, content: string): Promise<User | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        const user = userSnap.data() as User;
        const newMessage: UserMessage = {
            id: Date.now().toString(),
            date: getCairoDate().toISOString(),
            content: content
        };
        
        const updatedMessages = [...(user.messages || []), newMessage];
        await updateDoc(userRef, { messages: updatedMessages });
        
        return { ...user, messages: updatedMessages };
    }
    return null;
  } catch (error) {
    console.error("Error sending message:", error);
    return null;
  }
};

export const sendMessageToUser = async (userId: string, content: string): Promise<User[]> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const user = userSnap.data() as User;
            const newMessage: UserMessage = {
                id: Date.now().toString(),
                date: getCairoDate().toISOString(),
                content: `📩 رد من الإدارة:\n${content}`
            };
            
            const updatedMessages = [newMessage, ...(user.messages || [])];
            await updateDoc(userRef, { messages: updatedMessages });
        }
        return await getAllUsersForAdmin();
    } catch (e) {
        console.error(e);
        return await getAllUsersForAdmin();
    }
};

export const deleteMessage = async (userId: string, msgId: string): Promise<User[]> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const user = userSnap.data() as User;
        const newMessages = (user.messages || []).filter(m => m.id !== msgId);
        await updateDoc(userRef, { messages: newMessages });
    }
    return await getAllUsersForAdmin();
  } catch (error) {
    console.error("Error deleting message:", error);
    return await getAllUsersForAdmin();
  }
};

export const getAllUsersForAdmin = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const querySnapshot = await getDocs(usersRef);
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as User);
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, 'getAllUsersForAdmin');
    return [];
  }
};

// --- HELPER ---
const checkStreakValidity = async (user: User): Promise<User> => {
  if (!user.lastCheckIn) return user;

  const now = getCairoDate();
  const last = new Date(user.lastCheckIn);

  if (isSameDay(now, last)) return user;
  if (isYesterday(now, last)) return user;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0,0,0,0);
  
  const lastDateOnly = new Date(last);
  lastDateOnly.setHours(0,0,0,0);

  // If last check-in was before yesterday (streak broken)
  if (lastDateOnly < yesterday) {
    // We need to update DB if streak is not 0
    if (user.streak !== 0) {
        try {
            const userRef = doc(db, USERS_COLLECTION, user.id);
            await updateDoc(userRef, { streak: 0 });
            user.streak = 0;
        } catch (e) {
            console.error("Error auto-updating streak:", e);
        }
    }
  }

  return user;
};
