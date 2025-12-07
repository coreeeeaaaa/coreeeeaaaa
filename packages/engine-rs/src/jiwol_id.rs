use crate::coord::Coord9;
use crate::spec::{CoordField, SPEC};

pub type JiwolId = [u16; 20];
const GG_BASE: u64 = 11172;

pub fn encode_coord(coord: &Coord9) -> JiwolId {
    let mut out: Vec<u16> = Vec::with_capacity(20);
    for entry in SPEC.jiwo_layout() {
        let mut value = field_value(entry.field, coord);
        for _ in 0..entry.digits {
            let rem = (value % GG_BASE) as u16;
            out.push(rem);
            value /= GG_BASE;
        }
    }
    out.resize(20, 0);
    let mut arr = [0u16; 20];
    arr.copy_from_slice(&out[..20]);
    arr
}

pub fn decode_coord(id: &JiwolId) -> Coord9 {
    let mut coord = Coord9::default();
    let mut idx = 0usize;
    for entry in SPEC.jiwo_layout() {
        let mut acc: u64 = 0;
        let mut mul: u64 = 1;
        for d in 0..entry.digits {
            let digit = *id.get(idx + d).unwrap_or(&0) as u64;
            acc += digit * mul;
            mul *= GG_BASE;
        }
        assign_field(entry.field, &mut coord, acc);
        idx += entry.digits;
    }
    coord
}

fn field_value(field: CoordField, coord: &Coord9) -> u64 {
    match field {
        CoordField::T => coord.t,
        CoordField::X => coord.x,
        CoordField::J => coord.j,
        CoordField::A => coord.a as u64,
        CoordField::W => coord.w as u64,
        CoordField::K => coord.k as u64,
        CoordField::P => coord.p as u64,
        CoordField::M => coord.m as u64,
        CoordField::C => coord.c as u64,
    }
}

fn assign_field(field: CoordField, coord: &mut Coord9, value: u64) {
    match field {
        CoordField::T => coord.t = value,
        CoordField::X => coord.x = value,
        CoordField::J => coord.j = value,
        CoordField::A => coord.a = value as u32,
        CoordField::W => coord.w = value as u32,
        CoordField::K => coord.k = value as u32,
        CoordField::P => coord.p = value as u8,
        CoordField::M => coord.m = value as u8,
        CoordField::C => coord.c = value as u8,
    }
}
