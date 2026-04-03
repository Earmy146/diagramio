import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { Code2, Play, X, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import useDiagramStore from "../../stores/useDiagramStore";
import { parseSqlToErdAPI, generateSqlFromErdAPI } from "../../api/parser.api";

const showErrorToast = (message) => {
  toast.error(
    <pre className="max-w-[520px] whitespace-pre-wrap break-words font-mono text-xs leading-5">
      {message}
    </pre>,
    { duration: 10000 },
  );
};

export default function SqlEditorPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("import"); // 'import' | 'export'
  const [code, setCode] = useState(
    "-- Nhập hoặc dán script CREATE TABLE của bạn vào đây\n\n",
  );
  const [loading, setLoading] = useState(false);

  // Diagram store access
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    dialect,
    layoutMode,
    setLayoutMode,
  } = useDiagramStore();

  // Mở Code Panel cho tính năng Nhập SQL
  const handleOpenImport = () => {
    setMode("import");
    setCode("-- Nhập CREATE TABLE script (MySQL, Postgres,...)\n\n");
    setIsOpen(true);
  };

  // Mở Code Panel để Xuất SQL từ giao diện ERD
  const handleOpenExport = async () => {
    setMode("export");
    setIsOpen(true);
    setLoading(true);

    // Gọi API Module 4 Generate SQL
    try {
      const erdData = { tables: [], relationships: [] };

      // Chuyển nodes -> tables array (theo chuẩn backend module 4)
      nodes.forEach((n) => {
        if (n.type === "table") erdData.tables.push(n.data);
      });
      // Edge của react-flow cấu trúc hơi khác, Backend ERD cần (fromTableId, toTableId)
      // Tạm gửi thô, backend generator có thể sẽ map ID
      erdData.relationships = edges.map((e) => ({
        id: e.id,
        fromTableId: e.source,
        fromColumnId: e.sourceHandle,
        toTableId: e.target,
        toColumnId: e.targetHandle,
      }));

      const res = await generateSqlFromErdAPI(erdData, dialect);
      if (res.success) {
        setCode(res.data.sql);
        toast.success(res.message || "Xuất SQL thành công");
      }
    } catch (err) {
      showErrorToast(err.message || "Lỗi xuất SQL");
      setCode("-- Đã xảy ra lỗi khi tạo script");
    } finally {
      setLoading(false);
    }
  };

  // Thực thi Import SQL
  const handleRunImport = async () => {
    if (!code.trim() || code.length < 10) return;
    setLoading(true);

    try {
      const res = await parseSqlToErdAPI(code, dialect, layoutMode);
      if (res.success) {
        const generatedNodes = res.data.tables.map((t) => ({
          id: t.id,
          type: "table",
          position: t.position || { x: 100, y: 100 },
          data: t,
        }));

        const generatedEdges = res.data.relationships.map((r) => ({
          id: r.id,
          source: r.fromTableId,
          sourceHandle: r.fromColumnId,
          target: r.toTableId,
          targetHandle: r.toColumnId,
          type: "smoothstep",
          animated: true,
          style: { stroke: "var(--primary-500)", strokeWidth: 2 },
        }));

        // Reset và append mới
        setNodes(generatedNodes);
        setEdges(generatedEdges);
        toast.success(`Đã dựng xong ${res.data.tables.length} bảng!`);
        setIsOpen(false);
      }
    } catch (err) {
      showErrorToast(
        err.message || "SQL Cú pháp sai hoặc không chứa CREATE TABLE",
      );
    } finally {
      setLoading(false);
    }
  };

  // Tự copy code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Đã copy SQL script");
  };

  return (
    <>
      <div className="absolute top-4 left-4 z-40 bg-surface border border-glass rounded-xl shadow-lg p-1.5 flex flex-col gap-2">
        <button
          onClick={handleOpenImport}
          className="p-2 rounded-lg text-textMuted hover:text-textMain hover:bg-primary-500/10 group transition-all"
          title="Import SQL (To Schema)"
        >
          <Code2 className="w-5 h-5 group-hover:text-primary-500" />
        </button>
        <button
          onClick={handleOpenExport}
          className="p-2 rounded-lg text-textMuted hover:text-textMain hover:bg-accent-500/10 group transition-all"
          title="Export Schema (To SQL)"
        >
          <Save className="w-5 h-5 group-hover:text-accent-500" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 h-full w-[400px] bg-surface/95 backdrop-blur-2xl border-r border-glass shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="h-14 border-b border-glass px-4 flex items-center justify-between">
              <h3 className="font-semibold text-textMain flex items-center gap-2">
                {mode === "import" ? (
                  <Code2 className="w-4 h-4 text-primary-500" />
                ) : (
                  <Save className="w-4 h-4 text-accent-500" />
                )}
                {mode === "import" ? "Nhập SQL Script" : "Xuất mã SQL"}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-textMuted hover:bg-white/10 hover:text-textMain"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="px-4 py-2 bg-black/10 flex items-center justify-between">
              <select
                value={dialect}
                onChange={(e) => changeDialect(e.target.value)}
                className="bg-transparent border border-glass rounded px-2 py-1 text-sm text-textMain focus:outline-none focus:border-primary-500"
              >
                <option value="MYSQL">MySQL</option>
                <option value="POSTGRESQL">PostgreSQL</option>
                <option value="SQLITE" disabled={mode === "export"}>
                  SQLite
                </option>
              </select>

              {mode === "import" && (
                <select
                  value={layoutMode}
                  onChange={(e) => setLayoutMode(e.target.value)}
                  className="bg-transparent border border-glass rounded px-2 py-1 text-sm text-textMain focus:outline-none focus:border-amber-500"
                  title="Chọn cách sắp xếp bảng"
                >
                  <option value="zone">Theo Vùng (Zone)</option>
                  <option value="linear">Tuần tự (Linear)</option>
                  <option value="topological">Theo FK (Topological)</option>
                </select>
              )}

              {mode === "export" && (
                <button
                  onClick={handleCopyCode}
                  className="text-xs px-3 py-1.5 bg-surface border border-glass rounded hover:bg-white/10 text-textMuted transition"
                >
                  Sao chép script
                </button>
              )}
            </div>

            {/* Code Area */}
            <div className="flex-1 overflow-auto bg-[#1e1e1e]">
              <CodeMirror
                value={code}
                height="100%"
                extensions={[sql()]}
                theme="dark"
                onChange={mode === "import" ? (val) => setCode(val) : undefined}
                readOnly={mode === "export"}
                className="text-sm h-full"
              />
            </div>

            {/* Footer */}
            {mode === "import" && (
              <div className="p-4 border-t border-glass bg-surface flex justify-end gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-glass text-textMain rounded-lg text-sm hover:bg-white/5"
                >
                  Hủy
                </button>
                <button
                  onClick={handleRunImport}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-lg text-sm transition-all shadow-primary-500/20"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Dựng khung ERD
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
