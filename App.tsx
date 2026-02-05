
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  BarChart3, 
  FileUp, 
  Table as TableIcon, 
  Download, 
  Settings2, 
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  FileSpreadsheet,
  X,
  Save,
  ShieldCheck,
  Zap,
  PackageSearch,
  UploadCloud,
  Database,
  RefreshCw,
  PlusCircle,
  FileText,
  ShoppingBag,
  Percent,
  Search,
  ChevronRight,
  Layers,
  Archive
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GroupType, ImportItem, BasicUnitMap } from './types';
import { processImportData } from './services/GeminiService';

// --- Sub-components ---

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string, icon: any, color: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

const GroupCard = ({ 
  type, 
  isSelected, 
  onClick, 
  description, 
  color 
}: { 
  type: GroupType, 
  isSelected: boolean, 
  onClick: () => void, 
  description: string,
  color: string
}) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col items-start p-5 rounded-xl border-2 transition-all text-left w-full h-full
      ${isSelected 
        ? `${color} border-current shadow-md scale-[1.02]` 
        : 'border-slate-200 bg-white hover:border-slate-300'}`}
  >
    <div className="flex items-center gap-2 mb-2">
      <span className={`w-3 h-3 rounded-full ${isSelected ? 'animate-pulse bg-current' : 'bg-slate-300'}`}></span>
      <h3 className="font-bold text-lg">[{type}]</h3>
    </div>
    <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    {isSelected && (
      <div className="absolute top-4 right-4 text-current">
        <CheckCircle2 className="w-6 h-6" />
      </div>
    )}
  </button>
);

// --- Basic Unit Management Modal ---
const BasicUnitModal = ({ 
  isOpen, 
  onClose, 
  onUpdateMap, 
  currentMap 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onUpdateMap: (map: BasicUnitMap, mode: 'replace' | 'update') => void,
  currentMap: BasicUnitMap 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [tempData, setTempData] = useState<BasicUnitMap | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];
        const newMap: BasicUnitMap = {};
        
        json.forEach(row => {
          const code = String(row['Mã Hàng'] || row['Mã Sản phẩm'] || row['Ma Hang'] || row['Mã SP'] || row['Item Code'] || row['SKU'] || '').trim();
          const unit = String(row['ĐVT cơ bản'] || row['ĐVT'] || row['Don vi tinh'] || row['Unit'] || row['Đơn vị'] || '').trim();
          const name = String(row['Tên Hàng'] || row['Ten Hang'] || row['Tên sản phẩm'] || row['Tên SP'] || row['Product Name'] || '').trim();
          const group = String(row['Nhóm Hàng'] || row['Nhom Hang'] || row['Nhóm sản phẩm'] || row['Nhóm SP'] || row['Category'] || row['Nhóm'] || 'Chưa phân nhóm').trim();
          
          if (code && unit) {
            newMap[code] = { 
              itemName: name || 'N/A', 
              basicUnit: unit,
              groupName: group
            };
          }
        });

        if (Object.keys(newMap).length === 0) {
          alert("Không tìm thấy dữ liệu hợp lệ. Hệ thống yêu cầu ít nhất 2 cột: [Mã Hàng] và [ĐVT cơ bản].");
          setFileName(null);
        } else {
          setTempData(newMap);
        }
      } catch (err) {
        alert("Lỗi khi đọc file Excel.");
      } finally { setIsProcessing(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportCurrentMaster = () => {
    const data = Object.entries(currentMap).map(([code, info]) => ({
      'Mã Hàng': code,
      'Tên Hàng': info.itemName,
      'ĐVT cơ bản': info.basicUnit,
      'Nhóm Hàng': info.groupName || 'Chưa phân nhóm'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterData_DVT");
    XLSX.writeFile(wb, "Du_Lieu_DVT_Master.xlsx");
  };

  const filteredMapEntries = useMemo(() => {
    return Object.entries(currentMap).filter(([code, info]) => 
      code.toLowerCase().includes(searchQuery.toLowerCase()) || 
      info.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (info.groupName && info.groupName.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 200); 
  }, [currentMap, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-200 flex flex-col h-[90vh]">
        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-br from-indigo-50/50 to-white">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200/50 flex items-center justify-center">
              <PackageSearch className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Master Data ĐVT (Quy tắc mapping)</h2>
              <p className="text-xs text-indigo-600 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                Hệ thống lưu trữ bền vững v7.6
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportCurrentMaster} className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 border border-indigo-200 rounded-2xl text-[10px] font-black shadow-sm hover:bg-indigo-50 transition-all uppercase tracking-widest">
              <Download className="w-4 h-4" /> Tải về dữ liệu Master
            </button>
            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600">
              <X className="w-7 h-7" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-10 space-y-8">
          <div className="flex flex-col md:flex-row gap-6 items-center">
             <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-4 flex items-center gap-8 shadow-inner">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mã hàng khả dụng</p>
                  <p className="text-2xl font-black text-slate-800 tabular-nums">{Object.keys(currentMap).length.toLocaleString()}</p>
                </div>
                <div className="w-px h-10 bg-slate-200"></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trạng thái cơ sở dữ liệu</p>
                  <div className="flex items-center gap-2 text-emerald-600 font-black text-xs">
                    <Archive className="w-4 h-4" /> ĐÃ LƯU BỀN VỮNG
                  </div>
                </div>
             </div>
             <div className="relative flex-1 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm nhanh mã hàng, tên sản phẩm hoặc nhóm hàng..." 
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-8">
            <div className="lg:w-3/4 border border-slate-100 rounded-[2rem] overflow-hidden flex flex-col bg-white shadow-xl">
              <div className="px-8 py-5 bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 grid grid-cols-12 gap-6 tracking-widest">
                <span className="col-span-2">Mã hàng hóa</span>
                <span className="col-span-8">Chi tiết sản phẩm (Tên & Nhóm Hàng)</span>
                <span className="col-span-2 text-right">ĐVT cơ sở</span>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {filteredMapEntries.length > 0 ? (
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {filteredMapEntries.map(([code, info]) => (
                        <tr key={code} className="hover:bg-slate-50 transition-all group grid grid-cols-12 gap-6 items-center px-8 border-l-4 border-l-transparent hover:border-l-indigo-500">
                          <td className="py-5 font-bold text-slate-500 col-span-2 font-mono tracking-tighter">{code}</td>
                          <td className="py-5 col-span-8">
                             <div className="flex flex-col gap-1.5">
                                <span className="text-slate-900 font-black text-sm group-hover:text-indigo-600 transition-colors leading-tight">
                                  {info.itemName || '--- Chưa xác định tên ---'}
                                </span>
                                <div className="flex items-center gap-2">
                                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md text-[9px] text-slate-500 font-black uppercase tracking-tight">
                                      <Layers className="w-3 h-3 text-indigo-400" />
                                      {info.groupName || 'Chưa phân nhóm'}
                                   </div>
                                </div>
                             </div>
                          </td>
                          <td className="py-5 text-right col-span-2">
                             <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl font-black uppercase text-[10px] shadow-sm border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                               {info.basicUnit}
                             </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 opacity-50">
                    <Database className="w-20 h-20 stroke-[1]" />
                    <p className="font-bold text-lg">Không tìm thấy mã hàng trong kho lưu trữ</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:w-1/4 flex flex-col gap-6">
               {!tempData ? (
                <label className={`relative flex flex-col items-center justify-center gap-6 w-full h-full border-4 border-dashed rounded-[2rem] cursor-pointer transition-all ${isProcessing ? 'bg-slate-50' : 'hover:border-indigo-400 hover:bg-indigo-50/50 border-slate-200 bg-slate-50/20 shadow-inner group'}`}>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} disabled={isProcessing} />
                  {isProcessing ? <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" /> : <>
                    <div className="p-7 bg-white rounded-[2rem] shadow-xl group-hover:scale-110 transition-transform duration-300 border border-slate-100">
                      <UploadCloud className="w-12 h-12 text-indigo-600" />
                    </div>
                    <div className="text-center px-6">
                      <span className="font-black text-slate-800 block text-xl mb-2">Nạp File Mới</span>
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">Hệ thống tự động lưu<br/>vào cơ sở dữ liệu trình duyệt</p>
                    </div>
                  </>}
                </label>
              ) : (
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white h-full flex flex-col justify-between shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10"><Database className="w-32 h-32" /></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-10">
                      <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-900/50"><FileSpreadsheet className="w-6 h-6 text-white" /></div>
                      <button onClick={() => setTempData(null)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X className="w-5 h-5 text-white/50" /></button>
                    </div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-3 tracking-[0.2em]">Tệp tin đang kiểm tra</p>
                    <p className="font-bold truncate text-base mb-10">{fileName}</p>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-10 backdrop-blur-md">
                       <p className="text-[10px] font-black mb-2 text-white/40 uppercase tracking-widest">Mã hàng phát hiện</p>
                       <div className="flex items-baseline gap-2">
                          <p className="text-4xl font-black tabular-nums">{Object.keys(tempData).length.toLocaleString()}</p>
                          <span className="text-[10px] font-bold opacity-30 uppercase">Sản phẩm</span>
                       </div>
                    </div>
                  </div>
                  <div className="space-y-4 relative z-10">
                    <button 
                      onClick={() => { onUpdateMap(tempData, 'replace'); setTempData(null); }} 
                      className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[1.5rem] font-black uppercase text-[10px] flex items-center justify-center gap-3 transition-all tracking-widest"
                    >
                      <RefreshCw className="w-4 h-4" /> THAY THẾ TOÀN BỘ
                    </button>
                    <button 
                      onClick={() => { onUpdateMap(tempData, 'update'); setTempData(null); }} 
                      className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black uppercase text-[10px] flex items-center justify-center gap-3 shadow-2xl shadow-indigo-900/50 hover:-translate-y-1 transition-all tracking-widest"
                    >
                      <PlusCircle className="w-4 h-4" /> CẬP NHẬT NỐI TIẾP
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImportItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBasicUnitOpen, setIsBasicUnitOpen] = useState(false);
  const [basicUnitMap, setBasicUnitMap] = useState<BasicUnitMap>({});

  const VAT_RATE = 0.08; 
  const STORAGE_KEY = 'MISA_BASIC_UNIT_MAP';

  // Đồng bộ bền vững dữ liệu Master Data từ LocalStorage và lắng nghe thay đổi từ các tab khác
  useEffect(() => {
    const loadData = () => {
      const savedMap = localStorage.getItem(STORAGE_KEY);
      if (savedMap) {
        try { 
          const parsed = JSON.parse(savedMap);
          setBasicUnitMap(parsed); 
        } catch (e) { 
          console.error("Lỗi đồng bộ dữ liệu lưu trữ:", e); 
        }
      }
    };

    loadData();

    // Lắng nghe sự kiện storage để đồng bộ đa tab thời gian thực
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setBasicUnitMap(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Lỗi đồng bộ đa tab:", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sử dụng functional update để tránh race conditions khi cập nhật map lớn
  const updateBasicUnitMap = useCallback((newEntries: BasicUnitMap, mode: 'replace' | 'update') => {
    setBasicUnitMap(prevMap => {
      const finalMap = mode === 'replace' ? newEntries : { ...prevMap, ...newEntries };
      // Chỉ lưu vào localStorage sau khi trạng thái đã được tính toán chính xác
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalMap));
      return finalMap;
    });
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedGroup) return;
    setError(null);
    setIsProcessing(true);
    const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const rawData = await processImportData(base64, mimeType, selectedGroup);
        
        // Sử dụng basicUnitMap hiện tại tại thời điểm hoàn thành xử lý AI
        const processedData = rawData.map(item => {
          const mappedInfo = basicUnitMap[item.itemCode.trim()];
          let finalUnit = item.unit;
          let finalName = item.itemName;
          
          if (mappedInfo) {
            if (item.unit.toLowerCase().includes('lẻ') && mappedInfo.basicUnit) {
              finalUnit = mappedInfo.basicUnit;
            }
            if (mappedInfo.itemName && mappedInfo.itemName !== 'N/A') {
              finalName = mappedInfo.itemName;
            }
          }
          return { ...item, unit: finalUnit, itemName: finalName };
        });
        setResults(processedData);
      } catch (err: any) { 
        setError(err.message || 'Lỗi xử lý file từ hệ thống AI.'); 
      } finally { 
        setIsProcessing(false); 
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const exportToMisaTemplate = () => {
    if (results.length === 0) return;

    const misaHeaders = [
      'Ngày đơn hàng (*)', 'Số đơn hàng (*)', 'Trạng thái', 'Ngày giao hàng', 'Tính giá thành',
      'Mã khách hàng', 'Tên khách hàng', 'Địa chỉ', 'Mã số thuế', 'Diễn giải',
      'Là đơn đặt hàng phát sinh trước khi sử dụng phần mềm', 'Mã hàng (*)', 'Tên hàng',
      'Là dòng ghi chú', 'Hàng khuyến mại', 'Mã kho', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền',
      'Tỷ lệ CK (%)', 'Tiền chiết khấu', 'thuế GTGT', '% thuế suất KHAC', 'Tiền thuế GTGT', 'Biển kiểm soát'
    ];

    const misaRows = results.map(item => {
      const unitPriceBeforeTax = Math.round(item.unitPrice / (1 + VAT_RATE));
      const amountBeforeTax = Math.round(item.amount / (1 + VAT_RATE));
      const discountAmountBeforeTax = Math.round(item.discountAmount / (1 + VAT_RATE));
      const afterDiscountAmountBeforeTax = Math.round(item.afterDiscountAmount / (1 + VAT_RATE));
      const vatAmount = Math.round(afterDiscountAmountBeforeTax * VAT_RATE);

      return [
        '', item.orderId, 'Chưa thực hiện', '', 'Có', '', item.customerName, '', '', '', '', item.itemCode, item.itemName,
        '', '', '', item.unit, item.quantity, unitPriceBeforeTax, amountBeforeTax, item.discountRate, discountAmountBeforeTax,
        8, '', vatAmount, item.totalPayment
      ];
    });

    const fullData = [];
    fullData[0] = ["FILE MẪU ĐƠN ĐẶT HÀNG ĐỂ NHẬP VÀO PHẦN MỀM AMIS ACCOUNTING"]; 
    fullData[7] = misaHeaders; 
    misaRows.forEach(row => fullData.push(row)); 

    const ws = XLSX.utils.aoa_to_sheet(fullData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MISA DDH");
    const timestamp = new Date().getTime();
    XLSX.writeFile(wb, `Export_Misa_Template_${timestamp}.xlsx`);
  };

  const totalAmount = useMemo(() => results.reduce((acc, curr) => acc + curr.afterDiscountAmount, 0), [results]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 font-sans">
      <BasicUnitModal isOpen={isBasicUnitOpen} onClose={() => setIsBasicUnitOpen(false)} onUpdateMap={updateBasicUnitMap} currentMap={basicUnitMap} />
      
      <aside className="w-full lg:w-72 bg-slate-900 text-white p-8 hidden lg:flex flex-col border-r border-slate-800">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-900/50 flex items-center justify-center">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="font-black text-2xl tracking-tighter uppercase block leading-none">MISA AMIS</span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Import Pro Engine</span>
          </div>
        </div>
        <nav className="space-y-3 flex-1">
          <button className="w-full flex items-center gap-4 px-5 py-4 bg-white/5 text-white/60 rounded-2xl font-bold transition-all border border-transparent hover:bg-white/10">
            <LayoutDashboard className="w-5 h-5" />Dashboard
          </button>
          <button onClick={() => setIsBasicUnitOpen(true)} className="w-full flex items-center gap-4 px-5 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] group transition-all shadow-2xl shadow-indigo-900/50 border border-indigo-400/30">
            <PackageSearch className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
            <div className="text-left">
              <span className="font-black block text-sm uppercase tracking-tight">Master Data ĐVT</span>
              <span className="text-[9px] opacity-70 uppercase font-black tracking-widest flex items-center gap-1.5 mt-1">
                <Archive className="w-2.5 h-2.5" /> Đồng bộ bền vững
              </span>
            </div>
          </button>
        </nav>
        <div className="pt-8 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black text-slate-500 uppercase">Version</span>
            <span className="text-[10px] font-black text-indigo-400">7.6 PRO Stable</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Master Data Synced</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 px-8 py-5 sticky top-0 z-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase italic">
              <Zap className="w-7 h-7 text-indigo-600 fill-indigo-600 shadow-indigo-500/50" />
              Hệ thống xử lý dữ liệu ETL
            </h1>
          </div>
          {results.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setResults([])} className="px-6 py-3 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">Làm mới phiên làm việc</button>
              <button onClick={exportToMisaTemplate} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] flex items-center gap-3 shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 hover:-translate-y-1 transition-all uppercase tracking-widest">
                <FileText className="w-4 h-4" /> Xuất File Mẫu Misa (V7)
              </button>
            </div>
          )}
        </header>

        <div className="p-8 max-w-[1900px] mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard title="Đơn hàng phát hiện" value={String(new Set(results.map(r => r.orderId)).size)} icon={Package} color="bg-indigo-600" />
            <StatCard title="Giá trị thanh toán (Sau KM)" value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)} icon={FileSpreadsheet} color="bg-blue-600" />
            <StatCard title="Số mặt hàng trích xuất" value={String(results.length)} icon={ShoppingBag} color="bg-emerald-600" />
          </div>

          {!results.length && (
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
              <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-indigo-50 rounded-2xl"><Settings2 className="w-7 h-7 text-indigo-600" /></div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Cấu hình Logic trích xuất (ETL Logic):</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                <GroupCard type={GroupType.KIDO} isSelected={selectedGroup === GroupType.KIDO} onClick={() => setSelectedGroup(GroupType.KIDO)} description="Logic KIDO: Tự động bắt mã [58xxxx], map ĐVT vĩnh viễn." color="text-red-600 border-red-200" />
                <GroupCard type={GroupType.UNICHARM} isSelected={selectedGroup === GroupType.UNICHARM} onClick={() => setSelectedGroup(GroupType.UNICHARM)} description="Logic Unicharm: OCR Reverse Parsing cho đơn giá thực tế." color="text-blue-600 border-blue-200" />
                <GroupCard type={GroupType.COLGATE} isSelected={selectedGroup === GroupType.COLGATE} onClick={() => setSelectedGroup(GroupType.COLGATE)} description="Logic Colgate: Đảm bảo trích xuất đủ Mã Hàng Tặng (Giá = 0)." color="text-yellow-600 border-yellow-200" />
                <GroupCard type={GroupType.KIOTVIET_NPP} isSelected={selectedGroup === GroupType.KIOTVIET_NPP} onClick={() => setSelectedGroup(GroupType.KIOTVIET_NPP)} description="Logic KiotViet: Làm sạch mã hàng, xóa hậu tố -TH cực nhanh." color="text-indigo-600 border-indigo-200" />
              </div>
              {selectedGroup && (
                <div className="flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[3.5rem] p-32 bg-slate-50/50 hover:border-indigo-300 transition-all group relative overflow-hidden shadow-inner">
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl mb-10 group-hover:scale-110 transition-transform duration-700 border border-slate-100">
                    {isProcessing ? <Loader2 className="w-24 h-24 text-indigo-600 animate-spin" /> : <UploadCloud className="w-24 h-24 text-indigo-600" />}
                  </div>
                  <label className="mt-4 cursor-pointer">
                    <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
                    <span className="px-20 py-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2.5rem] font-black transition-all shadow-2xl shadow-indigo-900/40 inline-block text-2xl tracking-[0.1em] uppercase active:scale-95">
                      {isProcessing ? 'Hệ thống AI đang trích xuất...' : 'Bắt đầu xử lý phiếu ngay'}
                    </span>
                  </label>
                  <div className="mt-10 flex items-center gap-4 text-slate-400 font-bold uppercase text-[11px] tracking-widest">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" /> 
                    <span>Bảo mật dữ liệu bằng trí tuệ nhân tạo thế hệ mới</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 p-8 rounded-[2rem] flex items-center gap-6 text-red-700 font-black animate-in shake duration-500 shadow-xl shadow-red-200/40">
              <AlertCircle className="w-10 h-10 flex-shrink-0" /> 
              <span className="text-lg">{error}</span>
            </div>
          )}

          {results.length > 0 && (
            <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-xl shadow-indigo-900/20"><TableIcon className="w-7 h-7 text-white" /></div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Bảng dữ liệu trích xuất hoàn thiện</h2>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                       <Archive className="w-3 h-3" /> Đã đồng bộ Master Data vĩnh viễn
                    </p>
                  </div>
                </div>
                <div className="bg-indigo-100 text-indigo-700 px-8 py-3 rounded-[1.5rem] text-[11px] font-black border border-indigo-200 uppercase tracking-[0.2em] shadow-sm">
                  {selectedGroup} ENGINE ACTIVE
                </div>
              </div>
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full text-left border-collapse min-w-[1800px]">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-100">
                      <th className="px-10 py-6">Mã Hàng hóa</th>
                      <th className="px-10 py-6">Sản phẩm & Nhóm</th>
                      <th className="px-10 py-6 text-center">ĐVT chuẩn</th>
                      <th className="px-10 py-6 text-right">Số lượng</th>
                      <th className="px-10 py-6 text-right">Giá Gốc</th>
                      <th className="px-10 py-6 text-right text-indigo-600 bg-indigo-50/20 font-bold">Giá -vat</th>
                      <th className="px-10 py-6 text-right bg-indigo-50/30 font-bold">Thành tiền -vat</th>
                      <th className="px-10 py-6 text-center">KM %</th>
                      <th className="px-10 py-6 text-right">Số tiền KM</th>
                      <th className="px-10 py-6 text-right text-blue-700 bg-blue-50/20 font-bold">Thanh toán</th>
                      <th className="px-10 py-6 text-right font-black bg-slate-50 tracking-tighter">Tổng Phiêu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-medium">
                    {results.map((item, idx) => {
                      const upVat = Math.round(item.unitPrice / (1 + VAT_RATE));
                      const amVat = Math.round(item.amount / (1 + VAT_RATE));
                      const mappedData = basicUnitMap[item.itemCode.trim()];

                      return (
                        <tr key={idx} className="hover:bg-indigo-50/30 transition-all group cursor-default">
                          <td className="px-10 py-7 font-mono text-[11px] font-black text-slate-400 group-hover:text-slate-700 transition-colors tracking-tighter">{item.itemCode}</td>
                          <td className="px-10 py-7">
                             <div className="flex flex-col gap-1.5">
                                <span className="text-slate-900 font-black text-base group-hover:text-indigo-600 transition-colors leading-tight">{item.itemName}</span>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                   <Layers className="w-3 h-3 text-indigo-400" />
                                   {mappedData?.groupName || 'Chưa phân nhóm'}
                                </div>
                             </div>
                          </td>
                          <td className="px-10 py-7 text-center">
                            <span className="px-4 py-1.5 bg-slate-100 rounded-xl text-[10px] font-black uppercase shadow-sm border border-slate-200 group-hover:bg-white transition-colors">{item.unit}</span>
                          </td>
                          <td className="px-10 py-7 text-right font-black text-slate-900 text-lg tabular-nums">{item.quantity}</td>
                          <td className="px-10 py-7 text-right text-slate-400 tabular-nums">{new Intl.NumberFormat('vi-VN').format(item.unitPrice)}</td>
                          <td className="px-10 py-7 text-right font-bold text-indigo-600 bg-indigo-50/10 tabular-nums">{new Intl.NumberFormat('vi-VN').format(upVat)}</td>
                          <td className="px-10 py-7 text-right font-bold text-indigo-800 bg-indigo-50/20 tabular-nums">{new Intl.NumberFormat('vi-VN').format(amVat)}</td>
                          <td className="px-10 py-7 text-center">
                             <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-black"><Percent className="w-3 h-3" /> {item.discountRate}</div>
                          </td>
                          <td className="px-10 py-7 text-right text-emerald-700 tabular-nums">{new Intl.NumberFormat('vi-VN').format(item.discountAmount)}</td>
                          <td className="px-10 py-7 text-right font-black text-blue-800 bg-blue-50/10 tabular-nums">{new Intl.NumberFormat('vi-VN').format(item.afterDiscountAmount)}</td>
                          <td className="px-10 py-7 text-right font-black bg-slate-50 text-slate-900 tabular-nums">{new Intl.NumberFormat('vi-VN').format(item.totalPayment)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Hệ thống AI đang bảo vệ phiên làm việc của bạn</span>
                </div>
                <div className="flex items-center gap-14">
                   <div className="text-right">
                     <p className="text-[11px] text-slate-400 font-black uppercase mb-2 tracking-widest">Doanh thu Net trích xuất (Net Revenue)</p>
                     <p className="text-4xl font-black text-indigo-600 tracking-tighter tabular-nums">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}</p>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
