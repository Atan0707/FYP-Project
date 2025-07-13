import { ethers } from 'ethers';
import ContractABI from '@/contract/ContractABI.json';
import { CONTRACT_ADDRESS } from '@/lib/config';

// Helper function for retrying contract calls
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 2000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error);
      lastError = error;
      
      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Increase delay for next attempt (exponential backoff)
        delay = delay * 1.5;
      }
    }
  }
  
  throw lastError;
}

class ContractService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    // Validate environment variables
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
    const contractAddress = CONTRACT_ADDRESS;

    if (!rpcUrl) {
      throw new Error('RPC URL not configured');
    }

    if (!privateKey) {
      throw new Error('Private key not configured');
    }

    if (!contractAddress) {
      throw new Error('Contract address not configured');
    }

    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Initialize signer with private key
      this.signer = new ethers.Wallet(privateKey, this.provider);
      
      // Validate contract address format
      if (!ethers.isAddress(contractAddress)) {
        throw new Error('Invalid contract address format');
      }

      // Initialize contract
      this.contract = new ethers.Contract(
        contractAddress,
        ContractABI.output.abi,
        this.signer
      );
    } catch (error) {
      console.error('Error initializing contract service:', error);
      throw new Error('Failed to initialize contract service: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async adminSignAgreement(
    tokenId: string,
    adminName: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    return retryOperation(async () => {
      try {
        if (!this.contract) {
          throw new Error('Contract not initialized');
        }

        // Call the contract's adminSignAgreement function with just tokenId and adminName
        const tx = await this.contract.adminSignAgreement(tokenId, adminName);
        await tx.wait();

        // If notes are provided, add them in a separate transaction
        if (notes && notes.trim() !== '') {
          const notesTx = await this.contract.addNotes(tokenId, notes);
          await notesTx.wait();
        }

        return { success: true };
      } catch (error) {
        console.error('Error signing agreement:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        };
      }
    });
  }

  async createAgreement(
    agreementId: string,
    assetName: string,
    assetType: string,
    assetValue: number,
    distributionType: string,
    metadataURI: string
  ): Promise<{ success: boolean; tokenId?: string; transactionHash?: string; error?: string }> {
    return retryOperation(async () => {
      try {
        if (!this.contract) {
          throw new Error('Contract not initialized');
        }

        // Call the contract's createAgreement function
        const tx = await this.contract.createAgreement(
          agreementId,
          assetName,
          assetType,
          ethers.parseEther(assetValue.toString()), // Convert to wei
          distributionType,
          metadataURI
        );

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // Get the tokenId from the AgreementCreated event
        const event = receipt?.logs.find(
          (log: ethers.Log) => this.contract.interface.parseLog(log)?.name === 'AgreementCreated'
        );

        const parsedLog = event ? this.contract.interface.parseLog(event) : null;
        const tokenId = parsedLog?.args?.tokenId?.toString();

        return { 
          success: true,
          tokenId,
          transactionHash: tx.hash
        };
      } catch (error) {
        console.error('Error creating agreement:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        };
      }
    });
  }

  async addSigner(
    tokenId: string,
    signerName: string,
    signerIC: string
  ): Promise<{ success: boolean; error?: string }> {
    return retryOperation(async () => {
      try {
        if (!this.contract) {
          throw new Error('Contract not initialized');
        }

        // Validate inputs
        if (!tokenId || tokenId.trim() === '') {
          throw new Error('Token ID is required');
        }

        if (!signerName || signerName.trim() === '') {
          throw new Error('Signer name is required');
        }

        if (!signerIC || signerIC.trim() === '') {
          throw new Error('Signer IC is required');
        }

        // Convert tokenId to number for the contract call
        const tokenIdNumber = parseInt(tokenId, 10);
        if (isNaN(tokenIdNumber) || tokenIdNumber < 0) {
          throw new Error(`Invalid token ID: ${tokenId}`);
        }

        console.log(`Adding signer to token ${tokenIdNumber}: ${signerName} (${signerIC})`);

        // Call the contract's addSigner function
        const tx = await this.contract.addSigner(tokenIdNumber, signerName, signerIC);
        await tx.wait();

        console.log(`Signer added successfully. Transaction hash: ${tx.hash}`);
        return { success: true };
      } catch (error) {
        console.error('Error adding signer:', error);
        
        // Parse the error to provide more specific error messages
        let errorMessage = 'Unknown error occurred';
        
        if (error instanceof Error) {
          errorMessage = error.message;
          
          // Check for specific contract errors
          if (error.message.includes('Agreement does not exist')) {
            errorMessage = 'Agreement does not exist or you do not have permission to add signers';
          } else if (error.message.includes('Only owner or admin can add signers')) {
            errorMessage = 'Only the agreement owner or admin can add signers';
          } else if (error.message.includes('Agreement is already completed')) {
            errorMessage = 'Cannot add signers to a completed agreement';
          } else if (error.message.includes('execution reverted')) {
            errorMessage = 'Transaction failed: The smart contract rejected the operation. Please check if the agreement exists and you have permission to add signers.';
          } else if (error.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds to complete the transaction';
          } else if (error.message.includes('nonce')) {
            errorMessage = 'Transaction nonce error. Please try again.';
          } else if (error.message.includes('gas')) {
            errorMessage = 'Gas estimation failed. The transaction might fail or require more gas.';
          }
        }
        
        return { 
          success: false, 
          error: errorMessage
        };
      }
    });
  }

  async getTokenIdFromAgreementId(
    agreementId: string
  ): Promise<{ success: boolean; tokenId?: string; error?: string }> {
    return retryOperation(async () => {
      try {
        if (!this.contract) {
          throw new Error('Contract not initialized');
        }

        // Call the contract's getTokenIdFromAgreementId function
        const tokenId = await this.contract.getTokenIdFromAgreementId(agreementId);
        
        return { 
          success: true,
          tokenId: tokenId.toString()
        };
      } catch (error) {
        console.error('Error getting token ID:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        };
      }
    });
  }

  async signAgreement(
    tokenId: string,
    signerIC: string
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    return retryOperation(async () => {
      try {
        if (!this.contract) {
          throw new Error('Contract not initialized');
        }

        // Call the contract's signAgreement function
        const tx = await this.contract.signAgreement(tokenId, signerIC);
        await tx.wait();

        return { 
          success: true,
          transactionHash: tx.hash
        };
      } catch (error) {
        console.error('Error signing agreement:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        };
      }
    });
  }

  async getAgreementDetails(tokenId: string) {
    return retryOperation(async () => {
      try {
        if (!this.contract) {
          throw new Error('Contract not initialized');
        }

        // Convert tokenId to number for the contract call
        const tokenIdNumber = parseInt(tokenId, 10);
        if (isNaN(tokenIdNumber) || tokenIdNumber < 0) {
          throw new Error(`Invalid token ID: ${tokenId}`);
        }

        console.log(`Fetching agreement details for token ${tokenIdNumber}`);
        const agreement = await this.contract.agreements(tokenIdNumber);
        
        console.log('Agreement details:', {
          id: agreement.id?.toString(),
          agreementId: agreement.agreementId,
          status: agreement.status,
          owner: agreement.owner,
          adminAddress: agreement.adminAddress,
          isActive: agreement.isActive
        });
        
        return agreement;
      } catch (error) {
        console.error('Error fetching agreement details:', error);
        throw error;
      }
    });
  }

  async checkTokenOwnership(tokenId: string): Promise<{ success: boolean; owner?: string; error?: string }> {
    return retryOperation(async () => {
      try {
        if (!this.contract) {
          throw new Error('Contract not initialized');
        }

        // Convert tokenId to number for the contract call
        const tokenIdNumber = parseInt(tokenId, 10);
        if (isNaN(tokenIdNumber) || tokenIdNumber < 0) {
          throw new Error(`Invalid token ID: ${tokenId}`);
        }

        console.log(`Checking ownership for token ${tokenIdNumber}`);
        
        // Check if token exists first
        try {
          const owner = await this.contract.ownerOf(tokenIdNumber);
          console.log(`Token ${tokenIdNumber} owner:`, owner);
          console.log(`Current signer address:`, this.signer.address);
          
          return { 
            success: true, 
            owner: owner 
          };
        } catch (ownerError) {
          console.error('Error checking token ownership:', ownerError);
          
          if (ownerError instanceof Error && ownerError.message.includes('ERC721NonexistentToken')) {
            return { 
              success: false, 
              error: `Token ${tokenIdNumber} does not exist` 
            };
          }
          
          throw ownerError;
        }
      } catch (error) {
        console.error('Error checking token ownership:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        };
      }
    });
  }
}

// Create and export the contract service instance with error handling
let contractServiceInstance: ContractService | null = null;

try {
  contractServiceInstance = new ContractService();
} catch (error) {
  console.error('Failed to initialize contract service:', error);
  // You might want to handle this error in your application
}

export const contractService = contractServiceInstance; 