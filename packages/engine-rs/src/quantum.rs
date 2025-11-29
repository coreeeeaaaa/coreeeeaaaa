use crate::{coord::Coord9, jiwol_id::JiwolId, complex::Complex32};
use sha2::{Digest, Sha256};

pub const SEM_LEN: usize = 768;
pub const RECORD_SIZE: usize = 3255;

#[derive(Clone, Debug)]
pub struct UemQuantum {
    pub id: JiwolId,
    pub coord: Coord9,
    pub payload_hash: [u8; 32],
    pub prev_hash: [u8; 32],
    pub state_snapshot: [u8; 32],
    pub thickness: Complex32,
    pub semantic_vec: [f32; SEM_LEN],
}

impl Default for UemQuantum {
    fn default() -> Self {
        Self {
            id: [0u16; 20],
            coord: Coord9::default(),
            payload_hash: [0u8; 32],
            prev_hash: [0u8; 32],
            state_snapshot: [0u8; 32],
            thickness: Complex32::default(),
            semantic_vec: [0f32; SEM_LEN],
        }
    }
}

impl UemQuantum {
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(RECORD_SIZE);
        for v in self.id.iter() {
            buf.extend_from_slice(&v.to_le_bytes());
        }
        buf.extend_from_slice(&self.coord.t.to_le_bytes());
        buf.extend_from_slice(&self.coord.x.to_le_bytes());
        buf.extend_from_slice(&self.coord.a.to_le_bytes());
        buf.extend_from_slice(&self.coord.w.to_le_bytes());
        buf.extend_from_slice(&self.coord.j.to_le_bytes());
        buf.extend_from_slice(&self.coord.k.to_le_bytes());
        buf.push(self.coord.p);
        buf.push(self.coord.m);
        buf.push(self.coord.c);
        buf.extend_from_slice(&self.payload_hash);
        for f in self.semantic_vec.iter() {
            buf.extend_from_slice(&f.to_le_bytes());
        }
        buf.extend_from_slice(&self.prev_hash);
        buf.extend_from_slice(&self.state_snapshot);
        buf.extend_from_slice(&self.thickness.re.to_le_bytes());
        buf.extend_from_slice(&self.thickness.im.to_le_bytes());
        buf
    }

    pub fn from_bytes(data: &[u8]) -> Option<Self> {
        if data.len() != RECORD_SIZE {
            return None;
        }
        let mut offset = 0usize;
        let mut id = [0u16; 20];
        for i in 0..20 {
            id[i] = u16::from_le_bytes([data[offset], data[offset + 1]]);
            offset += 2;
        }
        let mut coord = Coord9::default();
        coord.t = u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());
        offset += 8;
        coord.x = u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());
        offset += 8;
        coord.a = u32::from_le_bytes(data[offset..offset + 4].try_into().unwrap());
        offset += 4;
        coord.w = u32::from_le_bytes(data[offset..offset + 4].try_into().unwrap());
        offset += 4;
        coord.j = u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());
        offset += 8;
        coord.k = u32::from_le_bytes(data[offset..offset + 4].try_into().unwrap());
        offset += 4;
        coord.p = data[offset];
        coord.m = data[offset + 1];
        coord.c = data[offset + 2];
        offset += 3;
        let mut payload_hash = [0u8; 32];
        payload_hash.copy_from_slice(&data[offset..offset + 32]);
        offset += 32;
        let mut semantic_vec = [0f32; SEM_LEN];
        for i in 0..SEM_LEN {
            let bytes: [u8; 4] = data[offset..offset + 4].try_into().unwrap();
            semantic_vec[i] = f32::from_le_bytes(bytes);
            offset += 4;
        }
        let mut prev_hash = [0u8; 32];
        prev_hash.copy_from_slice(&data[offset..offset + 32]);
        offset += 32;
        let mut state_snapshot = [0u8; 32];
        state_snapshot.copy_from_slice(&data[offset..offset + 32]);
        offset += 32;
        let re = f32::from_le_bytes(data[offset..offset + 4].try_into().unwrap());
        offset += 4;
        let im = f32::from_le_bytes(data[offset..offset + 4].try_into().unwrap());
        let thickness = Complex32 { re, im };
        Some(Self { id, coord, payload_hash, prev_hash, state_snapshot, thickness, semantic_vec })
    }

    pub fn hash(&self) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(self.to_bytes());
        let digest = hasher.finalize();
        let mut out = [0u8; 32];
        out.copy_from_slice(&digest);
        out
    }
}
