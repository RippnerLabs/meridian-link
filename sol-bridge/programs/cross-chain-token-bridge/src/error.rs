use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("DepositAmountShouldBeGreaterThanZero")]
    DepositAmountShouldBeGreaterThanZero,

    #[msg("WithdrawAmountShouldBeGreaterThanZero")]
    WithdrawAmountShouldBeGreaterThanZero,

    #[msg("Invalid Proof Data")]
    InvalidProofData,

    #[msg("Groth16 Verification Failed")]
    Groth16VerificationFailed,

    #[msg("Invalid args")]
    InvalidArgs
}