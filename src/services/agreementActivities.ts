// This service uses The Graph to get on-chain transaction activities based on agreement id

import { contractService } from './contractService';

const THE_GRAPH_URL = "https://api.studio.thegraph.com/query/106159/fyp/v0.0.1";

// Types for The Graph entities
export interface AgreementCreated {
  id: string;
  tokenId: string;
  agreementId: string;
  owner: string;
  assetName: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface SignerAdded {
  id: string;
  tokenId: string;
  signerIC: string;
  signerName: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface AgreementSigned {
  id: string;
  tokenId: string;
  signerIC: string;
  timestamp: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface AdminSigned {
  id: string;
  tokenId: string;
  admin: string;
  adminName: string;
  timestamp: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface AgreementCompleted {
  id: string;
  tokenId: string;
  status: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface AgreementActivity {
  id: string;
  type: 'created' | 'signer_added' | 'signed' | 'admin_signed' | 'completed';
  tokenId: string;
  transactionHash: string;
  blockNumber: string;
  blockTimestamp: string;
  timestamp: Date;
  details: {
    assetName?: string;
    signerName?: string;
    signerIC?: string;
    adminName?: string;
    status?: string;
    owner?: string;
  };
}

// GraphQL query to fetch all activities for a specific token ID
const GET_AGREEMENT_ACTIVITIES = `
  query GetAgreementActivities($tokenId: BigInt!) {
    agreementCreateds(where: { tokenId: $tokenId }, orderBy: blockTimestamp, orderDirection: asc) {
      id
      tokenId
      agreementId
      owner
      assetName
      blockNumber
      blockTimestamp
      transactionHash
    }
    signerAddeds(where: { tokenId: $tokenId }, orderBy: blockTimestamp, orderDirection: asc) {
      id
      tokenId
      signerIC
      signerName
      blockNumber
      blockTimestamp
      transactionHash
    }
    agreementSigneds(where: { tokenId: $tokenId }, orderBy: blockTimestamp, orderDirection: asc) {
      id
      tokenId
      signerIC
      timestamp
      blockNumber
      blockTimestamp
      transactionHash
    }
    adminSigneds(where: { tokenId: $tokenId }, orderBy: blockTimestamp, orderDirection: asc) {
      id
      tokenId
      admin
      adminName
      timestamp
      blockNumber
      blockTimestamp
      transactionHash
    }
    agreementCompleteds(where: { tokenId: $tokenId }, orderBy: blockTimestamp, orderDirection: asc) {
      id
      tokenId
      status
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

export async function getAgreementActivities(agreementId: string): Promise<AgreementActivity[]> {
  try {
    // First, get the token ID from the agreement ID using the contract service
    if (!contractService) {
      throw new Error('Contract service not available');
    }

    const tokenResult = await contractService.getTokenIdFromAgreementId(agreementId);
    if (!tokenResult.success || !tokenResult.tokenId) {
      throw new Error(tokenResult.error || 'Failed to get token ID');
    }

    const tokenId = tokenResult.tokenId;
    console.log(`Fetching activities for agreement ${agreementId} (token ${tokenId})`);

    // Query The Graph for all activities related to this token ID
    // Convert tokenId to string for GraphQL BigInt
    const response = await fetch(THE_GRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GET_AGREEMENT_ACTIVITIES,
        variables: { tokenId: tokenId.toString() },
      }),
    });

    if (!response.ok) {
      throw new Error(`The Graph query failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    const activities: AgreementActivity[] = [];

    // Process Agreement Created events
    data.data.agreementCreateds?.forEach((event: AgreementCreated) => {
      if (event && event.id && event.transactionHash) {
        activities.push({
          id: event.id,
          type: 'created',
          tokenId: event.tokenId,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: event.blockTimestamp,
          timestamp: new Date(parseInt(event.blockTimestamp) * 1000),
          details: {
            assetName: event.assetName || 'Unknown Asset',
            owner: event.owner,
          },
        });
      }
    });

    // Process Signer Added events
    data.data.signerAddeds?.forEach((event: SignerAdded) => {
      if (event && event.id && event.transactionHash) {
        activities.push({
          id: event.id,
          type: 'signer_added',
          tokenId: event.tokenId,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: event.blockTimestamp,
          timestamp: new Date(parseInt(event.blockTimestamp) * 1000),
          details: {
            signerName: event.signerName || 'Unknown Signer',
            signerIC: event.signerIC || 'Unknown IC',
          },
        });
      }
    });

    // Process Agreement Signed events
    data.data.agreementSigneds?.forEach((event: AgreementSigned) => {
      if (event && event.id && event.transactionHash) {
        activities.push({
          id: event.id,
          type: 'signed',
          tokenId: event.tokenId,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: event.blockTimestamp,
          timestamp: new Date(parseInt(event.blockTimestamp) * 1000),
          details: {
            signerIC: event.signerIC || 'Unknown IC',
          },
        });
      }
    });

    // Process Admin Signed events
    data.data.adminSigneds?.forEach((event: AdminSigned) => {
      if (event && event.id && event.transactionHash) {
        activities.push({
          id: event.id,
          type: 'admin_signed',
          tokenId: event.tokenId,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: event.blockTimestamp,
          timestamp: new Date(parseInt(event.blockTimestamp) * 1000),
          details: {
            adminName: event.adminName || 'Unknown Admin',
          },
        });
      }
    });

    // Process Agreement Completed events
    data.data.agreementCompleteds?.forEach((event: AgreementCompleted) => {
      if (event && event.id && event.transactionHash) {
        activities.push({
          id: event.id,
          type: 'completed',
          tokenId: event.tokenId,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: event.blockTimestamp,
          timestamp: new Date(parseInt(event.blockTimestamp) * 1000),
          details: {
            status: event.status || 'Unknown Status',
          },
        });
      }
    });

    // Sort activities by block timestamp (oldest first)
    activities.sort((a, b) => parseInt(a.blockTimestamp) - parseInt(b.blockTimestamp));

    console.log(`Found ${activities.length} activities for agreement ${agreementId}`);
    return activities;

  } catch (error) {
    console.error('Error fetching agreement activities:', error);
    throw error;
  }
}

// Helper function to get a human-readable description of the activity
export function getActivityDescription(activity: AgreementActivity): string {
  switch (activity.type) {
    case 'created':
      return `Agreement created for asset "${activity.details.assetName}"`;
    case 'signer_added':
      return `Signer added: ${activity.details.signerName} (${activity.details.signerIC})`;
    case 'signed':
      return `Agreement signed by ${activity.details.signerIC}`;
    case 'admin_signed':
      return `Admin signed: ${activity.details.adminName}`;
    case 'completed':
      return `Agreement completed with status: ${activity.details.status}`;
    default:
      return 'Unknown activity';
  }
}

// Helper function to get activity type badge
export function getActivityTypeColor(type: AgreementActivity['type']): string {
  switch (type) {
    case 'created':
      return 'bg-blue-100 text-blue-800';
    case 'signer_added':
      return 'bg-yellow-100 text-yellow-800';
    case 'signed':
      return 'bg-green-100 text-green-800';
    case 'admin_signed':
      return 'bg-purple-100 text-purple-800';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
