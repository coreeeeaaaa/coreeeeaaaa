#!/usr/bin/env node
// Minimal vertical slice: append a quantum for a log event
const { coord9 } = require('../core/uem/coord')
const { createQuantum, hashPayload } = require('../core/uem/quantum')
const { appendQuantum } = require('../core/uem/ledger')

const text = process.argv[2] || 'log-entry'
const payloadHash = hashPayload(Buffer.from(text))

const q = createQuantum({
  coord: coord9(Date.now(), 0, 1, 0, 0, 0, 1, 0, 0),
  payload_hash: payloadHash
})

appendQuantum(q)
console.log('appended quantum for log:', text)
