import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gunzipSync } from 'node:zlib'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const root = fileURLToPath(new URL('../', import.meta.url))
const out = process.env.DSH_PACK_SMOKE_OUT ? path.resolve(process.env.DSH_PACK_SMOKE_OUT) : path.join(root, '.pack-smoke')
fs.mkdirSync(out, { recursive: true })
assert.ok(process.env.npm_execpath, 'Run through npm run pack:smoke')
const metadata = JSON.parse(execFileSync(process.execPath, [process.env.npm_execpath, 'pack', '--ignore-scripts', '--json', '--pack-destination', out], { cwd: root, encoding: 'utf8' }))[0]
const names = metadata.files.map(file => file.path)
for (const name of names) {
  assert.match(name, /^(index\.mjs|lib\/client\.js|locale\/(?:display\/)?(en|zh)\.json|cordis\.patch\.yml|package\.json|README(?:\.zh-CN)?\.md|LICENSE|CONTRIBUTING\.md|SECURITY\.md|CHANGELOG\.md|docs\/(compatibility|privacy|usage|development|scope)\.md|docs\/images\/[a-zA-Z0-9_.-]+\.png)$/)
  assert.doesNotMatch(name, /status|verification|credentials|backup|\.env|node_modules/i)
}
for (const name of ['index.mjs', 'lib/client.js', 'LICENSE', 'cordis.patch.yml', 'locale/en.json', 'locale/zh.json']) assert.ok(names.includes(name), name)
const tar = gunzipSync(fs.readFileSync(path.join(out, metadata.filename)))
let at = 0
while (at + 512 <= tar.length) {
  const header = tar.subarray(at, at + 512)
  const name = header.subarray(0, 100).toString().replace(/\0.*$/s, '')
  if (!name) break
  const size = parseInt(header.subarray(124, 136).toString().replace(/\0.*$/s, '').trim() || '0', 8)
  assert.ok(name.startsWith('package/') && !name.includes('..') && !name.includes('\\'), name)
  if (header[156] === 0 || header[156] === 48) {
    const dest = path.join(out, name)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, tar.subarray(at + 512, at + 512 + size))
  }
  at += 512 + Math.ceil(size / 512) * 512
}
const entry = await import(pathToFileURL(path.join(out, 'package/index.mjs')).href)
assert.equal(typeof entry.apply, 'function')
const packed = JSON.parse(fs.readFileSync(path.join(out, 'package/package.json'), 'utf8'))
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
const packedRequire = createRequire(path.join(out, 'package/package.json'))
assert.equal(packedRequire.resolve(`${packed.name}/package.json`), path.join(out, 'package/package.json'))
for (const [code, title] of [['en', 'Selection Comments'], ['zh', '选区注释']]) {
  const resolved = packedRequire.resolve(`${packed.name}/locale/${code}.json`)
  assert.equal(resolved, path.join(out, 'package/locale/display', `${code}.json`))
  const display = JSON.parse(fs.readFileSync(resolved, 'utf8'))
  assert.equal(display.meta.title, title)
  assert.equal(typeof display.meta.description, 'string')
  assert.ok(display.meta.description.trim())
  const messages = JSON.parse(fs.readFileSync(path.join(out, 'package/locale', `${code}.json`), 'utf8'))
  assert.equal(typeof messages.addTitle, 'string')
  assert.equal(messages.meta, undefined, 'Display metadata must not enter runtime UI dictionaries')
}
assert.deepEqual(fs.readFileSync(path.join(out, 'package/lib/client.js')), fs.readFileSync(path.join(root, 'lib/client.js')), 'Packaging must not change the generated client')
assert.equal(packed.version, '0.3.3')
assert.equal(metadata.version, packed.version)
assert.equal(lock.version, packed.version)
assert.equal(lock.packages[''].version, packed.version)
let definition
vm.runInNewContext(fs.readFileSync(path.join(out, 'package/lib/client.js'), 'utf8'), {
  window: { __ModuleLoader__: { load(value) { definition = value } } },
})
const client = definition.factory(id => { assert.equal(id, 'react'); return {} })
assert.equal(client.getLocalePreference(), 'zh-CN')
assert.equal(client.__test.t('save'), '保存')
client.setLocalePreference('en'); assert.equal(client.__test.t('save'), 'Save')
client.setLocalePreference('auto'); assert.equal(client.__test.t('save'), '保存')
const off = client.__test.attachLocale({ getSnapshot: () => ({ active: 'en' }) })
assert.equal(client.__test.t('save'), 'Save')
off(); assert.equal(client.__test.t('save'), '保存')
client.setLocalePreference('unsupported'); assert.equal(client.__test.t('save'), '保存')
console.log(`Pack smoke OK: ${names.length} files, ${metadata.size} compressed bytes`)
