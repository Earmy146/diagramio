import { X, BookOpen, Database } from 'lucide-react'

const GUIDES = {
  MYSQL: [
    { type: 'INT', desc: 'Số nguyên chuẩn (Thường dùng cho Khóa chính). Kích thước 4 bytes.' },
    { type: 'BIGINT', desc: 'Số nguyên siêu lớn. Kích thước 8 bytes.' },
    { type: 'VARCHAR(n)', desc: 'Chuỗi ký tự có độ dài thay đổi (Tối đa n). Ví dụ: VARCHAR(255).' },
    { type: 'TEXT', desc: 'Chuỗi ký tự dài. Tối đa 64KB.' },
    { type: 'DATETIME', desc: 'Lưu ngày và giờ bằng format YYYY-MM-DD HH:MM:SS.' },
    { type: 'BOOLEAN', desc: 'Trong MySQL được ánh xạ thành TINYINT(1). 0 là False, 1 là True.' },
    { type: 'JSON', desc: 'Lưu trữ tài liệu dạng JSON dễ dàng để truy vấn.' },
  ],
  POSTGRESQL: [
    { type: 'INTEGER', desc: 'Số nguyên phổ biến. Kích thước 4 bytes. Tương đương INT.' },
    { type: 'UUID', desc: 'Khóa chính dựa trên phân loại UUID 128-bit. Phổ biến cho bảo mật.' },
    { type: 'VARCHAR(n)', desc: 'Chuỗi ký tự độ dài tối đa n.' },
    { type: 'TEXT', desc: 'Chuỗi ký tự độ dài vô hạn mặc định trong PostgreSQL.' },
    { type: 'TIMESTAMP', desc: 'Lưu cả ngày và giờ, hỗ trợ Timezone.' },
    { type: 'BOOLEAN', desc: 'Kiểu dữ liệu Logic thực định (True/False/Null).' },
    { type: 'JSONB', desc: 'Định dạng JSON được biên dịch nhị phân. Tìm kiếm rất nhanh!' },
  ],
  SQLITE: [
    { type: 'INTEGER', desc: 'Kiểu số nguyên. Trong SQLite thường tự động co giãn kích thước theo giá trị.' },
    { type: 'TEXT', desc: 'Kiểu chuỗi cơ bản duy nhất của SQLite.' },
    { type: 'BLOB', desc: 'Lưu trữ nhị phân trực tiếp (ví dụ: hình ảnh nhỏ, file nhỏ).' },
    { type: 'REAL', desc: 'Số thực (Floating point) 8-bytes.' },
    { type: 'NUMERIC', desc: 'Lưu các kiểu số liệu đa dạng kể cả Boolean.' },
  ]
}

export default function DataTypesGuide({ isOpen, onClose, dialect }) {
  if (!isOpen) return null

  const guideList = GUIDES[dialect] || GUIDES.MYSQL

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-glass rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-glass bg-white/5">
          <div className="flex items-center gap-2 text-textMain">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-lg">Cẩm nang Data Types</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-textMuted hover:text-textMain hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-primary-500" />
            <span className="text-textMuted text-sm">Các kiểu dữ liệu phổ biến được hỗ trợ cho ngôn ngữ: <strong className="text-textMain uppercase">{dialect}</strong></span>
          </div>

          <div className="bg-background/50 rounded-xl border border-glass overflow-y-auto max-h-[60vh]">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-glass sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-semibold text-textMain w-1/3">Type</th>
                  <th className="px-4 py-3 font-semibold text-textMain w-2/3">Công dụng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass/50">
                {guideList.map(item => (
                  <tr key={item.type} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-primary-400 text-xs font-semibold">{item.type}</td>
                    <td className="px-4 py-3 text-textMuted leading-relaxed">{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-glass bg-background/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-surface hover:bg-white/10 border border-glass text-textMain text-sm font-medium transition-all"
          >
            Đã hiểu
          </button>
        </div>

      </div>
    </div>
  )
}
