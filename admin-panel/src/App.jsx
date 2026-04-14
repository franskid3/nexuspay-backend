import React, { useState, useEffect } from 'react';
import { getToken, onMessage } from "firebase/messaging";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { messaging } from "./firebase-config";
import UserView from './components/UserView';
import { 
  Users, CreditCard, Activity, LogOut, ShieldCheck, 
  Store, Tablet, History, Lock, PlusCircle, AlertCircle ,Shield,ChevronLeft, ChevronRight
} from 'lucide-react';

// --- CONFIGURATION ---
// App.jsx (Frontend)
const API_BASE = "https://nexuspay-backend-gmyy.onrender.com/api";;

// --- GLOBAL API HELPER (Fixes useEffect dependency warnings) ---
const request = async (endpoint, method = "GET", body = null, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "API Error");
  return data;
};

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('adminToken'));
  const [role, setRole] = useState(() => localStorage.getItem('userRole'));
  const [userId, setUserId] = useState(() => localStorage.getItem('userId') || '');
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalMerchants: 0, totalTerminals: 0, revenue: 0 });
  // Ensure this line looks exactly like this:
  const [name, setName] = useState(() => localStorage.getItem('userName') || ''); // New state for user's name
  const [userInputs, setUserInputs] = useState({ 
    email: '', password: '', name: '', phone: '', pin: '', role: 'user' 
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [isAuthSynced, setIsAuthSynced] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const setupNotifications = async () => {
  try {
        // We don't need 'const messaging = getMessaging()' here anymore
        const currentToken = await getToken(messaging, { 
          vapidKey: 'BJFmxuFMYwfdO-fanHqiwkGpW4ZO2JiOJVadDrfP82M5s0NwdS5jdbFcLcuqgxWlpCQfEjNWIvXMv4ixQ9ssRNQ' 
        });
        
        if (currentToken) {
          await request("/user/update-fcm-token", "POST", { fcmToken: currentToken }, token);
        }
            onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            // Manually trigger a browser notification or a UI toast
            new Notification(payload.notification.title, {
              body: payload.notification.body,
              icon: '/logo192.png'
            });
          });
        
      } catch (err) {
        console.error('Notification Setup Failed:', err);
      }
    };
      useEffect(() => {
        const savedToken = localStorage.getItem('adminToken');
        const savedRole = localStorage.getItem('userRole');
        const savedName = localStorage.getItem('userName');
        const savedId = localStorage.getItem('userId');

        if (savedToken) {
          setToken(savedToken);
          setRole(savedRole);
          setName(savedName || "");
          setUserId(savedId || "");
          setIsAuthSynced(true);
        }
      }, []);

      // Add this effect to App.js
