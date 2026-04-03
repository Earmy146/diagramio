import pkg from 'node-sql-parser'
const { Parser } = pkg

const parser = new Parser()
const sql = `ALTER TABLE \`relationships\` ADD CONSTRAINT \`relationships_diagram_id_fkey\` FOREIGN KEY (\`diagram_id\`) REFERENCES \`diagrams\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE;`

try {
  const ast = parser.astify(sql, { database: 'MySQL' })
  console.log(JSON.stringify(ast, null, 2))
} catch (err) {
  console.error(err)
}
