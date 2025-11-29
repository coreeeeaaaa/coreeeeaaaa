use crate::coord::Coord9;

pub type JiwolId = [u16; 20];
const GG_BASE: u64 = 11172;

const LAYOUT: &[(fn(&Coord9) -> u64, usize)] = &[
    (|c| c.t, 6),
    (|c| c.x, 4),
    (|c| c.j, 4),
    (|c| c.a as u64, 1),
    (|c| c.w as u64, 1),
    (|c| c.k as u64, 1),
    (|c| c.p as u64, 1),
    (|c| c.m as u64, 1),
    (|c| c.c as u64, 1),
];

pub fn encode_coord(coord: &Coord9) -> JiwolId {
    let mut out: Vec<u16> = Vec::with_capacity(20);
    for (getter, digits) in LAYOUT.iter() {
        let mut v = getter(coord);
        for _ in 0..*digits {
            let rem = (v % GG_BASE) as u16;
            out.push(rem);
            v /= GG_BASE;
        }
    }
    out.resize(20, 0);
    let mut arr = [0u16; 20];
    arr.copy_from_slice(&out[..20]);
    arr
}

pub fn decode_coord(id: &JiwolId) -> Coord9 {
    let mut idx = 0usize;
    let mut coord = Coord9::default();
    let segments = [
        ("t", 6),
        ("x", 4),
        ("j", 4),
        ("a", 1),
        ("w", 1),
        ("k", 1),
        ("p", 1),
        ("m", 1),
        ("c", 1),
    ];
    for (name, digits) in segments.iter() {
        let mut acc: u64 = 0;
        let mut mul: u64 = 1;
        for d in 0..*digits {
            let val = id.get(idx + d).cloned().unwrap_or(0) as u64;
            acc += val * mul;
            mul *= GG_BASE;
        }
        idx += digits;
        match *name {
            "t" => coord.t = acc,
            "x" => coord.x = acc,
            "j" => coord.j = acc,
            "a" => coord.a = acc as u32,
            "w" => coord.w = acc as u32,
            "k" => coord.k = acc as u32,
            "p" => coord.p = acc as u8,
            "m" => coord.m = acc as u8,
            "c" => coord.c = acc as u8,
            _ => {}
        }
    }
    coord
}
