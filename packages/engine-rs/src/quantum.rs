use bytemuck::{Pod, Zeroable};

#[repr(C)]
#[derive(Copy, Clone, Debug, Zeroable, Pod)]
pub struct Complex32 {
    pub re: f32,
    pub im: f32,
}

#[repr(C)]
#[derive(Copy, Clone, Debug, Zeroable, Pod)]
pub struct Coord9 {
    pub t: u64,
    pub x: u64,
    pub a: u32,
    pub w: u32,
    pub j: u64,
    pub k: u32,
    pub p: u8,
    pub m: u8,
    pub c: u8,
    pub _pad: u8,
}

#[repr(C)]
#[derive(Copy, Clone, Debug, Zeroable, Pod)]
pub struct UemQuantum {
    pub id: [u16; 20],
    pub coord: Coord9,
    pub payload_hash: [u8; 32],
    pub semantic_vec: [f32; 32], // 768 -> 32로 축소 (bytemuck 제한 우회)
    pub prev_hash: [u8; 32],
    pub state_snapshot: [u8; 32],
    pub thickness: Complex32,
}

impl UemQuantum {
    pub fn new_genesis() -> Self {
        Self {
            id: [0; 20],
            coord: Coord9 { t: 0, x: 0, a: 0, w: 0, j: 0, k: 0, p: 1, m: 0, c: 0, _pad: 0 },
            payload_hash: [0; 32],
            semantic_vec: [0.0; 32], // 여기도 32
            prev_hash: [0; 32],
            state_snapshot: [0; 32],
            thickness: Complex32 { re: 0.0, im: 0.0 },
        }
    }
}
