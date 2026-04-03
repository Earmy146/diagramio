import apiClient from "./client";

export const parseSqlToErdAPI = async (
  sql,
  dialect = "MYSQL",
  layoutMode = "zone",
) => {
  return apiClient.post("/parser/sql-to-erd", { sql, dialect, layoutMode });
};

export const generateSqlFromErdAPI = async (erdData, dialect = "MYSQL") => {
  return apiClient.post("/parser/erd-to-sql", { erdData, dialect });
};
