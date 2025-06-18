// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Mentorship.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MentorshipFactory
 * @dev Factory contract for deploying Mentorship contracts across multiple chains
 * Provides consistent deployment and management across all supported networks
 */
contract MentorshipFactory is Ownable {
    // Events
    event MentorshipDeployed(
        address indexed mentorshipContract,
        address indexed platformFeeRecipient,
        uint256 timestamp
    );

    // Array of deployed Mentorship contracts
    address[] public deployedContracts;
    
    // Mapping to check if an address is a valid Mentorship contract from this factory
    mapping(address => bool) public isValidContract;

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Deploy a new Mentorship contract
     * @param platformFeeRecipient Address to receive platform fees
     * @return mentorshipAddress Address of the deployed Mentorship contract
     */
    function deployMentorship(address platformFeeRecipient) 
        external 
        onlyOwner 
        returns (address mentorshipAddress) 
    {
        require(platformFeeRecipient != address(0), "Invalid fee recipient");

        // Deploy new Mentorship contract
        Mentorship mentorship = new Mentorship(platformFeeRecipient);
        mentorshipAddress = address(mentorship);

        // Add to tracking
        deployedContracts.push(mentorshipAddress);
        isValidContract[mentorshipAddress] = true;

        emit MentorshipDeployed(mentorshipAddress, platformFeeRecipient, block.timestamp);

        return mentorshipAddress;
    }

    /**
     * @dev Get all deployed Mentorship contracts
     * @return Array of deployed contract addresses
     */
    function getDeployedContracts() external view returns (address[] memory) {
        return deployedContracts;
    }

    /**
     * @dev Get the number of deployed contracts
     * @return Number of deployed contracts
     */
    function getDeployedContractsCount() external view returns (uint256) {
        return deployedContracts.length;
    }

    /**
     * @dev Get the latest deployed contract
     * @return Address of the most recently deployed contract
     */
    function getLatestContract() external view returns (address) {
        require(deployedContracts.length > 0, "No contracts deployed");
        return deployedContracts[deployedContracts.length - 1];
    }

    /**
     * @dev Batch setup for newly deployed Mentorship contract
     * @param mentorshipAddress Address of the Mentorship contract
     * @param supportedTokens Array of token addresses to add as supported
     */
    function setupMentorship(
        address mentorshipAddress,
        address[] calldata supportedTokens
    ) external onlyOwner {
        require(isValidContract[mentorshipAddress], "Invalid contract address");
        
        Mentorship mentorship = Mentorship(mentorshipAddress);
        
        // Add supported tokens
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            mentorship.addSupportedToken(supportedTokens[i]);
        }
    }

    /**
     * @dev Emergency pause for a specific Mentorship contract
     * @param mentorshipAddress Address of the Mentorship contract to pause
     */
    function emergencyPause(address mentorshipAddress) external onlyOwner {
        require(isValidContract[mentorshipAddress], "Invalid contract address");
        Mentorship(mentorshipAddress).pause();
    }

    /**
     * @dev Emergency unpause for a specific Mentorship contract
     * @param mentorshipAddress Address of the Mentorship contract to unpause
     */
    function emergencyUnpause(address mentorshipAddress) external onlyOwner {
        require(isValidContract[mentorshipAddress], "Invalid contract address");
        Mentorship(mentorshipAddress).unpause();
    }
}