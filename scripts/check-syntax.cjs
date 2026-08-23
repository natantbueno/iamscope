// Valida sintaxe TSX: transpila com sucrase e depois roda o parser do Node no
// resultado. O passo do Node é o que pega erros de escopo — como declarar o
// mesmo const duas vezes — que o sucrase sozinho deixa passar.
const { transform } = require('sucrase')
const { execFileSync } = require('child_process')
const fs = require('fs'), os = require('os'), path = require('path')
let bad = 0
for (const f of process.argv.slice(2)) {
  let js
  try {
    js = transform(fs.readFileSync(f, 'utf8'), { transforms: ['typescript', 'jsx', 'imports'], filePath: f }).code
  } catch (e) { bad++; console.log('PARSE FAIL', f, '\n   ', e.message.split('\n')[0]); continue }
  const tmp = path.join(os.tmpdir(), 'chk_' + Math.random().toString(36).slice(2) + '.js')
  fs.writeFileSync(tmp, js)
  try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }) }
  catch (e) {
    bad++
    const msg = (e.stderr ? e.stderr.toString() : '').split('\n').filter(l => l.includes('Error') || l.includes('^')).slice(0, 2).join(' | ')
    console.log('SCOPE FAIL', f, '\n   ', msg.trim())
  } finally { fs.unlinkSync(tmp) }
}
console.log(bad ? `\n${bad} ARQUIVO(S) COM PROBLEMA` : `\nOK — ${process.argv.length - 2} arquivo(s) sem erro de sintaxe ou escopo`)
process.exit(bad ? 1 : 0)
