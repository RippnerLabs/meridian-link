use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use crate::state::TokenBridge;

#[derive(Accounts)]
#[instruction(
    source_chain: u32,
    source_chain_mint_addr: String,
    dest_chain: u32,
    dest_chain_mint_addr: String,
    link_hash: String,
)]
pub struct InitTokenBridgeContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        payer=signer,
        space=8+TokenBridge::INIT_SPACE,
        seeds=[
            b"tb",
            link_hash.as_bytes().as_ref(),
        ],
        bump,
    )]
    pub token_bridge: Account<'info, TokenBridge>,

    pub system_program: Program<'info, System>,
}

pub fn init_token_bridge_handler(
    ctx: Context<InitTokenBridgeContext>,
    source_chain: u32,
    source_chain_mint_addr: String,
    dest_chain: u32,
    dest_chain_mint_addr: String,
    link_hash: String,
) -> Result<()> {
    let token_bridge = &mut ctx.accounts.token_bridge;
    token_bridge.source_chain = source_chain;
    token_bridge.source_chain_mint_addr = source_chain_mint_addr;
    token_bridge.dest_chain = dest_chain;
    token_bridge.dest_chain_mint_addr = dest_chain_mint_addr;
    // token_bridge.link_hash = link_hash;

    Ok(())
}