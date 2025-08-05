// Service to fetch latest transactions from The Graph for display on the landing page

const THE_GRAPH_URL = "https://api.studio.thegraph.com/query/106159/fyp/v0.0.1";

export interface LatestTransaction {
  id: string;
  type: 'created' | 'signed' | 'admin_signed' | 'completed' | 'signer_added';
  transactionHash: string;
  blockNumber: string;
  blockTimestamp: string;
  timestamp: Date;
  details: {
    assetName?: string;
    signerName?: string;
    adminName?: string;
    status?: string;
    owner?: string;
  };
}

// Type definitions for The Graph API responses
interface AgreementCreatedEvent {
  id: string;
  tokenId: string;
  agreementId: string;
  owner: string;
  assetName: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface AgreementSignedEvent {
  id: string;
  tokenId: string;
  signerIC: string;
  timestamp: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface AdminSignedEvent {
  id: string;
  tokenId: string;
  admin: string;
  adminName: string;
  timestamp: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface AgreementCompletedEvent {
  id: string;
  tokenId: string;
  status: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface SignerAddedEvent {
  id: string;
  tokenId: string;
  signerIC: string;
  signerName: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

// GraphQL query to fetch latest transactions across all agreements
const GET_LATEST_TRANSACTIONS = `
  query GetLatestTransactions($first: Int!) {
    agreementCreateds(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      tokenId
      agreementId
      owner
      assetName
      blockNumber
      blockTimestamp
      transactionHash
    }
    agreementSigneds(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      tokenId
      signerIC
      timestamp
      blockNumber
      blockTimestamp
      transactionHash
    }
    adminSigneds(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      tokenId
      admin
      adminName
      timestamp
      blockNumber
      blockTimestamp
      transactionHash
    }
    agreementCompleteds(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      tokenId
      status
      blockNumber
      blockTimestamp
      transactionHash
    }
    signerAddeds(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      tokenId
      signerIC
      signerName
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

export async function getLatestTransactions(limit: number = 10): Promise<LatestTransaction[]> {
  try {
    console.log(`Fetching latest ${limit} transactions from The Graph`);

    const response = await fetch(THE_GRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GET_LATEST_TRANSACTIONS,
        variables: { first: limit },
      }),
    });

    if (!response.ok) {
      throw new Error(`The Graph query failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    const transactions: LatestTransaction[] = [];

    // Process Agreement Created events
    data.data.agreementCreateds?.forEach((event: AgreementCreatedEvent) => {
      if (event && event.id && event.transactionHash) {
        transactions.push({
          id: event.id,
          type: 'created',
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

    // Process Agreement Signed events
    data.data.agreementSigneds?.forEach((event: AgreementSignedEvent) => {
      if (event && event.id && event.transactionHash) {
        transactions.push({
          id: event.id,
          type: 'signed',
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: event.blockTimestamp,
          timestamp: new Date(parseInt(event.blockTimestamp) * 1000),
          details: {},
        });
      }
    });

    // Process Admin Signed events
    data.data.adminSigneds?.forEach((event: AdminSignedEvent) => {
      if (event && event.id && event.transactionHash) {
        transactions.push({
          id: event.id,
          type: 'admin_signed',
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: event.blockTimestamp,
          timestamp: new Date(parseInt(event.blockTimestamp) * 1000),
          details: {
            adminName: event.adminName || 'Administrator',
          },
        });
      }
    });

    // Process Agreement Completed events
    data.data.agreementCompleteds?.forEach((event: AgreementCompletedEvent) => {
      if (event && event.id && event.transactionHash) {
        transactions.push({
          id: event.id,
          type: 'completed',
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: event.blockTimestamp,
          timestamp: new Date(parseInt(event.blockTimestamp) * 1000),
          details: {
            status: event.status || 'Completed',
          },
        });
      }
    });

    // Process Signer Added events
    data.data.signerAddeds?.forEach((event: SignerAddedEvent) => {
      if (event && event.id && event.transactionHash) {
        transactions.push({
          id: event.id,
          type: 'signer_added',
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: event.blockTimestamp,
          timestamp: new Date(parseInt(event.blockTimestamp) * 1000),
          details: {
            signerName: event.signerName || 'Family Member',
          },
        });
      }
    });

    // Sort all transactions by block timestamp (most recent first)
    transactions.sort((a, b) => parseInt(b.blockTimestamp) - parseInt(a.blockTimestamp));

    // Return only the requested number of transactions
    const result = transactions.slice(0, limit);
    console.log(`Found ${result.length} latest transactions`);
    return result;

  } catch (error) {
    console.error('Error fetching latest transactions:', error);
    throw error;
  }
}

// Helper function to get a human-readable description of the transaction
export function getTransactionDescription(transaction: LatestTransaction): string {
  switch (transaction.type) {
    case 'created':
      return 'New agreement created for asset';
    case 'signed':
      return 'Family member signed agreement';
    case 'admin_signed':
      return 'Agreement approved by admin';
    case 'completed':
      return 'Agreement completed successfully';
    case 'signer_added':
      return 'Family member added as signer';
    default:
      return 'Unknown transaction type';
  }
}

// Helper function to get the transaction type display name
export function getTransactionTypeDisplayName(type: string): string {
  switch (type) {
    case 'created':
      return 'Agreement Created';
    case 'signed':
      return 'Agreement Signed';
    case 'admin_signed':
      return 'Admin Approved';
    case 'completed':
      return 'Completed';
    case 'signer_added':
      return 'Signer Added';
    default:
      return 'Unknown';
  }
}