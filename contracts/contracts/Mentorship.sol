// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Mentorship
 * @dev Smart contract for Chain Academy V2 mentorship platform
 * Handles escrow, payment distribution, and multi-token support
 */
contract Mentorship is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 10; // 10%
    uint256 public constant MENTOR_PERCENTAGE = 90; // 90%
    uint256 public constant PERCENTAGE_BASE = 100;

    // Supported payment tokens
    mapping(address => bool) public supportedTokens;
    
    // Platform fee recipient
    address public platformFeeRecipient;

    // Mentorship session structure
    struct MentorshipSession {
        address mentor;
        address mentee;
        address paymentToken;
        uint256 amount;
        uint256 startTime;
        uint256 duration;
        SessionStatus status;
    }

    // Session status enum
    enum SessionStatus {
        None,
        Scheduled,
        Completed,
        Cancelled,
        Disputed
    }

    // Session counter for unique IDs
    uint256 public nextSessionId;

    // Mapping from session ID to session details
    mapping(uint256 => MentorshipSession) public sessions;

    // Mapping from mentor address to their session IDs
    mapping(address => uint256[]) public mentorSessions;

    // Mapping from mentee address to their session IDs
    mapping(address => uint256[]) public menteeSessions;

    // Events
    event SessionCreated(
        uint256 indexed sessionId,
        address indexed mentor,
        address indexed mentee,
        address paymentToken,
        uint256 amount,
        uint256 startTime,
        uint256 duration
    );

    event SessionCompleted(
        uint256 indexed sessionId,
        uint256 mentorAmount,
        uint256 platformAmount
    );

    event SessionCancelled(uint256 indexed sessionId);

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event PlatformFeeRecipientUpdated(address indexed newRecipient);

    // Modifiers
    modifier onlyValidToken(address token) {
        require(supportedTokens[token], "Token not supported");
        _;
    }

    modifier onlySessionParticipant(uint256 sessionId) {
        MentorshipSession storage session = sessions[sessionId];
        require(
            msg.sender == session.mentor || msg.sender == session.mentee,
            "Not session participant"
        );
        _;
    }

    /**
     * @dev Constructor
     * @param _platformFeeRecipient Address to receive platform fees
     */
    constructor(address _platformFeeRecipient) Ownable(msg.sender) {
        require(_platformFeeRecipient != address(0), "Invalid fee recipient");
        platformFeeRecipient = _platformFeeRecipient;
    }

    /**
     * @dev Create a new mentorship session with escrow
     * @param mentor Address of the mentor
     * @param paymentToken Address of the payment token (USDT/USDC)
     * @param amount Payment amount
     * @param startTime Session start time
     * @param duration Session duration in seconds
     */
    function createSession(
        address mentor,
        address paymentToken,
        uint256 amount,
        uint256 startTime,
        uint256 duration
    ) external nonReentrant whenNotPaused onlyValidToken(paymentToken) returns (uint256) {
        require(mentor != address(0) && mentor != msg.sender, "Invalid mentor");
        require(amount > 0, "Invalid amount");
        require(startTime > block.timestamp, "Invalid start time");
        require(duration > 0, "Invalid duration");

        // Create session FIRST (checks-effects-interactions pattern)
        uint256 sessionId = nextSessionId++;
        sessions[sessionId] = MentorshipSession({
            mentor: mentor,
            mentee: msg.sender,
            paymentToken: paymentToken,
            amount: amount,
            startTime: startTime,
            duration: duration,
            status: SessionStatus.Scheduled
        });

        // Add to participant mappings
        mentorSessions[mentor].push(sessionId);
        menteeSessions[msg.sender].push(sessionId);

        // Transfer tokens to escrow LAST (after all state changes)
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);

        emit SessionCreated(
            sessionId,
            mentor,
            msg.sender,
            paymentToken,
            amount,
            startTime,
            duration
        );

        return sessionId;
    }

    /**
     * @dev Complete a mentorship session and distribute payments
     * @param sessionId ID of the session to complete
     */
    function completeSession(uint256 sessionId) 
        external 
        nonReentrant 
        onlySessionParticipant(sessionId) 
    {
        MentorshipSession storage session = sessions[sessionId];
        require(session.status == SessionStatus.Scheduled, "Invalid session status");
        require(
            block.timestamp >= session.startTime + session.duration,
            "Session not finished"
        );

        session.status = SessionStatus.Completed;

        // Calculate payment distribution
        uint256 platformAmount = (session.amount * PLATFORM_FEE_PERCENTAGE) / PERCENTAGE_BASE;
        uint256 mentorAmount = session.amount - platformAmount;

        // Transfer payments
        IERC20(session.paymentToken).safeTransfer(session.mentor, mentorAmount);
        IERC20(session.paymentToken).safeTransfer(platformFeeRecipient, platformAmount);

        emit SessionCompleted(sessionId, mentorAmount, platformAmount);
    }

    /**
     * @dev Cancel a mentorship session before it starts
     * @param sessionId ID of the session to cancel
     */
    function cancelSession(uint256 sessionId) 
        external 
        nonReentrant 
        onlySessionParticipant(sessionId) 
    {
        MentorshipSession storage session = sessions[sessionId];
        require(session.status == SessionStatus.Scheduled, "Invalid session status");
        require(block.timestamp < session.startTime, "Session already started");

        session.status = SessionStatus.Cancelled;

        // Refund mentee
        IERC20(session.paymentToken).safeTransfer(session.mentee, session.amount);

        emit SessionCancelled(sessionId);
    }

    /**
     * @dev Add a supported payment token
     * @param token Address of the token to add
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = true;
        emit TokenAdded(token);
    }

    /**
     * @dev Remove a supported payment token
     * @param token Address of the token to remove
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
        emit TokenRemoved(token);
    }

    /**
     * @dev Update platform fee recipient
     * @param newRecipient New recipient address
     */
    function updatePlatformFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        platformFeeRecipient = newRecipient;
        emit PlatformFeeRecipientUpdated(newRecipient);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get mentor's session IDs
     * @param mentor Address of the mentor
     */
    function getMentorSessions(address mentor) external view returns (uint256[] memory) {
        return mentorSessions[mentor];
    }

    /**
     * @dev Get mentee's session IDs
     * @param mentee Address of the mentee
     */
    function getMenteeSessions(address mentee) external view returns (uint256[] memory) {
        return menteeSessions[mentee];
    }

    /**
     * @dev Get session details
     * @param sessionId ID of the session
     */
    function getSession(uint256 sessionId) external view returns (MentorshipSession memory) {
        return sessions[sessionId];
    }
}