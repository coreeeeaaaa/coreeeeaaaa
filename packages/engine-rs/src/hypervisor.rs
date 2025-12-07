use crate::ledger::Ledger;
use crate::quantum::{UemQuantum, RECORD_SIZE};
use crate::scd::scd_compact;
use crate::spec::SPEC;
use crate::uem_tree::{QueryFilter, UemTree};
use std::io;
use std::path::{Path, PathBuf};

pub struct CoreHypervisor {
    pub ledger: Ledger,
    pub tree: UemTree,
}

impl CoreHypervisor {
    pub fn open(path: impl AsRef<Path>) -> io::Result<Self> {
        let pb = path.as_ref().to_path_buf();
        let ledger = Ledger::open_with_genesis(pb.clone(), crate::genesis_quantum())?;
        let tree = UemTree::build(&ledger.records);
        Ok(Self { ledger, tree })
    }

    pub fn apply_quantum(&mut self, quantum: UemQuantum) -> io::Result<()> {
        self.ledger.append(&quantum)?;
        self.tree = UemTree::build(&self.ledger.records);
        self.compact_if_needed()?;
        Ok(())
    }

    pub fn query(&self, filter: &QueryFilter) -> Vec<UemQuantum> {
        self.tree.query(filter)
    }

    pub fn snapshot_state(&self) -> Option<[u8; 32]> {
        self.ledger.records.last().map(|q| q.state_snapshot)
    }

    pub fn record_count(&self) -> usize {
        self.ledger.records.len()
    }

    fn compact_if_needed(&mut self) -> io::Result<()> {
        let size = self.ledger.records.len() * RECORD_SIZE;
        if size >= SPEC.scd.trigger_bytes {
            let res = scd_compact(&self.ledger.records);
            if res.compacted {
                self.ledger.rewrite(res.new_records)?;
                self.tree = UemTree::build(&self.ledger.records);
            }
        }
        Ok(())
    }

    pub fn ledger_path(&self) -> &PathBuf {
        &self.ledger.path
    }
}