useEffect(() => {
  // Only attempt to setup notifications if we have a token 
  // and the user is NOT an admin (usually users/merchants need alerts)
  if (token && role !== 'admin') {
    setupNotifications();
  }
}, [token, role]); // This triggers whenever the token or role changes
      
      
    // --- AUTH ACTIONS ---
      const handleLogin = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        const data = await request("/auth/login", "POST", {
          email: userInputs.email,
          password: userInputs.password
        });

          console.log("SERVER RESPONSE DATA:", data);
          // Save everything to localStorage
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('userRole', data.role);
          localStorage.setItem('userName', data.name);
          localStorage.setItem('userId', data.uid);

          // Update State
          setToken(data.token);
          setRole(data.role);
          setName(data.name);
          setUserId(data.uid);

         if (data.firebaseToken) {
      const auth = getAuth();
      await signInWithCustomToken(auth, data.firebaseToken);
      console.log("Firebase Auth Synced Successfully!");
      setIsAuthSynced(true); // <--- ADD THIS
    }
    
  } catch (err) {
    alert(err.message);
  } finally {
    setLoading(false);
  }
};

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await request("/auth/register", "POST", userInputs);
      alert("Registration Successful! Please sign in.");
      setAuthMode('login');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  // --- DATA FETCHING ---
  useEffect(() => {
    if (token && role === 'admin') {
      request("/admin/stats", "GET", null, token)
        .then(setStats)
        .catch(err => console.error("Stats fetch failed", err));
    }
  }, [token, role]);

  
  // --- LOGIN / REGISTRATION UI ---
  if (!token) {
    return (
      
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-t-8 border-blue-600">
          <div className="flex justify-center mb-6 text-blue-600">
            <div className="bg-blue-50 p-4 rounded-2xl">
              <ShieldCheck size={40} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
            {authMode === 'login' ? "Welcome to NexusPay" : "System Enrollment"}
          </h2>
          <p className="text-center text-slate-500 mb-8 italic text-sm">
            Secure Terminal Management Infrastructure
          </p>
          
          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {authMode === 'register' && (
              <input 
                type="text" placeholder="Full Name" required
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setUserInputs({...userInputs, name: e.target.value})}
              />
            )}
            
            <input 
              type="email" placeholder="Email Address" required
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setUserInputs({...userInputs, email: e.target.value})}
            />

            {authMode === 'register' && (
              <input 
                type="text" placeholder="Phone Number" required
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setUserInputs({...userInputs, phone: e.target.value})}
              />
            )}

            <input 
              type="password" placeholder="Password" required
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setUserInputs({...userInputs, password: e.target.value})}
            />

            {authMode === 'register' && (
              <input 
                type="text" placeholder="4-Digit PIN" maxLength={4} required
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setUserInputs({...userInputs, pin: e.target.value})}
              />
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg disabled:bg-slate-300"
            >
              {loading ? "Processing..." : (authMode === 'login' ? "Sign In" : "Create Account")}
            </button>
          </form>

          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            className="w-full text-slate-400 text-sm mt-6 hover:text-blue-600 transition-colors font-medium"
          >
            {authMode === 'login' ? "Need to register? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    );
  }

  // --- DASHBOARD UI ---
  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* SIDEBAR */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-72'} bg-slate-900 text-white flex flex-col fixed h-full shadow-2xl z-20 transition-all duration-300 ease-in-out`}
      >
        {/* COLLAPSE TOGGLE BUTTON */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 bg-blue-600 text-white rounded-full p-1 shadow-xl hover:scale-110 transition-transform z-30"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`p-8 ${isCollapsed ? 'px-4' : ''}`}>
          <div className="flex items-center gap-3 mb-10 overflow-hidden">
            <div className="bg-blue-600 p-2 rounded-lg shrink-0">
              <CreditCard size={24} />
            </div>
            {!isCollapsed && (
              <span className="text-xl font-black tracking-tighter uppercase whitespace-nowrap">
                NEXUS<span className="text-blue-500">PAY</span>
              </span>
            )}
          </div>
          
          <nav className="space-y-2">
            <SidebarItem 
              icon={<Activity size={20} />} 
              label={!isCollapsed ? "Overview" : ""} 
              active={activeTab === 'overview'} 
              onClick={() => setActiveTab('overview')} 
            />
            {role === 'admin' && (
              <>
                {!isCollapsed && (
                  <div className="pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    Management
                  </div>
                )}
                <SidebarItem 
                  icon={<Users size={20} />} 
                  label={!isCollapsed ? "User Registry" : ""} 
                  active={activeTab === 'users'} 
                  onClick={() => setActiveTab('users')} 
                />
                <SidebarItem 
                  icon={<Store size={20} />} 
                  label={!isCollapsed ? "Merchant Hub" : ""} 
                  active={activeTab === 'merchants'} 
                  onClick={() => setActiveTab('merchants')} 
                />
                <SidebarItem 
                  icon={<Tablet size={20} />} 
                  label={!isCollapsed ? "Terminal Fleet" : ""} 
                  active={activeTab === 'terminals'} 
                  onClick={() => setActiveTab('terminals')} 
                />
              </>
            )}
          </nav>
        </div>

        <button 
          onClick={handleLogout} 
          className={`mt-auto m-6 flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all font-bold ${isCollapsed ? 'justify-center p-2' : ''}`}
        >
          <LogOut size={20} /> 
          {!isCollapsed && "Logout"}
        </button>
      </aside>

      {/* MAIN CONTENT AREA - Margin adjusts based on sidebar state */}
      <main className={`flex-1 ${isCollapsed ? 'ml-20' : 'ml-72'} p-12 transition-all duration-300 ease-in-out`}>
  {/* Header Section */}
  <header className="flex justify-between items-center mb-12">
    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
      <h1 className="text-4xl font-black text-slate-900 capitalize tracking-tight">
        Welcome, {name || role}
      </h1>
      <div className="flex items-center gap-2 mt-1">
        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
        <p className="text-slate-500 text-sm font-medium">System Online • Monitoring Active</p>
      </div>
    </div>

    {/* Optional Profile Quick-View */}
    <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
        {name?.charAt(0) || 'A'}
      </div>
      <div>
        <p className="text-xs font-black text-slate-900 leading-none">{name}</p>
        <p className="text-[10px] font-bold text-blue-600 uppercase mt-1 tracking-tighter">{role}</p>
      </div>
    </div>
  </header>

  {/* TAB CONTENT - Using a clean switch or conditional logic */}
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
    {role === 'admin' && (
      <>
        {activeTab === 'overview' && <AdminView stats={stats} token={token} refreshDashboardStats={() => request("/admin/stats", "GET", null, token).then(setStats)} />}
        {activeTab === 'users' && <AdminView stats={stats} token={token} />} 
        {activeTab === 'merchants' && <MerchantHubView token={token} />}
        {activeTab === 'terminals' && <TerminalFleetView token={token} />}
      </>
    )}

    {role === 'user' && isAuthSynced && (
      <UserView token={token} userName={name} userId={userId} request={request}/>
    )}
    
    {role === 'merchant' && <MerchantView token={token} userName={name} />}
  </div>
</main>
    </div>
  );
}

