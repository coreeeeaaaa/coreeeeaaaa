use crate::quantum::{UemQuantum, RECORD_SIZE};
use crate::hash_bytes;
use std::fs::{File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};

pub struct Ledger {
    pub path: PathBuf,
    pub records: Vec<UemQuantum>,
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
            let mut off = 0usize;
            while off + RECORD_SIZE <= buf.len() {
                if let Some(q) = UemQuantum::from_bytes(&buf[off..off+RECORD_SIZE]) {
                    records.push(q);
                }
                off += RECORD_SIZE;
            }
        }
        // Validate chain on load
        let mut last_hash: Option<[u8;32]> = None;
        for (idx, q) in records.iter().enumerate() {
            if idx == 0 && q.prev_hash != [0u8;32] {
                return Err(std::io::Error::new(std::io::ErrorKind::InvalidData, "genesis prev_hash must be zero"));
            }
            if let Some(expected) = last_hash {
                if q.prev_hash != expected {
                    return Err(std::io::Error::new(std::io::ErrorKind::InvalidData, "hash chain broken"));
                }
            }
            last_hash = Some(q.hash());
        }
        Ok(Self { path, records })
    }

    pub fn append(&mut self, mut q: UemQuantum) -> std::io::Result<()> {
        ensure_core(&self.path)?;
        if let Some(last) = self.records.last() {
            q.prev_hash = last.hash();
            let mut snap_input = Vec::new();
            snap_input.extend_from_slice(&last.state_snapshot);
            snap_input.extend_from_slice(&q.payload_hash);
            q.state_snapshot = hash_bytes(&snap_input);
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
        let mut prev_hash = None;
        for mut q in records.into_iter() {
            if let Some(h) = prev_hash {
                q.prev_hash = h;
            }
            let bytes = q.to_bytes();
            prev_hash = Some(hash_bytes(&bytes));
            f.write_all(&bytes)?;
            self.records.push(q);
        }
        f.flush()?;
        Ok(())
    }

    pub fn validate_chain(&self) -> bool {
        let mut prev: Option<[u8;32]> = None;
        for q in self.records.iter() {
            if let Some(p) = prev {
                if q.prev_hash != p {
                    return false;
                }
            }
            prev = Some(q.hash());
        }
        true
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

fn hash_bytes(data: &[u8]) -> [u8;32] {
    crate::hash_bytes(data)
}
