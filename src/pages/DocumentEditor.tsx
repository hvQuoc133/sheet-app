import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import * as XLSX from "xlsx";
import { Download, ArrowLeft, Loader2, Copy, CheckCircle2, Lock, LogOut } from "lucide-react";
import { SHEETS_CONFIG } from "../constants";

// Thêm các email được phép tải file vào đây
const ADMIN_EMAILS = [
  "songtulap001@gmail.com",
];

export default function DocumentEditor() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuto = searchParams.get('auto') === 'true';
  const [docInfo, setDocInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const hasDownloadedRef = useRef(false);

  // Auth state
  const auth = getAuth();
  const [user, setUser] = useState<any>(auth.currentUser);
  const [authChecking, setAuthChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Lắng nghe trạng thái đăng nhập
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (!docId || authChecking) return;
    
    // Nếu chưa đăng nhập hoặc KHÔNG CÓ QUYỀN thì ngưng, không tải database về (CHỐNG F12)
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchDoc = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "documents", docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDocInfo({ id: docSnap.id, ...docSnap.data() });
        } else {
          setErrorMsg("Không tìm thấy dữ liệu. File có thể đã bị xóa.");
        }
      } catch (error) {
        console.error("Lỗi tải trang:", error);
        setErrorMsg("Không có quyền truy cập hoặc lỗi máy chủ.");
      } finally {
         setLoading(false);
      }
    };
    fetchDoc();
  }, [docId, authChecking, isAdmin]);

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    try {
      const provider = new GoogleAuthProvider();
      // GoogleAuthProvider.credential() - popup will allow login using Google account popup
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setErrorMsg("Lỗi đăng nhập Google. Hãy chắc chắn Firebase Authentication đã bật Google Sign-In.");
    }
  };

  const handleDownload = () => {
    if (!docInfo || !docInfo.formData) return;
    const data = docInfo.formData;
    
    const wb = XLSX.utils.book_new();

    // -- Sheet 1: CREATE NEW CAMPAIGN --
    const wsCampaignData = [{
      "Action": "Add",
      "Campaign status": "",
      "Campaign": data.campaign,
      "Campaign type": data.campaignType,
      "Networks": "Google Search",
      "Budget": data.budget,
      "Budget type": "Daily",
      "Bid strategy type": "Manual CPC",
      "Language": data.language,
      "Location": "Indonesia",
      "EU political ads": "No"
    }];
    const wsCampaign = XLSX.utils.json_to_sheet(wsCampaignData, { header: SHEETS_CONFIG[0].columns });
    XLSX.utils.book_append_sheet(wb, wsCampaign, "CREATE NEW CAMPAIGN");

    // -- Sheet 2: CREATE NEW AD GROUP --
    const wsAdGroupData = [{
      "Action": "Add",
      "Status": "Enabled",
      "Campaign": data.campaign,
      "Ad group": data.adGroup,
      "Ad group type": "Standard"
    }];
    const wsAdGroup = XLSX.utils.json_to_sheet(wsAdGroupData, { header: SHEETS_CONFIG[1].columns });
    XLSX.utils.book_append_sheet(wb, wsAdGroup, "CREATE NEW AD GROUP");

    // -- Sheet 3: VBBBBBBB --
    const adsRow: any = {
      "Action": "Add",
      "Ad status": "Enabled",
      "Status": "Pending",
      "Ad strength": "Good",
      "Ad type": "Responsive search ad",
      "Campaign": data.campaign || "",
      "Ad group": data.adGroup || "",
      "Final URL": data.finalUrl || "",
      "Path 1": data.path1 || "",
      "Path 2": data.path2 || "",
    };

    // Add headlines
    if (data.headlines) {
      data.headlines.forEach((hl: string, i: number) => {
        if (hl) adsRow[`Headline ${i + 1}`] = hl;
      });
    }

    // Add descriptions
    if (data.descriptions) {
      data.descriptions.forEach((desc: string, i: number) => {
        if (desc) adsRow[`Description ${i + 1}`] = desc;
      });
    }

    const wsAds = XLSX.utils.json_to_sheet([adsRow], { header: SHEETS_CONFIG[2].columns });
    XLSX.utils.book_append_sheet(wb, wsAds, "VBBBBBBB");

    // Tải xuống file Excel
    XLSX.writeFile(wb, `${data.campaign || "Campaign"}.xlsx`);
  };

  useEffect(() => {
    // Tự động tải xuống khi có quyền (isAuthenticated) và đã có data
    if (docInfo && docInfo.formData && !hasDownloadedRef.current && isAdmin) {
      if (isAuto) {
        hasDownloadedRef.current = true;
        handleDownload();
        
        // Auto close the tab after downloading
        setTimeout(() => {
          try {
            window.close();
          } catch (e) {
            console.log(e);
          }
        }, 1500);
      }
    }
  }, [docInfo, isAuto, isAdmin]);

  const shareLink = `${window.location.origin}/d/${docId}?auto=true`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authChecking || loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  }

  // --- LUỒNG BẢO MẬT: CHƯA ĐĂNG NHẬP HOẶC KHÔNG CÓ QUYỀN ---
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          
          <h1 className="text-xl font-bold text-gray-900 mb-2">Truy cập nội bộ</h1>
          <p className="text-gray-500 mb-6 text-sm">
            {user ? "Tài khoản của bạn không có quyền xem tài liệu này." : "Bạn cần đăng nhập nội bộ (Admin) để tải dữ liệu này."}
          </p>

          {errorMsg && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded text-left">
              * {errorMsg}
            </div>
          )}

          {user && !isAdmin ? (
            <div className="space-y-3">
              <div className="text-sm border border-gray-100 bg-gray-50 p-2 rounded text-gray-600 mb-4 break-all">
                Đang dùng: <strong>{user.email}</strong>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="w-full flex justify-center items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-xl font-medium transition-colors"
              >
                <LogOut className="w-5 h-5" /> Đăng xuất
              </button>
            </div>
          ) : (
            <button 
              onClick={handleGoogleLogin}
              className="w-full flex justify-center items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-medium transition-colors shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 block" alt="Google" />
              Đăng nhập bằng Google
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- TRẠNG THÁI DOWNLOADING AUTO KHI ĐÃ NHẬP PASS ---
  if (isAuto && docInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600 font-medium">Đang tự động tải tài liệu xuống...</p>
        <p className="text-sm text-gray-400 mt-2 text-center max-w-sm">
          Nếu tab này không tự đóng, bạn có thể đóng nó lại.
        </p>
      </div>
    );
  }

  if (!docInfo) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h2 className="text-base sm:text-xl font-semibold mb-2 text-center">Không tìm thấy tài liệu</h2>
        <p className="text-gray-500 mb-6 text-sm sm:text-base text-center">{errorMsg || "Link này không tồn tại hoặc dữ liệu đã bị xoá."}</p>
        <button onClick={() => navigate("/")} className="text-blue-600 hover:underline flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Quay lại trang chủ</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Góp tên người dùng hiện tại */}
      <div className="absolute top-4 right-4 group">
        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full shadow-sm hover:bg-gray-50 active:ring-2 active:ring-gray-200 transition-all text-xs font-medium"
        >
          <img src={user?.photoURL || "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"} className="w-5 h-5 rounded-full" alt="avatar" />
          {user?.email}
          <LogOut className="w-3 h-3 ml-1 opacity-60" />
        </button>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 max-w-lg w-full text-center">
        <div className="w-16 h-16 bg-blue-50 border border-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Đã mở khóa thành công!</h1>
        <p className="text-gray-500 mb-8 text-sm sm:text-base px-2">
           Dữ liệu chiến dịch <strong className="text-gray-800">{docInfo.formData?.campaign}</strong> đã sẵn sàng.
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleDownload}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-base sm:text-lg"
          >
            <Download className="w-5 h-5 sm:w-6 sm:h-6" />
            Tải File Excel (.xlsx)
          </button>
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-left">
            <p className="text-sm font-semibold text-gray-800 mb-1">🔗 Link tải cấu hình cho Google Ads:</p>
            <p className="text-xs text-gray-500 mb-3">Copy link này dán vào ô "URL Nguồn" của Google Ads và điền tài khoản Basic Auth như bên dưới.</p>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
              <input 
                readOnly 
                value={`${window.location.origin}/api/download/${docId}`}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm text-blue-600 font-medium outline-none w-full font-mono"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/download/${docId}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2 whitespace-nowrap"
              >
                {copied ? "Đã chép" : <><Copy className="w-4 h-4"/> Copy Link</>}
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-200">
              <p className="text-gray-700 mb-1"><strong>Tên người dùng:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200">admin</code></p>
              <p className="text-gray-700"><strong>Mật khẩu:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200">123</code></p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => navigate("/")}
          className="mt-8 text-gray-500 hover:text-gray-900 font-medium inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại 2BT-TEAM-ADS
        </button>
      </div>
    </div>
  );
}
