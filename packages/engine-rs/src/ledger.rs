use std::fs::{OpenOptions, File};
use std::path::Path;
use std::io::{self, Write, Seek, SeekFrom, Read};
use bytemuck::{bytes_of, from_bytes};
use crate::quantum::{UemQuantum, RECORD_SIZE};

pub struct Ledger {
    file: File,
    pub path: std::path::PathBuf,
    pub records: Vec<UemQuantum>,
}

impl Ledger {
    pub fn open<P: AsRef<Path>>(path: P) -> io::Result<Self> {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(path.as_ref())?;

        let mut ledger = Self {
            file,
            path: path.as_ref().to_path_buf(),
            records: Vec::new(),
        };

        // Load existing records
        ledger.load_records()?;

        Ok(ledger)
    }

    pub fn open_with_genesis<P: AsRef<Path>>(path: P, genesis: UemQuantum) -> io::Result<Self> {
        let mut ledger = Self::open(path)?;
        if ledger.records.is_empty() {
            ledger.append(&genesis)?;
        }
        Ok(ledger)
    }

    fn load_records(&mut self) -> io::Result<()> {
        let file_size = self.file.metadata()?.len() as usize;
        if file_size == 0 {
            return Ok(());
        }

        let record_count = file_size / RECORD_SIZE;
        self.file.seek(SeekFrom::Start(0))?;

        self.records.clear();
        self.records.reserve(record_count);

        for _ in 0..record_count {
            let mut buf = vec![0u8; RECORD_SIZE];
            self.file.read_exact(&mut buf)?;
            let quantum = *from_bytes::<UemQuantum>(&buf);
            self.records.push(quantum);
        }

        Ok(())
    }

    pub fn validate_chain(&self) -> bool {
        if self.records.is_empty() {
            return true;
        }

        for i in 1..self.records.len() {
            let current = &self.records[i];
            let expected_prev_hash = self.records[i-1].hash();

            if current.prev_hash != expected_prev_hash {
                return false;
            }
        }

        true
    }

    pub fn rewrite(&mut self, new_records: Vec<UemQuantum>) -> io::Result<()> {
        // Truncate file
        self.file.set_len(0)?;
        self.file.seek(SeekFrom::Start(0))?;

        // Write all records
        for record in &new_records {
            let bytes = bytes_of(record);
            self.file.write_all(bytes)?;
        }
        self.file.sync_all()?;

        // Update memory records
        self.records = new_records;

        Ok(())
    }

    pub fn append(&mut self, quantum: &UemQuantum) -> io::Result<u64> {
        let pos = self.file.seek(SeekFrom::End(0))?;
        let bytes = bytes_of(quantum);
        self.file.write_all(bytes)?;
        self.file.sync_all()?;

        // Also add to memory records
        self.records.push(*quantum);

        Ok(pos)
    }

    pub fn read_at(&mut self, index: u64) -> io::Result<UemQuantum> {
        let size = std::mem::size_of::<UemQuantum>() as u64;
        self.file.seek(SeekFrom::Start(index * size))?;
        
        let mut buf = vec![0u8; size as usize];
        self.file.read_exact(&mut buf)?;
        
        let q = *from_bytes::<UemQuantum>(&buf);
        Ok(q)
    }
}
