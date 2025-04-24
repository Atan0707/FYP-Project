// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AgreementNFT
 * @dev Contract for minting NFTs that represent legally binding asset distribution agreements
 */
contract AgreementNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct Signer {
        address walletAddress;
        string name;
        bool hasSigned;
        uint256 signedAt;
    }

    struct Agreement {
        uint256 id;
        string assetName;
        string assetType;
        uint256 assetValue;
        string distributionType; // waqf, faraid, hibah, will
        string status; // pending, in_progress, pending_admin, completed, rejected
        address owner;
        Signer admin;
        Signer[] signers;
        string notes;
        uint256 createdAt;
        string metadataURI;
        bool isActive;
    }

    mapping(uint256 => Agreement) public agreements;
    mapping(address => uint256[]) public userAgreements;

    event AgreementCreated(
        uint256 indexed tokenId,
        address indexed owner,
        string assetName
    );
    
    event SignerAdded(
        uint256 indexed tokenId,
        address indexed signerAddress,
        string signerName
    );
    
    event AgreementSigned(
        uint256 indexed tokenId,
        address indexed signer,
        uint256 timestamp
    );
    
    event AdminSigned(
        uint256 indexed tokenId,
        address indexed admin,
        uint256 timestamp
    );
    
    event AgreementCompleted(
        uint256 indexed tokenId,
        string status
    );

    constructor() ERC721("Asset Distribution Agreement", "ADA") Ownable(msg.sender) {}

    /**
     * @dev Creates a new agreement and mints an NFT to represent it
     */
    function createAgreement(
        string memory assetName,
        string memory assetType,
        uint256 assetValue,
        string memory distributionType,
        string memory metadataURI,
        string memory adminName
    ) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        // Mint the NFT to the creator
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, metadataURI);
        
        // Create admin signer
        Signer memory admin = Signer({
            walletAddress: msg.sender,
            name: adminName,
            hasSigned: false,
            signedAt: 0
        });
        
        // Create the agreement
        agreements[newTokenId] = Agreement({
            id: newTokenId,
            assetName: assetName,
            assetType: assetType,
            assetValue: assetValue,
            distributionType: distributionType,
            status: "pending",
            owner: msg.sender,
            admin: admin,
            signers: new Signer[](0),
            notes: "",
            createdAt: block.timestamp,
            metadataURI: metadataURI,
            isActive: true
        });
        
        // Add to user's agreements
        userAgreements[msg.sender].push(newTokenId);
        
        emit AgreementCreated(newTokenId, msg.sender, assetName);
        
        return newTokenId;
    }

    /**
     * @dev Adds a signer to the agreement
     */
    function addSigner(
        uint256 tokenId,
        address signerAddress,
        string memory signerName
    ) public {
        require(_exists(tokenId), "Agreement does not exist");
        require(msg.sender == agreements[tokenId].owner || msg.sender == agreements[tokenId].admin.walletAddress, 
                "Only owner or admin can add signers");
        require(agreements[tokenId].status != "completed" && agreements[tokenId].status != "rejected", 
                "Agreement is already finalized");
        
        Signer memory newSigner = Signer({
            walletAddress: signerAddress,
            name: signerName,
            hasSigned: false,
            signedAt: 0
        });
        
        agreements[tokenId].signers.push(newSigner);
        
        // If first signer is added, change status to in_progress
        if (agreements[tokenId].signers.length == 1) {
            agreements[tokenId].status = "in_progress";
        }
        
        emit SignerAdded(tokenId, signerAddress, signerName);
    }

    /**
     * @dev Allows a signer to sign the agreement
     */
    function signAgreement(uint256 tokenId) public {
        require(_exists(tokenId), "Agreement does not exist");
        require(agreements[tokenId].isActive, "Agreement is not active");
        require(agreements[tokenId].status != "completed" && agreements[tokenId].status != "rejected", 
                "Agreement is already finalized");
        
        // Check if sender is a signer
        bool isValidSigner = false;
        for (uint i = 0; i < agreements[tokenId].signers.length; i++) {
            if (agreements[tokenId].signers[i].walletAddress == msg.sender) {
                require(!agreements[tokenId].signers[i].hasSigned, "Already signed");
                agreements[tokenId].signers[i].hasSigned = true;
                agreements[tokenId].signers[i].signedAt = block.timestamp;
                isValidSigner = true;
                emit AgreementSigned(tokenId, msg.sender, block.timestamp);
                break;
            }
        }
        
        // Check if sender is the admin
        if (!isValidSigner && agreements[tokenId].admin.walletAddress == msg.sender) {
            require(!agreements[tokenId].admin.hasSigned, "Admin already signed");
            agreements[tokenId].admin.hasSigned = true;
            agreements[tokenId].admin.signedAt = block.timestamp;
            agreements[tokenId].status = "pending_admin";
            emit AdminSigned(tokenId, msg.sender, block.timestamp);
            
            // Check if all signers have signed
            checkCompletionStatus(tokenId);
            return;
        }
        
        require(isValidSigner, "Not authorized to sign this agreement");
        
        // Check if all signers have signed
        checkCompletionStatus(tokenId);
    }
    
    /**
     * @dev Checks if the agreement is complete (all signers and admin have signed)
     */
    function checkCompletionStatus(uint256 tokenId) internal {
        bool allSigned = true;
        
        // Check all signers
        for (uint i = 0; i < agreements[tokenId].signers.length; i++) {
            if (!agreements[tokenId].signers[i].hasSigned) {
                allSigned = false;
                break;
            }
        }
        
        // Check admin
        if (!agreements[tokenId].admin.hasSigned) {
            allSigned = false;
        }
        
        // If everyone has signed, mark as completed
        if (allSigned) {
            agreements[tokenId].status = "completed";
            emit AgreementCompleted(tokenId, "completed");
        }
    }
    
    /**
     * @dev Adds notes to an agreement
     */
    function addNotes(uint256 tokenId, string memory notes) public {
        require(_exists(tokenId), "Agreement does not exist");
        require(msg.sender == agreements[tokenId].owner || msg.sender == agreements[tokenId].admin.walletAddress, 
                "Only owner or admin can add notes");
        
        agreements[tokenId].notes = notes;
    }
    
    /**
     * @dev Rejects an agreement
     */
    function rejectAgreement(uint256 tokenId) public {
        require(_exists(tokenId), "Agreement does not exist");
        require(msg.sender == agreements[tokenId].owner || msg.sender == agreements[tokenId].admin.walletAddress, 
                "Only owner or admin can reject agreement");
        require(agreements[tokenId].status != "completed", "Agreement already completed");
        
        agreements[tokenId].status = "rejected";
        agreements[tokenId].isActive = false;
        
        emit AgreementCompleted(tokenId, "rejected");
    }
    
    /**
     * @dev Returns all signers for an agreement
     */
    function getAgreementSigners(uint256 tokenId) public view returns (Signer[] memory) {
        require(_exists(tokenId), "Agreement does not exist");
        return agreements[tokenId].signers;
    }
    
    /**
     * @dev Returns the admin for an agreement
     */
    function getAgreementAdmin(uint256 tokenId) public view returns (Signer memory) {
        require(_exists(tokenId), "Agreement does not exist");
        return agreements[tokenId].admin;
    }
    
    /**
     * @dev Returns agreements owned by a user
     */
    function getUserAgreements(address user) public view returns (uint256[] memory) {
        return userAgreements[user];
    }
    
    /**
     * @dev Returns full agreement details
     */
    function getAgreementDetails(uint256 tokenId) public view returns (Agreement memory) {
        require(_exists(tokenId), "Agreement does not exist");
        return agreements[tokenId];
    }
    
    /**
     * @dev Overrides supportsInterface function
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 