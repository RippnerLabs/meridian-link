import * as anchor from '@coral-xyz/anchor'
import { defaultStaticAccountsStruct, LightSystemProgram } from '@lightprotocol/stateless.js'

export class SystemAccountMetaConfig {
  selfProgram!: anchor.web3.PublicKey
  cpiContext?: anchor.web3.PublicKey
  solCompressionRecipient?: anchor.web3.PublicKey
  solPoolPda?: anchor.web3.PublicKey

  private constructor(
    selfProgram: anchor.web3.PublicKey,
    cpiContext?: anchor.web3.PublicKey,
    solCompressionRecipient?: anchor.web3.PublicKey,
    solPoolPda?: anchor.web3.PublicKey,
  ) {
    this.selfProgram = selfProgram
    this.cpiContext = cpiContext
    this.solCompressionRecipient = solCompressionRecipient
    this.solPoolPda = solPoolPda
  }

  static new(selfProgramId: anchor.web3.PublicKey) {
    return new SystemAccountMetaConfig(selfProgramId)
  }

  static newWithCpiContext(selfProgram: anchor.web3.PublicKey, cpiContext: anchor.web3.PublicKey) {
    return new SystemAccountMetaConfig(selfProgram, cpiContext)
  }
}

export class PackedAccounts {
  private preAccounts: anchor.web3.AccountMeta[] = []
  private systemAccounts: anchor.web3.AccountMeta[] = []
  private nextIndex: number = 0
  private map: Map<anchor.web3.PublicKey, [number, anchor.web3.AccountMeta]> = new Map()

  static newWithSystemAccounts(config: SystemAccountMetaConfig) {
    const instance = new PackedAccounts()
    instance.addSystemAccounts(config);
    return instance;
  }

  addSystemAccounts(config: SystemAccountMetaConfig): void {
    this.systemAccounts.push(...getLightSystemAccountMeta(config))
  }

  insertOrGet(pubkey: anchor.web3.PublicKey): number {
    return this.insertOrGetConfig(pubkey, false, true);
  }

  insertOrGetConfig(pubkey: anchor.web3.PublicKey, isSigner: boolean, isWritable: boolean): number {
    const entry = this.map.get(pubkey);
    if(entry) return entry[0];
    const index = this.nextIndex++;
    const meta: anchor.web3.AccountMeta = {pubkey, isSigner, isWritable};
    this.map.set(pubkey, [index, meta]);
    return index;
  }

  private hashSetAccountsToMetas(): anchor.web3.AccountMeta[] {
    const entries = Array.from(this.map.entries());
    entries.sort((a,b) => a[1][0] - b[1][0]);
    return entries.map(([,[,meta]]) => meta);
  }

  private getOffsets(): [number, number] {
    const systemStart = this.preAccounts.length;
    const packedStart = systemStart + this.systemAccounts.length;
    return [systemStart, packedStart];
  }

  toAccountMetas(): {
    remainingAccounts: anchor.web3.AccountMeta[];
    systemStart: number;
    packedStart: number;
  } {
    const packed = this.hashSetAccountsToMetas();
    const [systemStart, packedStart] = this.getOffsets();
    return {
        remainingAccounts: [
            ...this.preAccounts,
            ...this.systemAccounts,
            ...packed
        ],
        systemStart,
        packedStart,
    }
  }
}

function getLightSystemAccountMeta(config: SystemAccountMetaConfig): anchor.web3.AccountMeta[] {
  let signerSeed = new TextEncoder().encode("cpi_authority");
  const cpiSigner = anchor.web3.PublicKey.findProgramAddressSync([signerSeed], config.selfProgram)[0]
  const defaults = SystemAccountPubkeys.default()
  const metas: anchor.web3.AccountMeta[] = [
    { pubkey: defaults.lightSystemProgram, isSigner: false, isWritable: false },
    { pubkey: cpiSigner, isSigner: false, isWritable: false },
    {
      pubkey: defaults.registeredProgramPda,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: defaults.noopProgram, isSigner: false, isWritable: false },
    {
      pubkey: defaults.accountCompressionAuthority,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: defaults.accountCompressionProgram,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: config.selfProgram, isSigner: false, isWritable: false },
  ]
  if (config.solPoolPda) {
    metas.push({
      pubkey: config.solPoolPda,
      isSigner: false,
      isWritable: true,
    })
  }
  if (config.solCompressionRecipient) {
    metas.push({
      pubkey: config.solCompressionRecipient,
      isSigner: false,
      isWritable: true,
    })
  }
  metas.push({
    pubkey: defaults.systemProgram,
    isSigner: false,
    isWritable: false,
  })
  if (config.cpiContext) {
    metas.push({
      pubkey: config.cpiContext,
      isSigner: false,
      isWritable: true,
    })
  }
  return metas
}

class SystemAccountPubkeys {
  lightSystemProgram: anchor.web3.PublicKey
  systemProgram: anchor.web3.PublicKey
  accountCompressionProgram: anchor.web3.PublicKey
  accountCompressionAuthority: anchor.web3.PublicKey
  registeredProgramPda: anchor.web3.PublicKey
  noopProgram: anchor.web3.PublicKey
  solPoolPda: anchor.web3.PublicKey

  private constructor(
    lightSystemProgram: anchor.web3.PublicKey,
    systemProgram: anchor.web3.PublicKey,
    accountCompressionProgram: anchor.web3.PublicKey,
    accountCompressionAuthority: anchor.web3.PublicKey,
    registeredProgramPda: anchor.web3.PublicKey,
    noopProgram: anchor.web3.PublicKey,
    solPoolPda: anchor.web3.PublicKey,
  ) {
    this.lightSystemProgram = lightSystemProgram
    this.systemProgram = systemProgram
    this.accountCompressionProgram = accountCompressionProgram
    this.accountCompressionAuthority = accountCompressionAuthority
    this.registeredProgramPda = registeredProgramPda
    this.noopProgram = noopProgram
    this.solPoolPda = solPoolPda
  }

  static default(): SystemAccountPubkeys {
    return new SystemAccountPubkeys(
      LightSystemProgram.programId,
      anchor.web3.PublicKey.default,
      defaultStaticAccountsStruct().accountCompressionProgram,
      defaultStaticAccountsStruct().accountCompressionAuthority,
      defaultStaticAccountsStruct().registeredProgramPda,
      defaultStaticAccountsStruct().noopProgram,
      anchor.web3.PublicKey.default,
    )
  }
}
