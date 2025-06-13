import { ethers } from 'ethers';
import ContractABI from '@/contract/ContractABI.json';
import { CONTRACT_ADDRESS } from '@/lib/config';

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
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      // Call the contract's adminSignAgreement function
      const tx = await this.contract.adminSignAgreement(tokenId, adminName, notes || '');
      await tx.wait();

      return { success: true };
    } catch (error) {
      console.error('Error signing agreement:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async createAgreement(
    agreementId: string,
    assetName: string,
    assetType: string,
    assetValue: number,
    distributionType: string,
    metadataURI: string
  ): Promise<{ success: boolean; tokenId?: string; error?: string }> {
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
        tokenId
      };
    } catch (error) {
      console.error('Error creating agreement:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async addSigner(
    tokenId: string,
    signerName: string,
    signerIC: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      // Call the contract's addSigner function
      const tx = await this.contract.addSigner(tokenId, signerName, signerIC);
      await tx.wait();

      return { success: true };
    } catch (error) {
      console.error('Error adding signer:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async getTokenIdFromAgreementId(
    agreementId: string
  ): Promise<{ success: boolean; tokenId?: string; error?: string }> {
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
  }

  async signAgreement(
    tokenId: string,
    signerIC: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      // Call the contract's signAgreement function
      const tx = await this.contract.signAgreement(tokenId, signerIC);
      await tx.wait();

      return { success: true };
    } catch (error) {
      console.error('Error signing agreement:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async getAgreementDetails(tokenId: string) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const agreement = await this.contract.agreements(tokenId);
      return agreement;
    } catch (error) {
      console.error('Error fetching agreement details:', error);
      throw error;
    }
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