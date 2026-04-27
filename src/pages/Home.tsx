import { useState, useEffect } from "react";
import { db, signInAnonymouslyWithFirebase } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { FileSpreadsheet, Plus, UploadCloud, Link as LinkIcon, Loader2, Edit, Save, FilePlus, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_FORM_DATA = {
  campaign: "",
  campaignType: "",
  budget: "",
  language: "",
  location: "",
  adGroup: "",
  finalUrl: "",
  path1: "",
  path2: "",
  headlines: Array(15).fill(""),
  descriptions: Array(4).fill(""),
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [fetchingDocs, setFetchingDocs] = useState(true);
  
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [myDocs, setMyDocs] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setFetchingDocs(true);
        const user = await signInAnonymouslyWithFirebase();
        if (user) {
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
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách:", error);
      } finally {
        setFetchingDocs(false);
      }
    };
    fetchDocs();
  }, []);

  const handleCreateOrUpdateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signInAnonymouslyWithFirebase();
      
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
        toast.success("Đã sửa chiến dịch thành công!");
      } else {
        // Tạo mới
        const docRef = await addDoc(collection(db, "documents"), {
          ownerId: user.uid,
          title: formData.campaign || "Untitled",
          formData: formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        newDocId = docRef.id;
        
        const newDocPreview = {
          id: docRef.id,
          ownerId: user.uid,
          title: formData.campaign || "Untitled",
          formData: formData,
          updatedAt: { toMillis: () => Date.now() }
        };
        
        setMyDocs(prev => [newDocPreview, ...prev]);
        setEditingDocId(newDocId);
        toast.success("Đã thêm chiến dịch mới thành công!");
      }
    } catch (error) {
       console.error("Error saving document:", error);
       toast.error("Lỗi khi lưu dữ liệu. Có thể do kết nối mạng hoặc Firebase.");
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-6 px-3 sm:py-10 sm:px-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6 items-start">
        
        {/* FORM CỘT TRÁI (HOẶC HIỂN THỊ PHÍA TRÊN Ở MOBILE) */}
        <div className="w-full md:w-2/3">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-blue-700 flex items-center justify-center gap-3">
              2BT-TEAM-ADS
            </h1>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">Điền các trường để render ra file Excel với 3 trang tính</p>
          </div>

          <form onSubmit={handleCreateOrUpdateDocument} className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {editingDocId ? (
                  <span className="flex items-center gap-2 text-amber-600"><Edit className="w-5 h-5"/> Đang sửa: {formData.campaign || 'Chưa có tên'}</span>
                ) : (
                  <span className="flex items-center gap-2 text-green-600"><Plus className="w-5 h-5"/> Thêm chiến dịch mới</span>
                )}
              </h2>
              {editingDocId && (
                <button type="button" onClick={handleAddNewDoc} className="text-sm flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                  <FilePlus className="w-4 h-4"/> Thêm mới
                </button>
              )}
            </div>

            <div className="space-y-6 sm:space-y-8">
              
              {/* Thông tin CHUNG */}
              <div className="bg-blue-50/50 p-4 sm:p-5 rounded-xl border border-blue-100">
                <h2 className="text-base sm:text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                  Thông tin chung <span className="text-xs sm:text-sm font-normal text-blue-600">(Dùng chung kết nối các bảng)</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
                    <input required value={formData.campaign} onChange={(e) => setFormData({...formData, campaign: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                  </div>
                </div>
              </div>

              {/* CREATE NEW CAMPAIGN */}
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4 border-b pb-2">Bảng 1: CREATE NEW CAMPAIGN</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campaign type</label>
                    <input value={formData.campaignType} onChange={(e) => setFormData({...formData, campaignType: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                    <input value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <input value={formData.language} onChange={(e) => setFormData({...formData, language: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow" />
                  </div>
                </div>
              </div>

              {/* CREATE NEW AD GROUP */}
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4 border-b pb-2">Bảng 2: CREATE NEW AD GROUP</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ad group</label>
                    <input required value={formData.adGroup} onChange={(e) => setFormData({...formData, adGroup: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                  </div>
                </div>
              </div>

              {/* VBBBBBBB */}
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4 border-b pb-2">Bảng 3: VBBBBBBB (Quảng Cáo)</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Final URL</label>
                    <input value={formData.finalUrl} onChange={(e) => setFormData({...formData, finalUrl: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Path 1</label>
                    <input value={formData.path1} onChange={(e) => setFormData({...formData, path1: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Path 2</label>
                    <input value={formData.path2} onChange={(e) => setFormData({...formData, path2: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow" />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-3 bg-gray-100 p-2 rounded text-center">Headlines (1-15)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formData.headlines.map((hl, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                        <span className="text-xs sm:text-sm font-medium text-gray-500 min-w-[70px] text-right pr-2">Headline {i + 1}</span>
                        <input value={hl} onChange={(e) => updateArrayField('headlines', i, e.target.value)} className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 outline-none transition-shadow text-sm sm:text-base min-w-0" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 bg-gray-100 p-2 rounded text-center">Descriptions (1-4)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formData.descriptions.map((desc, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                        <span className="text-xs sm:text-sm font-medium text-gray-500 min-w-[80px] text-right pr-2">Description {i + 1}</span>
                        <input value={desc} onChange={(e) => updateArrayField('descriptions', i, e.target.value)} className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 outline-none transition-shadow text-sm sm:text-base min-w-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-200 flex justify-end">
                <button 
                  type="submit" 
                  disabled={loading}
                  className={`${editingDocId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'} text-white font-medium px-8 py-3 sm:py-3.5 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-3 text-base sm:text-lg w-full sm:w-auto justify-center`}
                >
                  {loading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : (editingDocId ? <Save className="w-5 h-5 sm:w-6 sm:h-6" /> : <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />)}
                  {editingDocId ? 'Cập Nhật (Sửa)' : 'Lưu Mới (Thêm)'}
                </button>
              </div>
              
            </div>
          </form>
        </div>

        {/* DANH SÁCH FILE VỪA TẠO CỘT PHẢI (HOẶC BÊN DƯỚI Ở MOBILE) */}
        <div className="w-full md:w-1/3 space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 sticky top-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex justify-between items-center">
              Danh sách File
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{myDocs.length}</span>
            </h3>
            
            {fetchingDocs ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : myDocs.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Chưa có file nào được tạo.
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {myDocs.map((docItem) => (
                  <div key={docItem.id} className={`p-3 rounded-xl border transition-all ${editingDocId === docItem.id ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-800 truncate pr-2 flex-1" title={docItem.title}>
                        {docItem.title}
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button 
                        onClick={() => handleCopyLink(docItem.id)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors ${copiedId === docItem.id ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {copiedId === docItem.id ? <><Copy className="w-3.5 h-3.5"/> Copy xong</> : <><LinkIcon className="w-3.5 h-3.5"/> Copy Link</>}
                      </button>
                      <a 
                        href={`/d/${docItem.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                         <ExternalLink className="w-3.5 h-3.5" /> Mở Link
                      </a>
                      <button 
                        onClick={() => handleEditClick(docItem)}
                        className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1.5 rounded-lg hover:bg-amber-100 transition-colors ml-auto"
                      >
                         <Edit className="w-3.5 h-3.5" /> Sửa
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


