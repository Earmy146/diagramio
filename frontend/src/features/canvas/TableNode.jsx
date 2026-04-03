import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Key, Plus, Trash2 } from "lucide-react";
import useDiagramStore from "../../stores/useDiagramStore";

const TYPE_SUGGESTIONS = {
  MYSQL: [
    "INT",
    "BIGINT",
    "VARCHAR(255)",
    "TEXT",
    "LONGTEXT",
    "DATETIME",
    "DATE",
    "BOOLEAN",
    "DECIMAL",
    "FLOAT",
    "JSON",
  ],
  POSTGRESQL: [
    "INTEGER",
    "BIGINT",
    "VARCHAR(255)",
    "TEXT",
    "TIMESTAMP",
    "DATE",
    "BOOLEAN",
    "NUMERIC",
    "REAL",
    "JSONB",
    "UUID",
  ],
  SQLITE: ["INTEGER", "TEXT", "BLOB", "REAL", "NUMERIC"],
};

const TableNode = ({ id, data, selected }) => {
  const { updateTableNode, deleteTableNode, dialect } = useDiagramStore();

  const handleNameChange = (e) => {
    updateTableNode(id, { name: e.target.value });
  };

  const handleColumnUpdate = (colId, field, value) => {
    const updatedCols = data.columns.map((c) =>
      c.id === colId ? { ...c, [field]: value } : c,
    );
    updateTableNode(id, { columns: updatedCols });
  };

  const handleAddColumn = () => {
    const newCol = {
      id: `col_${Math.random().toString(36).substr(2, 9)}`,
      name: `column_${data.columns?.length + 1 || 1}`,
      dataType: TYPE_SUGGESTIONS[dialect]?.[0] || "VARCHAR(100)",
      isPrimary: false,
      isAutoIncrement: false,
    };
    updateTableNode(id, { columns: [...(data.columns || []), newCol] });
  };

  const handleDeleteColumn = (colId) => {
    updateTableNode(id, {
      columns: data.columns.filter((c) => c.id !== colId),
    });
  };

  const handleDeleteTable = () => {
    deleteTableNode(id);
  };

  const listId = `types-${id}`;

  return (
    <div
      className={`w-64 bg-surface rounded-xl border-2 transition-shadow shadow-lg group ${
        data.isSearchMatch
          ? "border-amber-400 shadow-amber-400/50"
          : selected
            ? "border-primary-500 shadow-primary-500/30"
            : "border-glass"
      }`}
    >
      {/* Cung cấp danh sách Datalist ngầm định cho input combobox */}
      <datalist id={listId}>
        {TYPE_SUGGESTIONS[dialect]?.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {/* Target Handle ở trên (đón kết nối tới) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-16 !h-2 !bg-primary-500 !rounded-full !border-none !-top-1 px-2"
      />

      {/* Table Header */}
      <div
        className="px-4 py-3 rounded-t-[10px] border-b border-glass flex items-center justify-between relative"
        style={{ backgroundColor: data.color || "var(--surface)" }}
      >
        <div className="flex items-center w-full">
          <input
            value={data.name || ""}
            onChange={handleNameChange}
            className="font-bold text-textMain bg-transparent border-none outline-none w-full nodrag placeholder-textMuted/50"
            placeholder="table_name"
          />
          {data.isDraft && (
            <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded ml-2">
              DRAFT
            </span>
          )}
        </div>

        {/* Nút Xoá Bảng chỉ hiện khi đang chọn node hoặc khi hover vào node */}
        <button
          onClick={handleDeleteTable}
          className={`absolute -right-2 -top-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all z-10 ${selected ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"}`}
          title="Xóa Bảng Này"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Columns */}
      <div className="flex flex-col p-1 bg-surface/50">
        {data.columns?.map((col, idx) => (
          <div
            key={col.id || idx}
            className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-md text-sm group relative"
          >
            {/* Lệnh Source Handle kết nối Column cụ thể (Right side) */}
            <Handle
              type="source"
              position={Position.Right}
              id={col.id || col.name}
              className="!w-2 !h-full !rounded-none !bg-transparent hover:!bg-primary-500 !border-none !-right-1 opacity-0 group-hover:opacity-100 transition-opacity"
            />

            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <button
                onClick={() =>
                  handleColumnUpdate(col.id, "isPrimary", !col.isPrimary)
                }
                className={`p-1 rounded hover:bg-white/10 ${col.isPrimary ? "text-yellow-500" : "text-textMuted opacity-20 hover:opacity-100"}`}
                title="Toggle Primary Key"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
              <input
                value={col.name || ""}
                onChange={(e) =>
                  handleColumnUpdate(col.id, "name", e.target.value)
                }
                className={`w-full bg-transparent border-none outline-none nodrag px-1 ${
                  col.isPrimary
                    ? "font-medium text-textMain"
                    : "text-textMuted font-medium"
                }`}
                placeholder="col_name"
              />
            </div>

            <div className="flex items-center gap-1 w-[90px] flex-shrink-0 justify-end relative">
              <input
                value={col.dataType || ""}
                list={listId}
                onChange={(e) =>
                  handleColumnUpdate(
                    col.id,
                    "dataType",
                    e.target.value.toUpperCase(),
                  )
                }
                className="w-full text-right text-[11px] text-primary-400 font-mono bg-transparent border-none outline-none nodrag uppercase truncate"
                placeholder="TYPE"
                title={col.dataType}
              />
              <button
                onClick={() => handleDeleteColumn(col.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:bg-red-400/20 rounded transition-all flex-shrink-0"
                title="Delete Column"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Add Action */}
      <div className="px-3 py-2 bg-surface/50 border-t border-glass rounded-b-[10px] flex justify-center">
        <button
          onClick={handleAddColumn}
          className="flex items-center gap-1 text-xs text-textMuted hover:text-textMain hover:bg-white/5 px-2 py-1 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm cột
        </button>
      </div>

      {/* Target Handle Global ở Dưới */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-accent-500 !border-2 !border-surface !-bottom-1.5"
        id="table-handle"
      />
    </div>
  );
};

export default memo(TableNode);
