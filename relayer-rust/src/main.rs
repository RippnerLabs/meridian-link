// Note: Development of rust relayer is paused due to ongoing issues with light protocol's rust light client
// See: https://github.com/Lightprotocol/light-protocol/issues/1836
// The compressed account proof's root is returning [0u8; 32] instead of the expected root value
// This makes it impossible to generate valid circuit inputs for the zero-knowledge proof
// Until this issue is resolved, please use the TypeScript relayer implementation instead

// TODO: Uncomment and complete implementation once light protocol rust client is fixed
use borsh::BorshDeserialize;
use circom_prover::{prover::ProofLib, witness::WitnessFn, CircomProver};
use light_client::{indexer::{CompressedAccount, Indexer, MerkleProof}, rpc::{LightClient, LightClientConfig, Rpc}};
use actix_web::{web, App, Error, HttpServer, Responder};
use serde::{Serialize, Deserialize};
use solana_pubkey::{Pubkey};

#[derive(Serialize)]
struct Res {

}

#[derive(Deserialize)]
struct CompressedAccountAddress {
    address: String,
}

#[derive(Deserialize, BorshDeserialize, Debug)]
pub struct DepositRecordCompressedAccount {
    pub owner: Pubkey,
    pub source_chain_id: u32,
    pub dest_chain_id: u32,
    // eth addr - 0x(40 chars) - hex string
    // #[max_len(42)]
    pub dest_chain_addr: String,
    pub dest_chain_mint_addr: String,
    pub mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub deposit_id: u128,
}

#[derive(Serialize, Debug)]
pub struct SolDepositProofCircuitInputs {
    // public
    stateRoot: String,
    amount: String,
    destChainId: String,
    destChainAddr: String,

    // private
    accountHash: String,
    leafIndex: String,
    merkleProof: Vec<String>,
    pathIndices: Vec<String>,
    owner: String,
    sourceChainId: String,
    mint: String,
    timestamp: String,
    despositId: String,
    dataHash: String,
}

pub fn hexToField(hex_str: &str) -> String {
    let hex_clean = hex_str.strip_prefix("0x").unwrap_or(hex_str);
    let bytes = hex::decode(hex_clean).unwrap();
    let bn = num_bigint::BigUint::from_bytes_be(&bytes);
    bn.to_string()
}

pub fn stringToField(str: String) -> String {
    if str.starts_with("0x") {
        return hexToField(&str);
    }
    let bytes = str.as_bytes();
    let bn = num_bigint::BigUint::from_bytes_be(bytes);
    bn.to_string()
}

pub fn computePathIndices(leaf_index: u64, levels: u32) -> Vec<String> {
    let mut pathIndices = Vec::new();
    let mut index = leaf_index;
    for _i in 0..levels {
        pathIndices.push((index % 2).to_string());
        index = index / 2;
    }
    pathIndices
}

// Add helper to parse numeric value as hex digits (base16) into decimal string
fn parse_decimal_string_as_hex(input: &str) -> String {
    use num_bigint::BigUint;
    // Interpret the decimal digit string as a base-16 number (same as JS parseInt(str,16))
    BigUint::parse_bytes(input.as_bytes(), 16)
        .unwrap_or_else(|| BigUint::from(0u8))
        .to_string()
}

pub const TREE_LEVELS: u32 = 26;

