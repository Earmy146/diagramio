import pkg from 'node-sql-parser';
const { Parser } = pkg;

const sql = `
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INT PRIMARY KEY,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

try {
  const parser = new Parser();
  const ast = parser.astify(sql, { database: 'MySQL' });
  console.log(JSON.stringify(ast, null, 2));
} catch (err) {
  console.error("Parse Error:", err.message);
}

