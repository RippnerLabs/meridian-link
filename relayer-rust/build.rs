use rust_witness::transpile::transpile_wasm;

fn main() {
    transpile_wasm("../circom/solDepositProof_js".to_string());
} 