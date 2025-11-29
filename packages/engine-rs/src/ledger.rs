use crate::ahs::validate_evolution;
use crate::quantum::{UemQuantum, RECORD_SIZE};
use std::fs::{File, OpenOptions};
use std::io::{self, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};

pub struct Ledger {
    pub path: PathBuf,
    pub records: Vec<UemQuantum>,
}

fn next_state_snapshot(prev_state: &[u8; 32], payload_hash: &[u8; 32]) -> [u8; 32] {
    let mut snap_input = Vec::with_capacity(64);
    snap_input.extend_from_slice(prev_state);
    snap_input.extend_from_slice(payload_hash);
    crate::hash_bytes(&snap_input)
}

fn ensure_core(path: &Path) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if !path.exists() {
        File::create(path)?;
    }
    Ok(())
}

impl Ledger {
    pub fn open(path: PathBuf, genesis: UemQuantum) -> std::io::Result<Self> {
        ensure_core(&path)?;
        let mut f = OpenOptions::new().read(true).write(true).create(true).open(&path)?;
        let mut buf = Vec::new();
        f.read_to_end(&mut buf)?;
        let mut records = Vec::new();
        if buf.is_empty() {
            let bytes = genesis.to_bytes();
            f.write_all(&bytes)?;
            records.push(genesis);
        } else {
            if buf.len() % RECORD_SIZE != 0 {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "ledger corrupted: partial record",
                ));
            }
            let mut off = 0usize;
            while off + RECORD_SIZE <= buf.len() {
                if let Some(q) = UemQuantum::from_bytes(&buf[off..off + RECORD_SIZE]) {
                    records.push(q);
                }
                off += RECORD_SIZE;
            }
        }
        validate_records(&records)?;
        Ok(Self { path, records })
    }

    pub fn append(&mut self, mut q: UemQuantum) -> std::io::Result<()> {
        ensure_core(&self.path)?;
        if let Some(last) = self.records.last() {
            q.prev_hash = last.hash();
            q.state_snapshot = next_state_snapshot(&last.state_snapshot, &q.payload_hash);
            if !validate_evolution(last, &q) {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "AHS violation: evolution distance too large",
                ));
            }
        } else {
            q.prev_hash = [0u8; 32];
            q.state_snapshot = q.payload_hash;
        }
        let bytes = q.to_bytes();
        let mut f = OpenOptions::new().append(true).open(&self.path)?;
        f.write_all(&bytes)?;
        self.records.push(q);
        Ok(())
    }

    pub fn rewrite(&mut self, records: Vec<UemQuantum>) -> std::io::Result<()> {
        ensure_core(&self.path)?;
        let mut f = OpenOptions::new().write(true).truncate(true).open(&self.path)?;
        self.records.clear();
        let mut prev_hash: Option<[u8; 32]> = None;
        let mut prev_state: Option<[u8; 32]> = None;
        for mut q in records.into_iter() {
            if let Some(h) = prev_hash {
                q.prev_hash = h;
            } else {
                q.prev_hash = [0u8; 32];
            }
            if let Some(state) = prev_state {
                q.state_snapshot = next_state_snapshot(&state, &q.payload_hash);
            } else {
                q.state_snapshot = q.payload_hash;
            }
            let bytes = q.to_bytes();
            prev_hash = Some(crate::hash_bytes(&bytes));
            prev_state = Some(q.state_snapshot);
            f.write_all(&bytes)?;
            self.records.push(q);
        }
        f.flush()?;
        Ok(())
    }

    pub fn validate_chain(&self) -> bool {
        validate_records(&self.records).is_ok()
    }

    pub fn tamper_at(&mut self, index: usize, delta: u8) -> std::io::Result<()> {
        // test helper: mutate a byte
        let mut f = OpenOptions::new().read(true).write(true).open(&self.path)?;
        let pos = index * RECORD_SIZE;
        f.seek(SeekFrom::Start(pos as u64))?;
        let mut buf = vec![0u8; RECORD_SIZE];
        f.read_exact(&mut buf)?;
        if let Some(b) = buf.get_mut(0) {
            *b ^= delta;
        }
        f.seek(SeekFrom::Start(pos as u64))?;
        f.write_all(&buf)?;
        Ok(())
    }
}

fn validate_records(records: &[UemQuantum]) -> std::io::Result<()> {
    if records.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "ledger empty or unreadable",
        ));
    }
    let mut last_hash: Option<[u8; 32]> = None;
    let mut last_state: Option<[u8; 32]> = None;
    let mut last_q: Option<&UemQuantum> = None;
    for (idx, q) in records.iter().enumerate() {
        if idx == 0 {
            if q.prev_hash != [0u8; 32] {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "genesis prev_hash must be zero",
                ));
            }
            if q.state_snapshot != q.payload_hash {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "genesis snapshot must match payload hash",
                ));
            }
        } else {
            if let Some(expected) = last_hash {
                if q.prev_hash != expected {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidData,
                        "hash chain broken",
                    ));
                }
            }
            if let Some(state) = last_state {
                let expected_state = next_state_snapshot(&state, &q.payload_hash);
                if q.state_snapshot != expected_state {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidData,
                        "state snapshot mismatch",
                    ));
                }
            }
            if let Some(prev) = last_q {
                if !validate_evolution(prev, q) {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidData,
                        "AHS violation detected",
                    ));
                }
            }
        }
        last_hash = Some(q.hash());
        last_state = Some(q.state_snapshot);
        last_q = Some(q);
    }
    Ok(())
}
