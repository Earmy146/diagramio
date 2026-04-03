// Removed frontend dependency import to avoid path issues in backend.
// We'll implement nanoid manually here since frontend util import might fail in node if paths aren't shared via monorepo.
import { nanoid } from "nanoid";

import pkg from "node-sql-parser";
const { Parser } = pkg;

// Helper functions for IDs
const makeTableId = () => `tbl_${nanoid(8)}`;
const makeColId = () => `col_${nanoid(8)}`;
const makeRelId = () => `rel_${nanoid(8)}`;

const getLineText = (text, lineNumber) => {
  if (!lineNumber || lineNumber < 1) return "";
  return text.split(/\r?\n/)[lineNumber - 1] || "";
};

const replaceBareType = (text, typeName, replacement) => {
  const typeRegex = new RegExp(`(?<!['"])\\b${typeName}\\b(?!['"])`, "gi");
  return text.replace(typeRegex, replacement);
};

const collapseNestedEnumWrappers = (text) => {
  let normalized = text;
  let prev = "";

  while (normalized !== prev) {
    prev = normalized;
    normalized = normalized.replace(
      /ENUM\('ENUM\('([^']+)'\)'\)/gi,
      "ENUM('$1')",
    );
  }

  return normalized;
};

const formatParserError = (sqlText, err) => {
  const line = err?.location?.start?.line;
  const column = err?.location?.start?.column;

  if (!line || !column) {
    return `Loi cu phap SQL: ${err.message}`;
  }

  const lineText = getLineText(sqlText, line);
  const pointer = `${" ".repeat(Math.max(column - 1, 0))}^`;

  return [
    `Loi cu phap SQL tai dong ${line}, cot ${column}: ${err.message}`,
    lineText,
    pointer,
  ].join("\n");
};

/**
 * Helper lấy string từ AST value
 */
const getRawValue = (valObj) => {
  if (!valObj) return null;
  if (typeof valObj === "string") return valObj;
  if (
    valObj.type === "origin" ||
    valObj.type === "string" ||
    valObj.type === "number"
  )
    return String(valObj.value);
  if (valObj.type === "function") return `${valObj.name}()`;
  return String(valObj.value);
};

/**
 * Phân loại bảng vào các vùng dựa trên tên bảng
 */
const getTableZone = (tableName) => {
  const name = tableName.toLowerCase();

  if (name.startsWith("user") || name === "audit_logs") return "AUTH";
  if (
    name.startsWith("camera") ||
    name === "gates" ||
    name === "floorplans" ||
    name === "zones" ||
    name === "zone_"
  )
    return "INFRASTRUCTURE";
  if (name.startsWith("footfall_") || name === "gate_thresholds")
    return "FOOTFALL";
  if (
    name.startsWith("dwell_") ||
    name === "journey_" ||
    name === "zone_transitions" ||
    name === "tracking_" ||
    name === "heatmap_"
  )
    return "TRACKING";
  if (
    name.startsWith("demographic_") ||
    name === "customer_" ||
    name === "consent_" ||
    name === "customers" ||
    name === "face_embeddings"
  )
    return "CUSTOMER";
  if (
    name.startsWith("security_") ||
    name === "alert_" ||
    name === "incidents" ||
    name === "incident_"
  )
    return "SECURITY";
  if (name.startsWith("watchlist_")) return "WATCHLIST";
  if (name.startsWith("video_") || name === "store_conversion_") return "VIDEO";
  if (
    name.startsWith("lpr_") ||
    name.startsWith("parking_") ||
    name.startsWith("vehicle_")
  )
    return "PARKING";
  if (name.startsWith("report_") || name === "api_" || name === "webhook_")
    return "SYSTEM";
  if (name === "erp_sync_jobs") return "SYSTEM";

  return "OTHER";
};

/**
 * Tính toán vị trí bảng theo thứ tự tuyến tính (từ trái sang phải, trên xuống dưới)
 */
const calculateLinearPosition = (index) => {
  const COLS = 4; // Số cột trên canvas
  const COL_WIDTH = 320; // Chiều rộng mỗi cột
  const ROW_HEIGHT = 310; // Chiều cao mỗi hàng
  const START_X = 50;
  const START_Y = 50;

  const col = index % COLS;
  const row = Math.floor(index / COLS);

  return {
    x: START_X + col * COL_WIDTH,
    y: START_Y + row * ROW_HEIGHT,
  };
};

/**
 * Tính toán vị trí bảng theo thứ tự phụ thuộc FK (Topological sort)
 * Bảng không có FK phụ thuộc sẽ ở trước, bảng có phụ thuộc sẽ ở sau
 */
const calculateTopologicalPosition = (
  tableIndex,
  tableIndegree,
  totalTables,
) => {
  // Sắp xếp theo indegree (số lượng FK pointing to)
  // Bảng có indegree 0 (không phụ thuộc) đứng trước
  const COLS = 4;
  const COL_WIDTH = 320;
  const ROW_HEIGHT = 310;
  const START_X = 50;
  const START_Y = 50;

  const col = tableIndex % COLS;
  const row = Math.floor(tableIndex / COLS);

  return {
    x: START_X + col * COL_WIDTH,
    y: START_Y + row * ROW_HEIGHT,
  };
};

/**
 * Tính toán vị trí bảng dựa trên vùng
 */
const calculateTablePosition = (
  tableName,
  zoneIndex,
  indexInZone,
  totalInZone,
) => {
  // Định nghĩa các vùng trong canvas
  const zones = {
    AUTH: { baseX: 50, baseY: 50, width: 350 },
    INFRASTRUCTURE: { baseX: 450, baseY: 50, width: 500 },
    FOOTFALL: { baseX: 1100, baseY: 50, width: 400 },
    TRACKING: { baseX: 1650, baseY: 50, width: 400 },
    CUSTOMER: { baseX: 50, baseY: 500, width: 450 },
    SECURITY: { baseX: 550, baseY: 500, width: 400 },
    WATCHLIST: { baseX: 1050, baseY: 500, width: 350 },
    VIDEO: { baseX: 1450, baseY: 500, width: 350 },
    PARKING: { baseX: 1900, baseY: 500, width: 350 },
    SYSTEM: { baseX: 50, baseY: 950, width: 500 },
    OTHER: { baseX: 600, baseY: 950, width: 400 },
  };

  const zone = zones[zoneIndex] || zones["OTHER"];

  // Tính số cột trong mỗi vùng (mỗi bảng ~350px)
  const colsPerZone = Math.max(1, Math.floor(zone.width / 280));
  const col = indexInZone % colsPerZone;
  const row = Math.floor(indexInZone / colsPerZone);

  const x = zone.baseX + col * 280;
  const y = zone.baseY + row * 290;

  return { x, y };
};

/**
 * Chuyển đổi SQL thành ERD JSON
 */
export const parseSqlToErd = (
  sqlText,
  dialect = "MYSQL",
  layoutMode = "zone",
) => {
  const parser = new Parser();
  let ast;

  // Extract mapping of all original column types BEFORE preprocessing
  // Format: "tableName.columnName" -> "OriginalType"
  const originalTypeMap = new Map();
  const typeExtractRegex = /CREATE\s+TABLE\s+(\w+)\s*\(([\s\S]*?)\)(?:\s*;)?/gi;
  let tableMatch;
  while ((tableMatch = typeExtractRegex.exec(sqlText)) !== null) {
    const tableName = tableMatch[1];
    const tableBody = tableMatch[2];

    // Split by comma to get each column definition
    const columns = tableBody.split(",").map((s) => s.trim());
    columns.forEach((col) => {
      // Skip constraints, keys, etc
      if (
        col.toUpperCase().startsWith("CONSTRAINT") ||
        col.toUpperCase().startsWith("PRIMARY") ||
        col.toUpperCase().startsWith("FOREIGN") ||
        col.toUpperCase().startsWith("UNIQUE") ||
        col.toUpperCase().startsWith("INDEX") ||
        col === ""
      ) {
        return;
      }

      // Extract col name and type
      const parts = col.split(/\s+/);
      if (parts.length >= 2) {
        const colName = parts[0];
        // Get type: match word characters, parentheses, commas and spaces until keywords
        const typeMatch = col.match(
          /^\s*\w+\s+([\w\(\),\s]+?)(?=\s+(?:NOT|NULL|PRIMARY|AUTO|UNIQUE|DEFAULT|CHECK|CONSTRAINT|$))/i,
        );
        if (typeMatch) {
          const colType = typeMatch[1].trim();
          originalTypeMap.set(`${tableName}.${colName}`, colType);
        }
      }
    });
  }

  // PRE-PROCESSING STEP (SANITIZATION)
  // node-sql-parser often fails on advanced PG objects like extensions, triggers, functions, index, comments
  let cleanSql = sqlText.replace(/--.*$/gm, ""); // Xóa comment inline
  cleanSql = cleanSql.replace(/CREATE EXTENSION.*?;/gi, "");
  cleanSql = cleanSql.replace(/COMMENT ON.*?;/gi, "");
  cleanSql = cleanSql.replace(/CREATE (UNIQUE )?INDEX.*?;/gi, "");
  cleanSql = cleanSql.replace(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$;/gi, "");
  cleanSql = cleanSql.replace(
    /CREATE OR REPLACE FUNCTION[\s\S]*?\$\$ LANGUAGE plpgsql;/gi,
    "",
  );
  cleanSql = cleanSql.replace(
    /CREATE TRIGGER[\s\S]*?EXECUTE FUNCTION.*?;/gi,
    "",
  );
  cleanSql = cleanSql.replace(/INSERT INTO[\s\S]*?\);/gi, "");

  // Identify Custom Types (ENUMs) to map them safely
  const customTypes = [];
  const typeRegex = /CREATE TYPE\s+(\w+)\s+AS\s+ENUM\s*\([\s\S]*?\);/gi;
  let match;
  while ((match = typeRegex.exec(cleanSql)) !== null) {
    customTypes.push(match[1]); // 'user_role', 'camera_status', etc.
  }
  cleanSql = cleanSql.replace(typeRegex, "");

  // Thay thế các type đặc thù của PG thành type chuẩn để parser đi lọt
  // LƯU Ý: Giữ type gốc trong comment để ERD hiển thị đúng
  // Custom types được lưu vào customTypes array, rồi được thay bằng VARCHAR
  customTypes.forEach((customType) => {
    cleanSql = replaceBareType(cleanSql, customType, "VARCHAR(255)");
  });

  // Thay thế các type lạ của PG mà node-sql-parser không hiểu
  cleanSql = cleanSql.replace(
    /(?<!['"])vector\(\d+\)(?!['"])/gi,
    "VARCHAR(255)",
  );
  cleanSql = replaceBareType(cleanSql, "INET", "VARCHAR(45)");
  cleanSql = replaceBareType(cleanSql, "MACADDR", "VARCHAR(17)");
  cleanSql = replaceBareType(cleanSql, "TIMESTAMPTZ", "TIMESTAMP");
  cleanSql = replaceBareType(cleanSql, "BIGSERIAL", "BIGINT AUTO_INCREMENT");
  cleanSql = replaceBareType(cleanSql, "UUID", "VARCHAR(36)");
  cleanSql = replaceBareType(cleanSql, "JSONB", "JSON");

  // Xoá bỏ các Type Cast đặc thủ của PostgreSQL như: DEFAULT '{}'::jsonb => DEFAULT '{}'
  // Parser sẽ báo lỗi ':' found nếu để nguyên
  cleanSql = cleanSql.replace(/::\w+/gi, "");

  if (process.env.SQL_PARSER_DEBUG === "true") {
    import("fs")
      .then((fs) => fs.writeFileSync("debug_cleansql.sql", cleanSql))
      .catch(() => {});
  }

  try {
    // Luôn luôn parse dưới mode MySQL vì mode này của parser ổn định nhất và dễ xử lý nhất
    ast = parser.astify(cleanSql, { database: "MySQL" });
  } catch (err) {
    throw new Error(formatParserError(cleanSql, err));
  }

  // Astify có thể trả về array hoặc object đơn
  const statements = Array.isArray(ast) ? ast : [ast];

  const tables = [];
  const relationships = [];

  // Ánh xạ tên bảng -> obj bảng
  const tableMap = new Map();
  // Ánh xạ `table.column` -> obj cột để xử lý foreign key
  const columnMap = new Map();
  // Đếm bảng trong mỗi vùng
  const zoneIndexMap = new Map();
  // Theo dõi FK dependencies (indegree)
  const tableIndegree = new Map();

  // --- Pass 1: Parse các bảng và cột (không tính position) ---
  for (const stmt of statements) {
    if (stmt.type === "create" && stmt.keyword === "table") {
      const tName = stmt.table[0].table;

      const newTable = {
        id: makeTableId(),
        name: tName,
        displayName: tName,
        color: "#6366f1",
        position: { x: 0, y: 0 }, // Tạm thời, sẽ tính lại sau
        columns: [],
      };

      tableMap.set(tName, newTable);
      tables.push(newTable);
      tableIndegree.set(tName, 0); // Khởi tạo indegree

      if (stmt.create_definitions) {
        for (const def of stmt.create_definitions) {
          if (def.resource === "column") {
            const colName = def.column.column;

            // Lấy dataType gốc từ originalTypeMap nếu có
            let dType = originalTypeMap.get(`${tName}.${colName}`);

            // Nếu không tìm thấy trong map, lấy từ AST
            if (!dType) {
              dType = def.definition?.dataType || "VARCHAR";

              // Nếu là ENUM từ thay thế custom type (cũ), phục hồi từ expr
              if (
                dType.toUpperCase() === "ENUM" &&
                def.definition?.expr &&
                def.definition.expr.length === 1
              ) {
                dType = String(def.definition.expr[0].value);
              } else if (def.definition?.length) {
                dType += `(${def.definition.length})`;
              }
            }

            const isPrimary = !!def.primary_key;
            const isAutoIncrement = !!def.auto_increment;
            const isNullable = def.nullable !== false;
            const isUnique = def.unique_or_primary === "unique";

            let defaultValue = null;
            if (def.default_val)
              defaultValue = getRawValue(def.default_val.value);

            const newCol = {
              id: makeColId(),
              name: colName,
              dataType: dType.toUpperCase(),
              isPrimary,
              isAutoIncrement,
              isNullable: !isPrimary && isNullable,
              isUnique,
              isForeign: false,
              defaultValue,
              comment: def.comment ? getRawValue(def.comment) : "",
            };

            newTable.columns.push(newCol);
            columnMap.set(`${tName}.${colName}`, newCol);
          } else if (
            def.resource === "constraint" &&
            def.constraint_type === "primary key"
          ) {
            // Xử lý PRIMARY KEY (column1, column2)
            const pkCols = def.definition || [];
            for (const c of pkCols) {
              const colName = c.column;
              const col = newTable.columns.find((x) => x.name === colName);
              if (col) {
                col.isPrimary = true;
                col.isNullable = false;
              }
            }
          }
        }
      }
    }
  }

  // --- Pass 2: Parse Foreign Keys ---
  for (const stmt of statements) {
    if (stmt.type === "create" && stmt.keyword === "table") {
      const fromTableName = stmt.table[0].table;
      const fromTable = tableMap.get(fromTableName);

      if (stmt.create_definitions && fromTable) {
        for (const def of stmt.create_definitions) {
          if (def.resource === "constraint" && def.reference_definition) {
            // FOREIGN KEY (user_id) REFERENCES users (id)
            const refDef = def.reference_definition;
            const toTableName = refDef.table[0].table;
            const toTable = tableMap.get(toTableName);

            // Foreign keys có thể map 1 hoặc nhiều columns, ở đây làm simple là 1 col đầu
            const fromColName = def.definition[0]?.column;
            const toColName = refDef.definition[0]?.column;

            if (fromColName && toColName && toTable) {
              const fromCol = fromTable.columns.find(
                (c) => c.name === fromColName,
              );
              const toCol = toTable.columns.find((c) => c.name === toColName);

              if (fromCol && toCol) {
                fromCol.isForeign = true;

                // Tìm on delete/update
                let onDelete = "RESTRICT";
                let onUpdate = "CASCADE";

                if (refDef.on_action) {
                  for (const action of refDef.on_action) {
                    if (action.type === "on delete")
                      onDelete = getRawValue(action.value).toUpperCase();
                    if (action.type === "on update")
                      onUpdate = getRawValue(action.value).toUpperCase();
                  }
                }

                relationships.push({
                  id: makeRelId(),
                  fromTableId: fromTable.id,
                  fromColumnId: fromCol.id,
                  toTableId: toTable.id,
                  toColumnId: toCol.id,
                  type: "ONE_TO_MANY", // Default map
                  onDelete,
                  onUpdate,
                  label: "",
                });
              }
            }
          }
        }
      }
    } else if (stmt.type === "alter" && stmt.table && stmt.table[0]) {
      // Xử lý ALTER TABLE ADD CONSTRAINT
      const fromTableName = stmt.table[0].table;
      const fromTable = tableMap.get(fromTableName);

      if (fromTable && stmt.expr) {
        for (const exp of stmt.expr) {
          if (
            exp.action === "add" &&
            exp.create_definitions?.resource === "constraint" &&
            exp.create_definitions?.reference_definition
          ) {
            const defs = exp.create_definitions;
            const refDef = defs.reference_definition;
            const toTableName = refDef.table[0].table;
            const toTable = tableMap.get(toTableName);

            // Foreign keys map
            const fromColName = defs.definition && defs.definition[0]?.column;
            const toColName = refDef.definition && refDef.definition[0]?.column;

            if (fromColName && toColName && toTable) {
              const fromCol = fromTable.columns.find(
                (c) => c.name === fromColName,
              );
              const toCol = toTable.columns.find((c) => c.name === toColName);

              if (fromCol && toCol) {
                fromCol.isForeign = true;

                // Tìm on delete/update
                let onDelete = "RESTRICT";
                let onUpdate = "CASCADE";

                if (refDef.on_action) {
                  for (const action of refDef.on_action) {
                    if (action.type === "on delete")
                      onDelete = getRawValue(action.value).toUpperCase();
                    if (action.type === "on update")
                      onUpdate = getRawValue(action.value).toUpperCase();
                  }
                }

                relationships.push({
                  id: makeRelId(),
                  fromTableId: fromTable.id,
                  fromColumnId: fromCol.id,
                  toTableId: toTable.id,
                  toColumnId: toCol.id,
                  type: "ONE_TO_MANY", // Default map
                  onDelete,
                  onUpdate,
                  label: "",
                });

                // Tính indegree: bảng có FK pointing từ nó sẽ có indegree tăng
                const currentIndegree = tableIndegree.get(fromTableName) || 0;
                tableIndegree.set(fromTableName, currentIndegree + 1);
              }
            }
          }
        }
      }
    }
  }

  // --- Sắp xếp lại tables dựa trên layoutMode ---
  let sortedTables = [...tables]; // Bản sao của tables

  if (layoutMode === "linear") {
    // Sắp xếp tuyến tính theo thứ tự hiện tại (thứ tự create trong SQL)
    // Không cần sort, giữ nguyên thứ tự
  } else if (layoutMode === "topological") {
    // Sắp xếp theo topological order: bảng có indegree thấp đứng trước
    sortedTables.sort((a, b) => {
      const degreeA = tableIndegree.get(a.name) || 0;
      const degreeB = tableIndegree.get(b.name) || 0;
      return degreeA - degreeB;
    });
  } else {
    // Default: zone mode - không sort, giữ nguyên (zone logic sẽ xử lý trong calculateTablePosition)
  }

  // --- Tính position cho tất cả tables dựa trên layoutMode ---
  for (let i = 0; i < sortedTables.length; i++) {
    const table = sortedTables[i];
    let position;

    if (layoutMode === "linear") {
      position = calculateLinearPosition(i);
    } else if (layoutMode === "topological") {
      position = calculateTopologicalPosition(
        i,
        tableIndegree.get(table.name) || 0,
        tables.length,
      );
    } else {
      // Zone mode
      const zone = getTableZone(table.name);
      const indexInZone = zoneIndexMap.get(zone) || 0;
      zoneIndexMap.set(zone, indexInZone + 1);
      position = calculateTablePosition(
        table.name,
        zone,
        indexInZone,
        zoneIndexMap.get(zone),
      );
    }

    table.position = position;
  }

  // Nếu đã sort, cập nhật lại tables array
  if (layoutMode !== "zone") {
    tables.length = 0;
    tables.push(...sortedTables);
  }

  return { tables, relationships };
};