// --- ADMIN-VIEWS ---
function AdminView({ stats, token, refreshDashboardStats }) {
  const [showReg, setShowReg] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const data = await request("/admin/users", "GET", null, token);
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.uid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

    const handleTopUp = async (userId) => {
  const amount = prompt("Enter amount to Top Up (₦):");
  if (!amount || isNaN(amount) || amount <= 0) return;
  
  try {
    const response = await request("/admin/topup", "POST", { userId, amount: Number(amount) }, token);
    alert(response.message);
    
    // 1. Refresh the user list below
    fetchUsers(); 
    
    // 2. Refresh the big Stat Cards at the top (Notice: no 'props.' here anymore)
    if (refreshDashboardStats) refreshDashboardStats();

  } catch (err) {
    alert("Top-up failed: " + err.message);
  }
};

   const handleToggleStatus = async (userId, currentStatus) => {
  // Toggle between 'active' and 'blocked'
  const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
  
  if (!window.confirm(`Are you sure you want to set this user to ${newStatus}?`)) return;

  try {
    await request("/admin/toggle-status", "POST", { userId, status: newStatus }, token);
    fetchUsers(); // Refresh the list to show the change
  } catch (err) {
    alert("Action failed: " + err.message);
  }
};

  return (
    <div className="space-y-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Client Base" value={stats.totalUsers || 0} icon={<Users color="#3b82f6" />} />
        <StatCard label="Business Partners" value={stats.totalMerchants || 0} icon={<Store color="#10b981" />} />
        <StatCard label="Active Nodes" value={stats.totalTerminals || 0} icon={<Tablet color="#8b5cf6" />} />
        <StatCard label="Network Volume" value={`₦${(stats.networkVolume || 0).toLocaleString()}`} icon={<Activity color="#f59e0b" />} />
      </div>

      <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h3 className="text-xl font-bold text-slate-800">User Registry & Governance</h3>
          
          <div className="flex w-full md:w-auto gap-3">
            {/* 🔍 THE MISSING SEARCH BAR */}
            {!showReg && (
              <div className="relative flex-1 md:w-64">
                <input 
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Users className="absolute left-3 top-3.5 text-slate-400" size={16} />
              </div>
            )}

            <button 
              onClick={() => setShowReg(!showReg)}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-transform whitespace-nowrap"
            >
              <PlusCircle size={20} /> 
              {showReg ? "Close" : "New Account"}
            </button>
          </div>
        </div>

        {showReg ? (
          <RegistrationForm close={() => setShowReg(false)} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Active Accounts</h4>
              
              {/* 📜 SCROLLABLE CONTAINER FOR 100+ USERS */}
              <div className="max-h-[600px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {loading ? (
                  <p className="text-slate-400 animate-pulse">Synchronizing directory...</p>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <div key={user.uid} className={`flex items-center justify-between p-4 rounded-2xl border mb-3 ${user.status === 'blocked' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-bold ${user.status === 'blocked' ? 'text-red-700' : 'text-slate-700'}`}>{user.name}</p>
                          {user.status === 'blocked' && (
                            <span className="bg-red-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase">Suspended</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">{user.uid}</p>
                        <p className="text-xs font-black text-blue-600">
                        ₦{(user.accountBalance || user.balance || 0).toLocaleString()}
  </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleTopUp(user.uid)}
                          className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-600 hover:text-white transition-all shadow-sm"
                        >
                          + Top Up
                        </button>
                        
                        <button 
        onClick={() => handleToggleStatus(user.uid, user.status)}
        className={`p-2 rounded-xl border transition-all ${user.status === 'blocked' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-red-600 border-red-100 hover:bg-red-600 hover:text-white'}`}
        title={user.status === 'blocked' ? "Activate User" : "Suspend User"}
      >
        <AlertCircle size={18} />
      </button>
    </div>
  </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed">
                    <p className="text-slate-400 text-sm">No users found matching your search.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <AdminQuickActions />
              <CardAssignment token={token} onComplete={fetchUsers} />
              <TerminalAssignment />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}


function AdminQuickActions() {
  const [promoData, setPromoData] = useState({ uid: '', businessName: '' });
  const [loading, setLoading] = useState(false);

  const handlePromote = async () => {
    if (!promoData.uid) return alert("Please enter a User UID");
    setLoading(true);
    try {
      await request("/admin/promote", "POST", promoData, localStorage.getItem('adminToken'));
      alert("User Upgraded Successfully!");
    } catch (err) { 
      alert(err.message); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 bg-slate-900 rounded-[24px] text-white shadow-xl border border-slate-800">
      <h4 className="font-bold mb-4 flex items-center gap-2 text-blue-400">
        <ShieldCheck size={18}/> Admin Quick Promotion
      </h4>
      
      <div className="space-y-3">
        <input 
          placeholder="Paste User UID" 
          className="w-full bg-white/10 p-3 rounded-xl outline-none focus:ring-1 ring-blue-500 placeholder:text-slate-500 text-sm"
          onChange={e => setPromoData({...promoData, uid: e.target.value})}
        />
        
        <input 
          placeholder="Business Name (e.g. Star Coffee)" 
          className="w-full bg-white/10 p-3 rounded-xl outline-none focus:ring-1 ring-blue-500 placeholder:text-slate-500 text-sm"
          onChange={e => setPromoData({...promoData, businessName: e.target.value})}
        />

        <button 
          onClick={handlePromote} 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-500 transition-all active:scale-[0.98] disabled:bg-slate-700"
        >
          {loading ? "Processing..." : "Upgrade Account"}
        </button>
      </div>
    </div>
  );
}

function CardAssignment({ token, onComplete }) {
  const [data, setData] = useState({ userId: '', rfidUid: '' });
  const [loading, setLoading] = useState(false);

  const handleLinkCard = async () => {
    if (!data.userId || !data.rfidUid) return alert("Please fill all fields");
    setLoading(true);
    try {
      // Using your existing linkCardToUser route
      await request("/admin/link-card", "POST", data, token);
      alert("RFID Card Linked & Account Activated!");
      if (onComplete) onComplete();
      setData({ userId: '', rfidUid: '' }); // Reset form
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 bg-slate-800 rounded-[24px] text-white border border-slate-700 shadow-xl">
      <h4 className="font-bold mb-4 flex items-center gap-2 text-emerald-400">
        <CreditCard size={18}/> Issue User Card
      </h4>
      <div className="space-y-3">
        <input 
          placeholder="User UID (from Registry)" 
          value={data.userId}
          className="w-full bg-white/10 p-3 rounded-xl outline-none focus:ring-1 ring-emerald-500 placeholder:text-slate-500 text-sm"
          onChange={e => setData({...data, userId: e.target.value})}
        />
        <input 
          placeholder="RFID Card UID (Scan Card)" 
          value={data.rfidUid}
          className="w-full bg-white/10 p-3 rounded-xl outline-none focus:ring-1 ring-emerald-500 placeholder:text-slate-500 text-sm"
          onChange={e => setData({...data, rfidUid: e.target.value})}
        />
        <button 
          onClick={handleLinkCard} 
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black hover:bg-emerald-500 transition-all active:scale-[0.98] disabled:bg-slate-700"
        >
          {loading ? "Activating..." : "Link & Activate Card"}
        </button>
      </div>
    </div>
  );
}

// Add this brand new component below AdminQuickActions to handle ESP32s
function TerminalAssignment() {
  const [data, setData] = useState({ macAddress: '', merchantId: '', label: '' });

  const handleAssign = async () => {
    try {
      await request("/admin/assign-terminal", "POST", data, localStorage.getItem('adminToken'));
      alert("Terminal Assigned Successfully!");
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="mt-8 p-6 bg-blue-600 rounded-[24px] text-white">
      <h4 className="font-bold mb-4 flex items-center gap-2"><Tablet size={18}/> Link  Terminal</h4>
      <div className="space-y-3">
        <input 
          placeholder="Device MAC Address" 
          className="w-full bg-white/20 p-3 rounded-xl outline-none placeholder:text-blue-100"
          onChange={e => setData({...data, macAddress: e.target.value})}
        />
        <input 
          placeholder="Merchant UID" 
          className="w-full bg-white/20 p-3 rounded-xl outline-none placeholder:text-blue-100"
          onChange={e => setData({...data, merchantId: e.target.value})}
        />
        <button onClick={handleAssign} className="w-full bg-white text-blue-600 py-3 rounded-xl font-black hover:bg-blue-50 transition-colors">
          Link Hardware
        </button>
      </div>
    </div>
  );
}

// --- REUSABLE COMPONENTS ---
function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h4>
      </div>
      <div className="bg-slate-50 p-4 rounded-2xl">{icon}</div>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all font-bold text-sm ${
        active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon} {label}
    </div>
  );
}

// --- REGISTRATION FORM COMPONENT ---
function RegistrationForm({ close }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', pin: '', role: 'user' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Hits your public registration route
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to register");

      alert(`Successfully Provisioned: ${form.name} as ${form.role}`);
      close(); // Hide the form on success
      window.location.reload(); // Refresh to see updated stats
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="col-span-full mb-2">
        <h4 className="font-bold text-slate-700">Account Credentials</h4>
      </div>
      
      <input 
        placeholder="Full Name" required 
        className="p-4 rounded-xl border bg-white outline-none focus:ring-2 focus:ring-blue-500" 
        onChange={e => setForm({...form, name: e.target.value})} 
      />
      <input 
        placeholder="Email Address" type="email" required 
        className="p-4 rounded-xl border bg-white outline-none focus:ring-2 focus:ring-blue-500" 
        onChange={e => setForm({...form, email: e.target.value})} 
      />
      <input 
        placeholder="Phone Number" required 
        className="p-4 rounded-xl border bg-white outline-none focus:ring-2 focus:ring-blue-500" 
        onChange={e => setForm({...form, phone: e.target.value})} 
      />
      <input 
        placeholder="Login Password" type="password" required 
        className="p-4 rounded-xl border bg-white outline-none focus:ring-2 focus:ring-blue-500" 
        onChange={e => setForm({...form, password: e.target.value})} 
      />
      <input 
        placeholder="4-Digit PIN" maxLength={4} required 
        className="p-4 rounded-xl border bg-white outline-none focus:ring-2 focus:ring-blue-500" 
        onChange={e => setForm({...form, pin: e.target.value})} 
      />
      
      <select 
        className="p-4 rounded-xl border bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
        onChange={e => setForm({...form, role: e.target.value})}
      >
        <option value="user">User Account (Default)</option>
        <option value="merchant">Merchant Account</option>
      </select>

      <div className="col-span-full flex gap-3 mt-4">
        <button 
          type="submit" 
          disabled={loading} 
          className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:bg-slate-300"
        >
          {loading ? "Processing..." : "Authorize & Create Account"}
        </button>
        <button 
          type="button" 
          onClick={close} 
          className="px-8 bg-white text-slate-600 border rounded-2xl font-bold hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function MerchantView({ token }) {
  const [mStats, setMStats] = useState({ balance: 0, terminals: [], transactions: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch merchant-specific data
    request("/merchant/dashboard", "GET", null, token)
      .then(data => {
        setMStats(data);
        setLoading(false);
      })
      .catch(err => console.error("Merchant fetch error", err));
  }, [token]);

  if (loading) return <div className="text-center p-20 animate-pulse text-slate-400">Syncing Ledger...</div>;

  return (
    <div className="space-y-10">
      {/* Merchant Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Total Revenue" 
          value={`₦${mStats.balance.toLocaleString()}`} 
          icon={<CreditCard color="#10b981" />} 
        />
        <StatCard 
          label="Active Terminals" 
          value={mStats.terminals.length} 
          icon={<Tablet color="#3b82f6" />} 
        />
        <StatCard 
          label="Today's Taps" 
          value={mStats.transactions.length} 
          icon={<Activity color="#f59e0b" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Terminal Fleet List */}
        <div className="lg:col-span-1 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Tablet size={20} className="text-blue-500" /> My Terminals
          </h3>
          <div className="space-y-4">
            {mStats.terminals.map((term, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-700 text-sm">{term.label}</p>
                  <p className="text-[10px] text-slate-400 font-mono uppercase">{term.macAddress}</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Live Transaction Stream</h3>
          <div className="overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 font-bold border-b">
                  <th className="pb-4">User</th>
                  <th className="pb-4">Amount</th>
                  <th className="pb-4">Time</th>
                  <th className="pb-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {mStats.transactions.map((tx, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-4 font-medium text-slate-700">{tx.userName}</td>
                    <td className="py-4 font-bold">₦{tx.amount}</td>
                    <td className="py-4 text-slate-400 text-xs">{tx.time}</td>
                    <td className="py-4 text-right">
                      <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-[10px] font-bold">
                        SUCCESS
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


function MerchantHubView({ token }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request("/admin/merchants", "GET", null, token)
      .then(data => {
        setMerchants(data);
        setLoading(false);
      })
      .catch(err => console.error("Merchant Hub fetch failed", err));
  }, [token]);

  return (
    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Merchant Hub</h3>
          <p className="text-slate-500 text-sm">Authorized business partners and revenue streams</p>
        </div>
        <span className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">
          {merchants.length} Active Partners
        </span>
      </div>
      
      <div className="overflow-hidden rounded-2xl border border-slate-100">
        <table className="w-full text-left bg-slate-50">
          <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 font-black">
            <tr>
              <th className="p-4">Business Name</th>
              <th className="p-4">Owner Email</th>
              <th className="p-4">Network ID</th>
              <th className="p-4 text-right">Volume (₦)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="p-10 text-center text-slate-400 animate-pulse">Syncing Merchant Registry...</td></tr>
            ) : merchants.length > 0 ? (
              merchants.map((m) => (
                <tr key={m.uid} className="border-t border-slate-200 text-sm hover:bg-white transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                        <Store size={16} />
                      </div>
                      <span className="font-bold text-slate-700">{m.businessName || m.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500">{m.email}</td>
                  <td className="p-4 font-mono text-[10px] text-slate-400 uppercase">{m.uid}</td>
                  <td className="p-4 text-right font-black text-emerald-600">
                    ₦{(m.balance || m.accountBalance || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4" className="p-10 text-center text-slate-400">No registered merchants found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function TerminalFleetView({ token }) {
  const [terminals, setTerminals] = useState([]);

  useEffect(() => {
    request("/admin/terminals", "GET", null, token)
      .then(setTerminals)
      .catch(err => console.error(err));
  }, [token]);

  return (
    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">

      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Terminal Fleet</h3>
          <p className="text-slate-500 text-sm">Managed hardware nodes across the ecosystem</p>
        </div>
        <span className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">
          {terminals.length} Active Terminals
        </span>
      </div>
      
      <div className="overflow-hidden rounded-2xl border border-slate-100">
        <table className="w-full text-left bg-slate-50">
          <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 font-black">
            <tr>
              <th className="p-4">Terminal Label</th>
              <th className="p-4">MAC Address</th>
              <th className="p-4">Owner</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {terminals.map((t, index) => (
              // ADD THE KEY PROP HERE
              // Use t.macAddress if it exists, otherwise use the index
              <tr key={t.macAddress || index} className="border-t border-slate-200 text-sm hover:bg-white transition-colors">
                <td className="p-4 font-bold text-slate-700">{t.label || "Unnamed Node"}</td>
                <td className="p-4 font-mono text-xs text-slate-400">{t.macAddress}</td>
                <td className="p-4 text-slate-600">{t.merchantName || 'Unassigned'}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    <span className="text-[10px] font-bold text-green-600 uppercase">Online</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



