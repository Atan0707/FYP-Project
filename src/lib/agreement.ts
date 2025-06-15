import { ethers } from 'ethers';
import AgreementContract from '../contract/ContractABI.json';
import { CONTRACT_ADDRESS } from './config';

export const createAgreement = async (
  signer: ethers.Signer,
  agreementId: string,
  assetName: string,
  assetType: string,
  assetValue: number,
  distributionType: string,
  metadataURI: string
) => {
  try {
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      AgreementContract.output.abi,
      signer
    );

    const tx = await contract.createAgreement(
      agreementId,
      assetName,
      assetType,
      assetValue,
      distributionType,
      metadataURI
    );

    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error creating agreement:', error);
    throw error;
  }
};

export const addSigner = async (
  signer: ethers.Signer,
  tokenId: number,
  signerName: string,
  signerIC: string
) => {
  try {
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      AgreementContract.output.abi,
      signer
    );

    const tx = await contract.addSigner(
      tokenId,
      signerName,
      signerIC
    );
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error adding signer:', error);
    throw error;
  }
};

export const signAgreement = async (
  signer: ethers.Signer,
  tokenId: number,
  signerIC: string
) => {
  try {
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      AgreementContract.output.abi,
      signer
    );

    const tx = await contract.signAgreement(tokenId, signerIC);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error signing agreement:', error);
    throw error;
  }
};

export const getAgreementDetails = async (
  provider: ethers.Provider,
  tokenId: number
) => {
  try {
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      AgreementContract.output.abi,
      provider
    );

    const details = await contract.getAgreementDetails(tokenId);
    return details;
  } catch (error) {
    console.error('Error getting agreement details:', error);
    throw error;
  }
}; 