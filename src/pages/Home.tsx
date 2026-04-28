import { useState, useEffect, useRef } from "react";
import { db, auth, logout } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { Plus, UploadCloud, Link as LinkIcon, Loader2, Edit, Save, FilePlus, Copy, ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

const DEFAULT_FORM_DATA = {
  campaign: "",
  campaignType: "Search",
  budget: "",
  language: "en",
  location: "",
  adGroup: "",
  finalUrl: "",
  path1: "",
  path2: "",
  headlines: Array(15).fill(""),
  descriptions: Array(4).fill(""),
};

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [loading, setLoading] = useState(false);
  const [fetchingDocs, setFetchingDocs] = useState(true);
  
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [myDocs, setMyDocs] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const locationWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationWrapRef.current && !locationWrapRef.current.contains(event.target as Node)) {
        setShowLocationSelect(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchDocs = async (user: User) => {
      try {
        setFetchingDocs(true);
        const q = query(collection(db, "documents"), where("ownerId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as any)
        }));
        docs.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
          return timeB - timeA;
        });
        setMyDocs(docs);
      } catch (error) {
        console.error("Error loading list:", error);
      } finally {
        setFetchingDocs(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setAuthChecking(false);
      if (user) {
        fetchDocs(user);
      } else {
        setMyDocs([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCreateOrUpdateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (formData.location && !COUNTRIES.find(c => c.toLowerCase() === formData.location.toLowerCase().trim())) {
      toast.error("Please enter a standard English country name (e.g., Vietnam, United States)");
      return;
    }
    
    setLoading(true);
    try {
      let newDocId = editingDocId;
      
      if (editingDocId) {
        // Cập nhật
        const docRef = doc(db, "documents", editingDocId);
        await updateDoc(docRef, {
          title: formData.campaign || "Untitled",
          formData: formData,
          updatedAt: serverTimestamp(),
        });
        
        // Cập nhật state local
        setMyDocs(prev => prev.map(d => 
          d.id === editingDocId 
            ? { ...d, title: formData.campaign || "Untitled", formData, updatedAt: { toMillis: () => Date.now() } } 
            : d
        ));
        toast.success("Campaign updated successfully!");
      } else {
        // Tạo mới
        const docRef = await addDoc(collection(db, "documents"), {
          ownerId: currentUser.uid,
          title: formData.campaign || "Untitled",
          formData: formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        newDocId = docRef.id;
        
        const newDocPreview = {
          id: docRef.id,
          ownerId: currentUser.uid,
          title: formData.campaign || "Untitled",
          formData: formData,
          updatedAt: { toMillis: () => Date.now() }
        };
        
        setMyDocs(prev => [newDocPreview, ...prev]);
        setEditingDocId(newDocId);
        toast.success("Campaign created successfully!");
      }
    } catch (error) {
       console.error("Error saving document:", error);
       toast.error("Error saving data. Please check connection or Firebase.");
    } finally {
      setLoading(false);
    }
  };

  const updateArrayField = (field: 'headlines' | 'descriptions', index: number, value: string) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };
  
  const handleEditClick = (docData: any) => {
    // Đảm bảo headlines có đúng 15 trường trong form
    let loadedHeadlines = Array.isArray(docData.formData?.headlines) ? [...docData.formData.headlines] : Array(15).fill("");
    if (loadedHeadlines.length < 15) {
      loadedHeadlines = [...loadedHeadlines, ...Array(15 - loadedHeadlines.length).fill("")];
    } else if (loadedHeadlines.length > 15) {
      loadedHeadlines = loadedHeadlines.slice(0, 15);
    }
    
    let loadedDescriptions = Array.isArray(docData.formData?.descriptions) ? [...docData.formData.descriptions] : Array(4).fill("");
    if (loadedDescriptions.length < 4) {
      loadedDescriptions = [...loadedDescriptions, ...Array(4 - loadedDescriptions.length).fill("")];
    }

    setFormData({
      ...DEFAULT_FORM_DATA,
      ...docData.formData,
      headlines: loadedHeadlines,
      descriptions: loadedDescriptions
    });
    setEditingDocId(docData.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleAddNewDoc = () => {
    setFormData(DEFAULT_FORM_DATA);
    setEditingDocId(null);
  };

  const handleCopyLink = (docId: string) => {
    const link = `${window.location.origin}/d/${docId}?auto=true`;
    navigator.clipboard.writeText(link);
    setCopiedId(docId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (authChecking || !currentUser) {
    return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-6 px-3 sm:py-10 sm:px-4 relative">
      {/* Nút đăng xuất góc trên phải */}
      <div className="absolute top-4 right-4 group hidden sm:block">
        <button 
          onClick={logout}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full shadow-sm hover:bg-gray-50 active:ring-2 active:ring-gray-200 transition-all text-xs font-medium"
        >
          {currentUser.photoURL ? (
            <img src={currentUser.photoURL} className="w-5 h-5 rounded-full" alt="avatar" />
          ) : (
            <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">{currentUser.email?.charAt(0).toUpperCase()}</div>
          )}
          <span className="max-w-[150px] truncate">{currentUser.email?.replace('@2bt.com', '')}</span>
          <LogOut className="w-3 h-3 ml-1 opacity-60" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-start">
        
        {/* Form add camping */}
        <div className="w-full md:w-3/4">
          <div className="text-center mb-5">
            <h1 className="text-2xl font-bold text-blue-700 flex items-center justify-center gap-3">
              2BT-TEAM-ADS
            </h1>
            <p className="text-gray-500 mt-1 text-xs sm:text-sm">Fill in the fields to export an Excel file with 3 sheets</p>
          </div>

          <form onSubmit={handleCreateOrUpdateDocument} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-800">
                {editingDocId ? (
                  <span className="flex items-center gap-2 text-amber-600"><Edit className="w-4 h-4"/> Editing: {formData.campaign || 'Untitled'}</span>
                ) : (
                  <span className="flex items-center gap-2 text-green-600"><Plus className="w-4 h-4"/> Create new campaign</span>
                )}
              </h2>
              {editingDocId && (
                <button type="button" onClick={handleAddNewDoc} className="text-xs flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                  <FilePlus className="w-3.5 h-3.5"/> New
                </button>
              )}
            </div>

            <div className="space-y-5 sm:space-y-6">
              
              {/* Thông tin CHUNG */}
              <div className="bg-blue-50/50 p-3 sm:p-4 rounded-xl border border-blue-100">
                <h2 className="text-sm sm:text-base font-bold text-blue-800 mb-3 flex items-center gap-2">
                  General Information <span className="text-[10px] sm:text-xs font-normal text-blue-600">(Used across all sheets)</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Campaign</label>
                    <input required value={formData.campaign} onChange={(e) => setFormData({...formData, campaign: e.target.value})} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm" />
                  </div>
                </div>
              </div>

              {/* CREATE NEW CAMPAIGN */}
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 border-b pb-1.5">Sheet 1: CREATE NEW CAMPAIGN</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Budget</label>
                    <input value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow text-sm" />
                  </div>
                  <div className="relative" ref={locationWrapRef}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Location <span className="text-[10px] text-gray-500 font-normal">(Standard English country name)</span></label>
                    <input 
                      value={formData.location} 
                      onChange={(e) => {
                         setFormData({...formData, location: e.target.value});
                         setShowLocationSelect(true);
                      }} 
                      onFocus={() => setShowLocationSelect(true)}
                      placeholder="Example: Vietnam, United States" 
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow text-sm" 
                    />
                    {showLocationSelect && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {COUNTRIES.filter(c => c.toLowerCase().includes(formData.location.toLowerCase())).length > 0 ? (
                          COUNTRIES.filter(c => c.toLowerCase().includes(formData.location.toLowerCase())).map(c => (
                            <div 
                              key={c} 
                              onClick={() => {
                                setFormData({...formData, location: c});
                                setShowLocationSelect(false);
                              }}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-green-50 cursor-pointer transition-colors"
                            >
                              {c}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">No countries found.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CREATE NEW AD GROUP */}
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 border-b pb-1.5">Sheet 2: CREATE NEW AD GROUP</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ad group</label>
                    <input required value={formData.adGroup} onChange={(e) => setFormData({...formData, adGroup: e.target.value})} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm" />
                  </div>
                </div>
              </div>

              {/* VBBBBBBB */}
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 border-b pb-1.5">Sheet 3: VBBBBBBB (Ad)</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Final URL</label>
                    <input value={formData.finalUrl} onChange={(e) => setFormData({...formData, finalUrl: e.target.value})} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Path 1</label>
                    <input value={formData.path1} onChange={(e) => setFormData({...formData, path1: e.target.value})} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Path 2</label>
                    <input value={formData.path2} onChange={(e) => setFormData({...formData, path2: e.target.value})} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow text-sm" />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-bold text-gray-700 mb-2 bg-gray-100 p-1.5 rounded text-center">Headlines (1-15)</label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                    {formData.headlines.map((hl, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-100">
                        <span className="text-[10px] sm:text-xs font-medium text-gray-500 min-w-[60px] text-right pr-1.5">Headline {i + 1}</span>
                        <input value={hl} onChange={(e) => updateArrayField('headlines', i, e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 outline-none transition-shadow text-xs sm:text-sm min-w-0" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 bg-gray-100 p-1.5 rounded text-center">Descriptions (1-4)</label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                    {formData.descriptions.map((desc, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-100">
                        <span className="text-[10px] sm:text-xs font-medium text-gray-500 min-w-[70px] text-right pr-1.5">Description {i + 1}</span>
                        <input value={desc} onChange={(e) => updateArrayField('descriptions', i, e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 outline-none transition-shadow text-xs sm:text-sm min-w-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-200 flex justify-end">
                <button 
                  type="submit" 
                  disabled={loading}
                  className={`${editingDocId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'} text-white font-medium px-6 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 text-sm sm:w-auto justify-center`}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingDocId ? <Save className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />)}
                  {editingDocId ? 'Update' : 'Save'}
                </button>
              </div>
              
            </div>
          </form>
        </div>

        {/* List file */}
        <div className="w-full md:w-1/4 space-y-4">
          <div className="sm:hidden flex justify-between items-center mb-4">
            <span className="text-sm text-gray-600 font-medium truncate max-w-[200px]">{currentUser.email?.replace('@2bt.com', '')}</span>
             <button 
              onClick={logout}
              className="flex items-center gap-1.5 bg-red-50 text-red-600 px-2 py-1 rounded-lg border border-red-100 hover:bg-red-100 text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" /> Log out
            </button>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200 sticky top-6">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex justify-between items-center">
              Saved Campaigns
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{myDocs.length}</span>
            </h3>
            
            {fetchingDocs ? (
              <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : myDocs.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-5 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No campaigns created yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {myDocs.map((docItem) => (
                  <div key={docItem.id} className={`p-2.5 rounded-xl border transition-all ${editingDocId === docItem.id ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-1.5">
                      <h4 className="font-semibold text-gray-800 text-sm truncate pr-2 flex-1" title={docItem.title}>
                        {docItem.title}
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <button 
                        onClick={() => handleCopyLink(docItem.id)}
                        className={`flex items-center gap-1 px-1.5 py-1 rounded-md border transition-colors ${copiedId === docItem.id ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {copiedId === docItem.id ? <><Copy className="w-3 h-3"/> Copied</> : <><LinkIcon className="w-3 h-3"/> Copy Link</>}
                      </button>
                      <a 
                        href={`/d/${docItem.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-1 rounded-md hover:bg-blue-100 transition-colors"
                      >
                         <ExternalLink className="w-3 h-3" /> Open Link
                      </a>
                      <button 
                        onClick={() => handleEditClick(docItem)}
                        className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-1 rounded-md hover:bg-amber-100 transition-colors ml-auto"
                      >
                         <Edit className="w-3 h-3" /> Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


