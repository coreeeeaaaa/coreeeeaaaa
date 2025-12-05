use std::fs::{OpenOptions, File};
use std::path::Path;
use std::io::{self, Write, Seek, SeekFrom, Read};
use bytemuck::{bytes_of, from_bytes};
use crate::quantum::UemQuantum;

pub struct Ledger {
    file: File,
    pub path: std::path::PathBuf,
}

impl Ledger {
    pub fn open<P: AsRef<Path>>(path: P) -> io::Result<Self> {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(path.as_ref())?;
        
        Ok(Self {
            file,
            path: path.as_ref().to_path_buf(),
        })
    }

    pub fn append(&mut self, quantum: &UemQuantum) -> io::Result<u64> {
        let pos = self.file.seek(SeekFrom::End(0))?;
        let bytes = bytes_of(quantum);
        self.file.write_all(bytes)?;
        self.file.sync_all()?;
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
