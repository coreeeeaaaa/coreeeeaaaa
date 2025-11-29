use crate::quantum::UemQuantum;

pub struct ScdResult {
    pub compacted: bool,
    pub new_records: Vec<UemQuantum>,
}

const THRESHOLD: usize = 200;
const TAIL_KEEP: usize = 10;

pub fn scd_compact(records: &[UemQuantum]) -> ScdResult {
    if records.len() <= THRESHOLD {
        return ScdResult { compacted: false, new_records: records.to_vec() };
    }
    let mut new_records = Vec::new();
    if let Some(genesis) = records.first() {
        new_records.push(genesis.clone());
    }
    let summary_count = records.len().saturating_sub(TAIL_KEEP + 1);
    let mut summary = UemQuantum::default();
    summary.coord = records.last().map(|q| q.coord).unwrap_or_default();
    summary.thickness = records.last().map(|q| q.thickness).unwrap_or_default();
    summary.payload_hash = crate::hash_bytes(format!("SCD_SUMMARY_{}", summary_count).as_bytes());
    new_records.push(summary);
    let tail_start = records.len().saturating_sub(TAIL_KEEP);
    for q in records.iter().skip(tail_start) {
        new_records.push(q.clone());
    }
    ScdResult { compacted: true, new_records }
}
