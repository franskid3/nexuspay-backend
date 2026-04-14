import React, { useState, useEffect } from 'react';
import { Activity, PlusCircle, CreditCard, Shield, History, Store } from 'lucide-react';
import { doc, onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase-config"; // Your frontend firebase config
import { getAuth, onAuthStateChanged } from "firebase/auth";

function UserView({ token, userName, userId, request }) {
  const [data, setData] = useState({ 
    balance: 0, 
    activity: [], 
    status: 'active', 
    lastId: null 
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

 const fetchUserDashboard = async () => {
  setRefreshing(true);
  try {
    const [profile, activityRes] = await Promise.all([
      request("/user/profile", "GET", null, token).catch(e => {
        console.error("Profile API Error:", e);
        return {};
      }),
      request("/user/activity", "GET", null, token).catch(e => {
        console.error("Activity API Error:", e); // THIS WILL TELL US WHY IT'S EMPTY
        return { activities: [], lastId: null };
      })
    ]);

    setData({
      balance: Number(profile?.accountBalance || 0),
      status: profile?.status || 'active',
      activity: Array.isArray(activityRes.activities) ? activityRes.activities : [],
      lastId: activityRes.lastId || null
    });
  } catch (err) {
    console.error("General Sync Error:", err);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

useEffect(() => {
  const auth = getAuth();
  
  // Use Firebase's own listener to wait for the user to be "Signed In"
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user && userId) {
      console.log("Auth verified: ", user.uid, " Starting listeners...");

      // 1. Initial Fetch for pagination data
      fetchUserDashboard();

      // 2. Real-time User Profile Listener
      const unsubscribeUser = onSnapshot(doc(db, "users", userId), (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          setData(prev => ({
            ...prev,
            balance: Number(userData.accountBalance || 0),
            status: userData.status || 'active'
          }));
        }
      });

      // 3. Real-time Activity Log Listener
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(5)
      );

      const unsubscribeActivity = onSnapshot(q, (snapshot) => {
        const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(prev => ({ ...prev, activity: activities }));
      }, (error) => {
        console.error("Transactions Listener failed:", error);
      });

      // We need to return these inside a cleanup function later
      window._cleanupFirestore = () => {
        unsubscribeUser();
        unsubscribeActivity();
      };
    } else {
      console.log("Waiting for Firebase Auth sync...");
    }
  });

  return () => {
    unsubscribeAuth();
    if (window._cleanupFirestore) window._cleanupFirestore();
  };
}, [userId]); // Now we only need userId as a dependency

  // 2. Load More logic (Pagination)
  const loadMore = async () => {
    if (!data.lastId || refreshing) return;
    setRefreshing(true);
    try {
      const nextSet = await request(`/user/activity?lastVisibleId=${data.lastId}`, "GET", null, token);
      
      setData(prev => ({
        ...prev,
        activity: [...prev.activity, ...(nextSet.activities || [])],
        lastId: nextSet.lastId || null
      }));
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // 3. Action Handlers
  const handleToggleFreeze = async () => {
    try {
      const res = await request("/user/toggle-freeze", "POST", { userId }, token);
      alert(res.message);
      fetchUserDashboard();
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handlePinChange = async () => {
    const newPin = prompt("Enter new 4-digit PIN:");
    if (!newPin || newPin.length !== 4 || isNaN(newPin)) {
      return alert("Please enter a valid 4-digit number");
    }
    try {
      await request("/user/change-pin", "POST", { userId, newPin }, token);
      alert("PIN updated successfully!");
    } catch (err) {
      alert("Failed to change PIN: " + err.message);
    }
  };

  const handleDeposit = async () => {
    const amount = prompt("Enter amount to deposit (₦):");
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    try {
      const res = await request("/user/initialize-payment", "POST", { amount: Number(amount) }, token);
      if (res.authorization_url) window.location.href = res.authorization_url;
    } catch (err) {
      alert("Payment initialization failed: " + err.message);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium">Securing Connection...</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="px-2">
        <h3 className="text-xl font-bold text-slate-800">Hello, {userName || 'User'}!</h3>
        <p className="text-slate-500 text-sm font-medium">Ready to make a move today?</p>
      </div>

      {/* 💳 Digital Wallet Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8 rounded-[40px] text-white shadow-2xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="flex justify-between items-start mb-10">
          <div>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-[0.2em] mb-2">Available Credits</p>
            <h2 className="text-5xl font-black tracking-tight">
              ₦{data.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <button onClick={fetchUserDashboard} className={`p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all ${refreshing ? 'animate-spin' : ''}`}>
            <Activity size={18} />
          </button>
        </div>
        <div className="flex gap-4">
          <button onClick={handleDeposit} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2">
            <PlusCircle size={18} /> Add Funds
          </button>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <CreditCard size={24} className={data.status === 'active' ? "text-blue-300" : "text-red-400"} />
          </div>
        </div>
      </div>

      {/* 🛡️ Card Security Controls */}
      <div className="bg-slate-800 p-6 rounded-[32px] border border-slate-700 shadow-xl">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Shield size={18} className="text-emerald-400"/> Card Security
        </h3>
        <div className="flex gap-3">
          <button 
            onClick={handleToggleFreeze}
            className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              data.status === 'active' 
                ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white' 
                : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
            }`}
          >
            {data.status === 'active' ? "Freeze Card" : "Unfreeze Card"}
          </button>
          <button onClick={handlePinChange} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-600">
            Change PIN
          </button>
        </div>
      </div>

      {/* 📜 Transaction Ledger */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <History size={20} className="text-blue-600" /> Activity Log
          </h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
            Live Updates
          </span>
        </div>
        
        <div className="space-y-4">
          {data.activity.length > 0 ? (
            <>
              {data.activity.map((tx, idx) => (
                <div key={tx.id || idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${tx.type === 'topup' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {tx.type === 'topup' ? <PlusCircle size={18} /> : <Store size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm line-clamp-1">
                        {tx.type === 'topup' ? "Account Top-up" : (tx.businessName || "Terminal Payment")}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {tx.timestamp?._seconds 
                          ? new Date(tx.timestamp._seconds * 1000).toLocaleString() 
                          : 'Processed'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-sm ${tx.type === 'topup' ? 'text-green-600' : 'text-slate-800'}`}>
                      {tx.type === 'topup' ? `+₦${tx.amount}` : `-₦${tx.amount}`}
                    </p>
                    <p className="text-[8px] uppercase font-bold text-slate-300 tracking-tighter">Verified</p>
                  </div>
                </div>
              ))}

              {/* Corrected Load More Button Position */}
              {data.lastId && (
                <div className="flex justify-center mt-6">
                  <button 
                    onClick={loadMore}
                    disabled={refreshing}
                    className="px-6 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 text-xs"
                  >
                    {refreshing ? "Loading..." : "View Older Transactions"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Activity size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No recent movements detected.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserView;