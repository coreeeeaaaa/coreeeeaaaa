#!/usr/bin/env node
const engine = require('../core/uem/engine.js')

const target = process.argv[2] || engine.CORE_UEM_PATH
const quanta = engine.iterQuanta(target)
quanta.forEach((q, idx) => {
  console.log(JSON.stringify({
    idx,
    coord: Object.fromEntries(Object.entries(q.coord || {}).map(([k,v]) => [k, typeof v === 'bigint' ? v.toString() : v])),
    thickness: q.thickness,
    payload_hash: q.payload_hash.toString('hex'),
    prev_hash: q.prev_hash.toString('hex'),
    state_snapshot: q.state_snapshot.toString('hex')
  }))
})