pub fn constructSolDepositCircuitInputs(
    account_data: CompressedAccount,
    deposit_record: DepositRecordCompressedAccount,
    proof: MerkleProof,
) -> Result<SolDepositProofCircuitInputs, Error> {
    // Determine the leaf index to use.  When `seq` is available we mimic the JS script behaviour
    // by using `seq + 1`, otherwise fall back to the leaf index contained in the proof.
    let leaf_index_for_circuit: u64 = account_data
        .seq
        .map(|s| s + 1)
        .unwrap_or(proof.leaf_index);

    let circuit_inputs = SolDepositProofCircuitInputs {
        // public
        stateRoot: hexToField(&hex::encode(proof.root)),
        amount: deposit_record.amount.to_string(),
        destChainId: deposit_record.dest_chain_id.to_string(),
        destChainAddr: stringToField(deposit_record.dest_chain_addr.clone()),

        // private
        accountHash: hexToField(&hex::encode(proof.hash)),
        leafIndex: leaf_index_for_circuit.to_string(),
        merkleProof: {
            let mut field_strs: Vec<String> = proof
                .proof
                .iter()
                .map(|x| hexToField(&hex::encode(x)))
                .collect();
            while field_strs.len() < TREE_LEVELS as usize {
                field_strs.push("0".to_string());
            }
            field_strs.truncate(TREE_LEVELS as usize);
            field_strs
        },
        pathIndices: computePathIndices(leaf_index_for_circuit, TREE_LEVELS),
        owner: {
            let bn = num_bigint::BigUint::from_bytes_be(deposit_record.owner.to_bytes().as_ref());
            bn.to_string()
        },
        sourceChainId: deposit_record.source_chain_id.to_string(),
        mint: {
            let bn = num_bigint::BigUint::from_bytes_be(deposit_record.mint.to_bytes().as_ref());
            bn.to_string()
        },
        timestamp: parse_decimal_string_as_hex(&deposit_record.timestamp.to_string()),
        despositId: deposit_record.deposit_id.to_string(),
        dataHash: hexToField(&hex::encode(
            account_data
                .data
                .as_ref()
                .ok_or_else(|| actix_web::error::ErrorInternalServerError("Missing account data"))?
                .data_hash,
        )),
    };

    println!("circuit_inputs: {:?}", circuit_inputs);

    Ok(circuit_inputs)
}

rust_witness::witness!(solDepositProof);

pub fn generateCircomProof(
    inputs: SolDepositProofCircuitInputs
) -> Result<(), Error> {

    let input_str = serde_json::to_string(&inputs).unwrap();
    let zkey_path = "../circom/solDepositProof_js/1_0000.zkey".to_string();
    let result = CircomProver::prove(
            ProofLib::Arkworks,
            WitnessFn::RustWitness(solDepositProof_witness),
            input_str,
            zkey_path.clone()
        )
        .unwrap();
    println!("result: {:?}", result);

    let vaild = CircomProver::verify(
        ProofLib::Arkworks,
        result,
        zkey_path
    );
    println!("vaild: {:?}", vaild);

    Ok(())
}

#[actix_web::get("/api/greet")]
async fn greet(address: web::Json<CompressedAccountAddress>) -> Result<impl Responder, Error> {
    let mut rpc = LightClient::new(LightClientConfig::local()).await.unwrap();

    let address = bs58::decode(address.address.clone())
    .into_vec()
    .unwrap()
    .try_into()
    .unwrap();

    let account_data = rpc.get_compressed_account(address , None)
    .await
    .unwrap()
    .value;

    println!("account_data: {:?}", &account_data);

    let deposit_record = borsh
    ::from_slice
    ::<DepositRecordCompressedAccount>(
        &account_data.data.as_ref().unwrap().data
    )
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to decode deposit record: {}", e)))?;

    // { 
    //     owner: FH1dsRToGVrk6fkmA5uNFyFw6RvBapzH3R9uP4iwvLwD,
    //     source_chain_id: 1,
    //     dest_chain_id: 31337,
    //     dest_chain_addr: "2sQCd2fMbvU2yAAbjU4NQgVfeaTi",
    //     dest_chain_mint_addr: "2MPHj8Zrer3RSmZok3ShPcveeRF5",
    //     mint: 8Rauk7qcXAqb3VravahxkmovCwNYkyaHUB6fdUpyjTGa,
    //     amount: 10000,
    //     timestamp: 1750482928,
    //     deposit_id: 1
    // }
    println!("deposit_record: {:?}", deposit_record);


    let proof_result = rpc.get_multiple_compressed_account_proofs([account_data.hash].to_vec(), None)
    .await
    .unwrap();
    
    let compressed_account_proof = proof_result
    .value
    .items
    .first()
    .unwrap();

    println!("compressed_account_proof: {:?}", compressed_account_proof);

    let circuit_inputs = constructSolDepositCircuitInputs(account_data, deposit_record, compressed_account_proof.clone())?;

    generateCircomProof(circuit_inputs);

    Ok(web::Json(Res{}))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {


    HttpServer::new(|| App::new()
        .service(greet)
    )
    .bind(("127.0.0.1", 3005))?
    .run()
    .await
}
