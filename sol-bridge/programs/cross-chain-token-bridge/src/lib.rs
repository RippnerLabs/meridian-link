use anchor_lang::prelude::*;
use light_sdk::{
    account::LightAccount,
    address::v1::derive_address,
    cpi::{CpiAccounts, CpiInputs},
    instruction::{
        account_meta::CompressedAccountMeta, merkle_context::PackedAddressMerkleContext,
    },
    LightDiscriminator, LightHasher, NewAddressParamsPacked, ValidityProof,
};
mod state;
mod zk;
mod instructions;
mod error;
use instructions::*;

declare_id!("82ZuVtSrqVWfmuxH34R9ASdwLJ6TTNxGyBeBXbeZMycP");

#[program]
pub mod cross_chain_token_bridge {

    use super::*;

    pub fn init(ctx: Context<InitContext>) -> Result<()> {
        return init_handler(ctx);
    }

    pub fn init_withdrawal_proof_account(ctx: Context<InitWithdrawalProofAccountContext>, withdrawal_id: u128, proof_a: [u8; 64], proof_b: [u8; 128], proof_c: [u8; 64], nullifier: [u8; 32], new_root: [u8; 32]) -> Result<()> {
        return init_withdrawal_proof_account_handler(ctx, withdrawal_id, proof_a, proof_b, proof_c, nullifier, new_root);
    }

    pub fn init_token_bridge(
        ctx: Context<InitTokenBridgeContext>,
        source_chain: u32,
        source_chain_mint_addr: String,
        dest_chain: u32,
        dest_chain_mint_addr: String,
        link_hash: String,
    ) -> Result<()> {
        return init_token_bridge_handler(ctx, source_chain, source_chain_mint_addr, dest_chain, dest_chain_mint_addr, link_hash);
    }
    
    pub fn deposit<'info> (
        ctx: Context<'_, '_, '_, 'info, DepositContext<'info>>,
        proof: ValidityProof,
        address_merkle_context: PackedAddressMerkleContext,
        output_merkle_tree_index: u8,
        amount: u64,
        link_hash: String,
        dest_chain_addr: String,
    ) -> Result<()> {
        return deposit_handler(ctx, proof, address_merkle_context, output_merkle_tree_index, amount, link_hash, dest_chain_addr);
    }

    pub fn withdraw<'info>(
        ctx: Context<'_,'_,'_, 'info, WithdrawContext<'info>>,
        proof: ValidityProof,
        address_merkle_context: PackedAddressMerkleContext,
        output_merkle_tree_index: u8,
        amount: u64,
        withdraw_addr: Pubkey,
        // depositer: String,
        link_hash: String,
        withdrawal_id: u128
    ) -> Result<()> {
        return withdraw_handler(ctx, proof, address_merkle_context, output_merkle_tree_index, amount, withdraw_addr, link_hash, withdrawal_id);
    }

    pub fn create<'info>(
        ctx: Context<'_, '_, '_, 'info, GenericAnchorAccounts<'info>>,
        proof: ValidityProof,
        address_merkle_context: PackedAddressMerkleContext,
        output_merkle_tree_index: u8,
    ) -> Result<()> {
        let program_id = crate::ID.into();
        let light_cpi_accounts = CpiAccounts::new(
            ctx.accounts.signer.as_ref(),
            ctx.remaining_accounts,
            crate::ID,
        )
        .map_err(ProgramError::from)?;

        let (address, address_seed) = derive_address(
            &[b"counter", ctx.accounts.signer.key().as_ref()],
            &light_cpi_accounts.tree_accounts()
                [address_merkle_context.address_merkle_tree_pubkey_index as usize]
                .key(),
            &crate::ID,
        );

        let new_address_params = NewAddressParamsPacked {
            seed: address_seed,
            address_queue_account_index: address_merkle_context.address_queue_pubkey_index,
            address_merkle_tree_root_index: address_merkle_context.root_index,
            address_merkle_tree_account_index: address_merkle_context
                .address_merkle_tree_pubkey_index,
        };

        let mut counter = LightAccount::<'_, CounterCompressedAccount>::new_init(
            &program_id,
            Some(address),
            output_merkle_tree_index,
        );

        counter.owner = ctx.accounts.signer.key();

        let cpi = CpiInputs::new_with_address(
            proof,
            vec![counter.to_account_info().map_err(ProgramError::from)?],
            vec![new_address_params],
        );
        cpi.invoke_light_system_program(light_cpi_accounts)
            .map_err(ProgramError::from)?;

        Ok(())
    }

    pub fn increment<'info>(
        ctx: Context<'_, '_, '_, 'info, GenericAnchorAccounts<'info>>,
        proof: ValidityProof,
        counter_value: u64,
        account_meta: CompressedAccountMeta,
    ) -> Result<()> {
        let program_id = crate::ID.into();
        let mut counter = LightAccount::<'_, CounterCompressedAccount>::new_mut(
            &program_id,
            &account_meta,
            CounterCompressedAccount {
                owner: ctx.accounts.signer.key(),
                counter: counter_value,
            },
        )
        .map_err(ProgramError::from)?;

        counter.counter += 1;

        let light_cpi_accounts = CpiAccounts::new(
            ctx.accounts.signer.as_ref(),
            ctx.remaining_accounts,
            crate::ID,
        )
        .map_err(ProgramError::from)?;

        let cpi = CpiInputs::new(
            proof,
            vec![counter.to_account_info().map_err(ProgramError::from)?],
        );

        cpi.invoke_light_system_program(light_cpi_accounts)
            .map_err(ProgramError::from)?;

        Ok(())
    }

    pub fn delete<'info>(
        ctx: Context<'_, '_, '_, 'info, GenericAnchorAccounts<'info>>,
        proof: ValidityProof,
        counter_value: u64,
        account_meta: CompressedAccountMeta,
    ) -> Result<()> {
        let program_id = crate::ID.into();

        let counter = LightAccount::<'_, CounterCompressedAccount>::new_close(
            &program_id,
            &account_meta,
            CounterCompressedAccount {
                owner: ctx.accounts.signer.key(),
                counter: counter_value,
            },
        )
        .map_err(ProgramError::from)?;

        let light_cpi_accounts = CpiAccounts::new(
            ctx.accounts.signer.as_ref(),
            ctx.remaining_accounts,
            crate::ID,
        )
        .map_err(ProgramError::from)?;

        let cpi = CpiInputs::new(
            proof,
            vec![counter.to_account_info().map_err(ProgramError::from)?],
        );

        cpi.invoke_light_system_program(light_cpi_accounts)
            .map_err(ProgramError::from)?;

        Ok(())
    }
}

// Declare compressed account as event so that it is included in the anchor idl.
#[event]
#[derive(
    Clone, Debug, Default, LightDiscriminator, LightHasher,
)]
pub struct CounterCompressedAccount {
    #[hash]
    pub owner: Pubkey,
    pub counter: u64,
}

#[derive(Accounts)]
pub struct GenericAnchorAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
}
