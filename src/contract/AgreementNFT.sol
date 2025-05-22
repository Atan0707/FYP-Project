// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
 
/**
 * @title AgreementContract
 * @dev Contract for minting NFTs that represent legally binding asset distribution agreements
 */
contract AgreementContract is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    struct Signer {
        string name;
        string ic; // Identification number
        bool hasSigned;
        uint256 signedAt;
    }

    struct Admin {
        string name;
        bool hasSigned;
        uint256 signedAt;
    }

    struct Agreement {
        uint256 id;
        string agreementId;
        string assetName;
        string assetType;
        uint256 assetValue;
        string distributionType; // waqf, faraid, hibah, will
        string status; // pending, in_progress, pending_admin, completed
        address owner;
        address adminAddress;
        Admin admin;
        mapping(string => uint256) signerIndices; // Maps signer IC to their index in the signers array
        Signer[] signers;
        string notes;
        uint256 createdAt;
        string metadataURI;
        bool isActive;
    }

    mapping(uint256 => Agreement) public agreements;
    mapping(address => uint256[]) public userAgreements;
    mapping(string => uint256) private agreementIdToTokenId;
    mapping(string => uint256[]) private userICAgreements; // New mapping to track agreements by IC

    event AgreementCreated(
        uint256 indexed tokenId,
        string agreementId,
        address indexed owner,
        string assetName
    );
    
    event SignerAdded(
        uint256 indexed tokenId,
        string signerIC,
        string signerName
    );
    
    event AgreementSigned(
        uint256 indexed tokenId,
        string signerIC,
        uint256 timestamp
    );
    
    event AdminSigned(
        uint256 indexed tokenId,
        address indexed admin,
        string adminName,
        uint256 timestamp
    );
    
    event AgreementCompleted(
        uint256 indexed tokenId,
        string status
    );

    constructor() ERC721("WEMSP", "WEMSP") Ownable(msg.sender) {}

    /**
     * @dev Creates a new agreement and mints an NFT to represent it
     */
    function createAgreement(
        string memory agreementId,
        string memory assetName,
        string memory assetType,
        uint256 assetValue,
        string memory distributionType,
        string memory metadataURI
    ) public returns (uint256) {
        require(bytes(agreementId).length > 0, "Agreement ID cannot be empty");
        require(agreementIdToTokenId[agreementId] == 0, "Agreement ID already exists");
        
        uint256 newTokenId = _tokenIds;
        _tokenIds++;    
        
        // Mint the NFT to the creator
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, metadataURI);
        
        // Create admin with empty name - will be set when admin signs
        Admin memory admin = Admin({
            name: "",
            hasSigned: false,
            signedAt: 0
        });
        
        // Create the agreement
        Agreement storage newAgreement = agreements[newTokenId];
        newAgreement.id = newTokenId;
        newAgreement.agreementId = agreementId;
        newAgreement.assetName = assetName;
        newAgreement.assetType = assetType;
        newAgreement.assetValue = assetValue;
        newAgreement.distributionType = distributionType;
        newAgreement.status = "pending";
        newAgreement.owner = msg.sender;
        newAgreement.adminAddress = msg.sender;
        newAgreement.admin = admin;
        newAgreement.notes = "";
        newAgreement.createdAt = block.timestamp;
        newAgreement.metadataURI = metadataURI;
        newAgreement.isActive = true;
        
        // Add to user's agreements
        userAgreements[msg.sender].push(newTokenId);
        
        // Map the agreementId to tokenId
        agreementIdToTokenId[agreementId] = newTokenId;
        
        emit AgreementCreated(newTokenId, agreementId, msg.sender, assetName);
        
        return newTokenId;
    }

    /**
     * @dev Adds a signer to the agreement
     */
    function addSigner(
        uint256 tokenId,
        string memory signerName,
        string memory signerIC
    ) public {
        require(ownerOf(tokenId) == msg.sender, "Agreement does not exist");
        require(msg.sender == agreements[tokenId].owner || msg.sender == agreements[tokenId].adminAddress, 
                "Only owner or admin can add signers");
        require(keccak256(abi.encodePacked(agreements[tokenId].status)) != keccak256(abi.encodePacked("completed")), 
                "Agreement is already completed");
        
        // Create new signer and add to array
        Signer memory newSigner = Signer({
            name: signerName,
            ic: signerIC,
            hasSigned: false,
            signedAt: 0
        });
        
        // Store the signer's index for quick lookup
        agreements[tokenId].signerIndices[signerIC] = agreements[tokenId].signers.length;
        agreements[tokenId].signers.push(newSigner);
        
        // Add agreement to userICAgreements mapping
        userICAgreements[signerIC].push(tokenId);
        
        // If first signer is added, change status to in_progress
        if (agreements[tokenId].signers.length == 1) {
            agreements[tokenId].status = "in_progress";
        }
        
        emit SignerAdded(tokenId, signerIC, signerName);
    }

    /**
     * @dev Allows a signer to sign the agreement
     */
    function signAgreement(uint256 tokenId, string memory signerIC) public {
        require(ownerOf(tokenId) == msg.sender, "Agreement does not exist");
        require(agreements[tokenId].isActive, "Agreement is not active");
        require(keccak256(abi.encodePacked(agreements[tokenId].status)) != keccak256(abi.encodePacked("completed")), 
                "Agreement is already completed");
        
        // Check if the IC corresponds to a registered signer
        if (isICRegistered(tokenId, signerIC)) {
            uint256 signerIndex = agreements[tokenId].signerIndices[signerIC];
            require(!agreements[tokenId].signers[signerIndex].hasSigned, "Already signed");
            
            agreements[tokenId].signers[signerIndex].hasSigned = true;
            agreements[tokenId].signers[signerIndex].signedAt = block.timestamp;
            emit AgreementSigned(tokenId, signerIC, block.timestamp);
            
            // Check if all signers have signed
            checkCompletionStatus(tokenId);
            return;
        }
        
        revert("Not authorized to sign this agreement");
    }
    
    /**
     * @dev Allows admin to sign the agreement
     */
    function adminSignAgreement(uint256 tokenId, string memory adminName) public {
        require(ownerOf(tokenId) == msg.sender, "Agreement does not exist");
        require(agreements[tokenId].isActive, "Agreement is not active");
        require(keccak256(abi.encodePacked(agreements[tokenId].status)) != keccak256(abi.encodePacked("completed")), 
                "Agreement is already completed");
        require(msg.sender == agreements[tokenId].adminAddress, "Only admin can sign with this function");
        require(!agreements[tokenId].admin.hasSigned, "Admin already signed");
        
        agreements[tokenId].admin.name = adminName;
        agreements[tokenId].admin.hasSigned = true;
        agreements[tokenId].admin.signedAt = block.timestamp;
        agreements[tokenId].status = "pending_admin";
        
        emit AdminSigned(tokenId, msg.sender, adminName, block.timestamp);
        
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
        require(ownerOf(tokenId) == msg.sender, "Agreement does not exist");
        require(msg.sender == agreements[tokenId].owner || msg.sender == agreements[tokenId].adminAddress, 
                "Only owner or admin can add notes");
        
        agreements[tokenId].notes = notes;
    }
    
    /**
     * @dev Returns all signers for an agreement
     */
    function getAgreementSigners(uint256 tokenId) public view returns (Signer[] memory) {
        require(ownerOf(tokenId) == msg.sender, "Agreement does not exist");
        return agreements[tokenId].signers;
    }
    
    /**
     * @dev Returns the admin for an agreement
     */
    function getAgreementAdmin(uint256 tokenId) public view returns (Admin memory) {
        require(ownerOf(tokenId) == msg.sender, "Agreement does not exist");
        return agreements[tokenId].admin;
    }
    
    /**
     * @dev Returns agreements associated with a user's IC
     * @param userIC The identification number of the user
     */
    function getUserAgreements(string memory userIC) public view returns (uint256[] memory) {
        require(bytes(userIC).length > 0, "IC cannot be empty");
        return userICAgreements[userIC];
    }
    
    /**
     * @dev Returns full agreement details
     */
    function getAgreementDetails(uint256 tokenId) public view returns (
        uint256 id,
        string memory agreementId,
        string memory assetName,
        string memory assetType,
        uint256 assetValue,
        string memory distributionType,
        string memory status,
        address owner,
        address adminAddress,
        Admin memory admin,
        string memory notes,
        uint256 createdAt,
        string memory metadataURI,
        bool isActive
    ) {
        require(ownerOf(tokenId) == msg.sender, "Agreement does not exist");
        Agreement storage agreement = agreements[tokenId];
        
        return (
            agreement.id,
            agreement.agreementId,
            agreement.assetName,
            agreement.assetType,
            agreement.assetValue,
            agreement.distributionType,
            agreement.status,
            agreement.owner,
            agreement.adminAddress,
            agreement.admin,
            agreement.notes,
            agreement.createdAt,
            agreement.metadataURI,
            agreement.isActive
        );
    }
    
    /**
     * @dev Check if an IC is registered as a signer for an agreement
     */
    function isICRegistered(uint256 tokenId, string memory signerIC) public view returns (bool) {
        require(ownerOf(tokenId) == msg.sender, "Agreement does not exist");
        
        // Check if it's in our mapping and has a valid index
        uint256 index = agreements[tokenId].signerIndices[signerIC];
        if (index > 0 || (agreements[tokenId].signers.length > 0 && index == 0)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * @dev Get signer details by IC
     */
    function getSignerByIC(uint256 tokenId, string memory signerIC) public view returns (
        string memory name,
        bool hasSigned,
        uint256 signedAt
    ) {
        require(ownerOf(tokenId) == msg.sender, "Agreement does not exist");
        require(isICRegistered(tokenId, signerIC), "Signer not found");
        
        uint256 index = agreements[tokenId].signerIndices[signerIC];
        Signer memory signer = agreements[tokenId].signers[index];
        
        return (
            signer.name,
            signer.hasSigned,
            signer.signedAt
        );
    }
    
    /**
     * @dev Get tokenId from agreementId
     */
    function getTokenIdFromAgreementId(string memory agreementId) public view returns (uint256) {
        uint256 tokenId = agreementIdToTokenId[agreementId];
        require(tokenId != 0, "Agreement ID does not exist");
        return tokenId;
    }
    
    /**
     * @dev Overrides supportsInterface function
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 