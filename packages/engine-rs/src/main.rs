mod quantum;
mod ledger;

use quantum::UemQuantum;
use ledger::Ledger;
use std::env;

fn main() -> std::io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let command = args.get(1).map(|s| s.as_str()).unwrap_or("help");
    let core_path = ".core/core.uem";

    match command {
        "init" => {
            println!("Initializing Core-Hypervisor at {}", core_path);
            let mut ledger = Ledger::open(core_path)?;
            if std::fs::metadata(core_path)?.len() == 0 {
                let genesis = UemQuantum::new_genesis();
                ledger.append(&genesis)?;
                println!("Genesis Quantum written.");
            } else {
                println!("Core already exists.");
            }
        },
        "append" => {
            println!("Appending Quantum...");
            let mut ledger = Ledger::open(core_path)?;
            let mut q = UemQuantum::new_genesis();
            q.coord.t = 1; 
            ledger.append(&q)?;
            println!("Quantum appended.");
        },
        _ => println!("Usage: engine <init|append>"),
    }

    Ok(())
}
