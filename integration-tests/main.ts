import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs';
import path from 'path';

async function main() {
    
    const execAsync = promisify(exec);
    
    console.log("Starting integration tests...");
    
    let hardhatNode: ChildProcess | null = null;
    let testValidator: ChildProcess | null = null;
    
    try {
        // 1. Start hardhat node in background process
        console.log("Starting Hardhat node...");
        hardhatNode = spawn('npx', ['hardhat', 'node'], {
            cwd: './evm-bridge',
            stdio: 'pipe'
        });

        // 2. Start light test-validator
        console.log("Starting light test validator...");
        testValidator = spawn('light', ['test-validator'], {
            stdio: 'pipe'
        });

        // Wait a bit for test validator to start
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 3. Deploy contracts using the deploy script
        console.log("Deploying contracts...");
        const { stdout, stderr } = await execAsync('npx hardhat run scripts/deploy.ts --network localhost', {
            cwd: './evm-bridge'
        });

        console.log("Deploy output:", stdout);
        if (stderr) console.error("Deploy errors:", stderr);
        
        // Wait for deployment to complete
        console.log("Waiting for deployment to complete...");
        
        // 4. run solana to ethereum token bridge
        // use the second wallet address from hardhat as DEST_CHAIN_ADDR env variable
        // use tokenaddress from addressBook.json as DEST_CHAIN_MINT_ADDR env variable
        // both without 0x prefix hex
        const addressBook = JSON.parse(fs.readFileSync(path.join(__dirname, './addressBook.json'), 'utf8'));
        const anchorTests = spawn('anchor', [ 'test','--skip-local-validator'], {
            cwd: './sol-bridge',
            stdio: 'pipe',
            env: {
                ...process.env,
                DEST_CHAIN_ADDR: addressBook.secondWalletAddress.replace('0x', ''),
                DEST_CHAIN_MINT_ADDR: addressBook.tokenSmartContractAddress.replace('0x', '')
            }
        });
        
        await new Promise((resolve, reject) => {
            anchorTests.on('close', (code) => {
                if (code === 0) {
                    resolve(code);
                } else {
                    reject(new Error(`Anchor tests process exited with code ${code}`));
                }
            });
            
            anchorTests.on('error', (error) => {
                reject(error);
            });
        });
        console.log("Anchor tests output:", anchorTests.stdout);

        // 5. generate inputs for solDepositProof.circom
        const solDepositProofInput = spawn('npx', ['esrun', './scripts/generate-solana-deposit-proof-circuit-input.ts'], {
            cwd: './circom',
            stdio: 'pipe'
        });
        
        await new Promise((resolve, reject) => {
            solDepositProofInput.on('close', (code) => {
                if (code === 0) {
                    resolve(code);
                } else {
                    reject(new Error(`SolDepositProofInput process exited with code ${code}`));
                }
            });
            
            solDepositProofInput.on('error', (error) => {
                reject(error);
            });
        });
        
        console.log("SolDepositProofInput completed successfully", solDepositProofInput.stdout);

        // 6. process withdrawal on evm side
        const { stdout: processWithdrawalOutput, stderr: processWithdrawalError } = await execAsync('npx hardhat run scripts/processWithdrawal.ts --network localhost', {
            cwd: './evm-bridge'
        });

        console.log("ProcessWithdrawal output:", processWithdrawalOutput);
        if (processWithdrawalError) console.error("ProcessWithdrawal errors:", processWithdrawalError);
    } catch (error) {
        console.error("Error during integration tests:", error);
    } finally {
        // Cleanup processes
        if (hardhatNode) {
            console.log("Stopping Hardhat node...");
            hardhatNode.kill();
        }
        if (testValidator) {
            console.log("Stopping test validator...");
            const testValidatorStop = spawn('light', ['test-validator','--stop'], {
                stdio: 'pipe'
            });
        }
    }
}

main()