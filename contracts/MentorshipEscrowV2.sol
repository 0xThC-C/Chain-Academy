// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MentorshipEscrowV2
 * @dev Progressive escrow system for mentorship sessions
 * 
 * Payment Flow:
 * - 20% released when session starts (WebRTC connection)
 * - 60% released when 70% of session duration completed
 * - 20% released after satisfaction survey completion
 * - Automatic release after 7 days if survey not completed
 */
contract MentorshipEscrowV2 is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Session status enum
    enum SessionStatus {
        Created,        // Session booked, payment escrowed
        Started,        // WebRTC connected, 20% released
        MidCompleted,   // 70% duration reached, 60% released  
        Completed,      // Survey done, final 20% released
        Cancelled,      // Session cancelled, refund issued
        TimedOut        // 7 days passed, auto-completed
    }

    // Session structure
    struct Session {
        bytes32 sessionId;
        address student;
        address mentor;
        address paymentToken;    // USDC or USDT
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 sessionDuration; // in minutes
        uint256 startTime;
        uint256 createdAt;
        SessionStatus status;
        bool surveyCompleted;
    }

    // Constants
    uint256 public constant PLATFORM_FEE_PERCENT = 10; // 10%
    uint256 public constant START_RELEASE_PERCENT = 20; // 20%
    uint256 public constant MID_RELEASE_PERCENT = 60;   // 60%
    uint256 public constant FINAL_RELEASE_PERCENT = 20; // 20%
    uint256 public constant AUTO_RELEASE_DELAY = 7 days;
    uint256 public constant SESSION_COMPLETION_THRESHOLD = 70; // 70%

    // State variables
    mapping(bytes32 => Session) public sessions;
    mapping(address => bool) public supportedTokens;
    address public platformWallet;
    
    // Replay protection
    mapping(address => uint256) public userNonces;
    mapping(bytes32 => bool) public usedSessionIds;
    
    // Events
    event SessionCreated(
        bytes32 indexed sessionId,
        address indexed student,
        address indexed mentor,
        uint256 amount,
        address token
    );
    
    event SessionStarted(
        bytes32 indexed sessionId,
        uint256 releasedAmount,
        uint256 timestamp
    );
    
    event SessionMidCompleted(
        bytes32 indexed sessionId,
        uint256 releasedAmount,
        uint256 timestamp
    );
    
    event SessionCompleted(
        bytes32 indexed sessionId,
        uint256 finalAmount,
        uint256 timestamp
    );
    
    event SessionCancelled(
        bytes32 indexed sessionId,
        uint256 refundAmount,
        uint256 timestamp
    );
    
    event SurveyCompleted(
        bytes32 indexed sessionId,
        uint256 rating,
        uint256 timestamp
    );

    event EmergencyRelease(
        bytes32 indexed sessionId,
        uint256 amount,
        string reason
    );

    constructor(address _platformWallet) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }

    /**
     * @dev Add supported payment token (USDC/USDT)
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = true;
    }

    /**
     * @dev Remove supported payment token
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
    }
    
    /**
     * @dev Get current nonce for user (for frontend to use)
     */
    function getUserNonce(address user) external view returns (uint256) {
        return userNonces[user];
    }

    /**
     * @dev Create new mentorship session with escrowed payment
     * @param nonce User nonce for replay protection
     */
    function createSession(
        bytes32 sessionId,
        address mentor,
        address paymentToken,
        uint256 amount,
        uint256 durationMinutes,
        uint256 nonce
    ) external nonReentrant whenNotPaused {
        require(mentor != address(0), "Invalid mentor address");
        require(mentor != msg.sender, "Cannot mentor yourself");
        require(supportedTokens[paymentToken], "Unsupported payment token");
        require(amount > 0, "Amount must be greater than 0");
        require(durationMinutes > 0, "Duration must be greater than 0");
        require(sessions[sessionId].student == address(0), "Session already exists");
        
        // Replay protection
        require(nonce == userNonces[msg.sender], "Invalid nonce");
        require(!usedSessionIds[sessionId], "Session ID already used");
        
        // Update nonce and mark session ID as used
        userNonces[msg.sender]++;
        usedSessionIds[sessionId] = true;

        // Transfer payment to escrow
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);

        // Create session
        sessions[sessionId] = Session({
            sessionId: sessionId,
            student: msg.sender,
            mentor: mentor,
            paymentToken: paymentToken,
            totalAmount: amount,
            releasedAmount: 0,
            sessionDuration: durationMinutes,
            startTime: 0,
            createdAt: block.timestamp,
            status: SessionStatus.Created,
            surveyCompleted: false
        });

        emit SessionCreated(sessionId, msg.sender, mentor, amount, paymentToken);
    }

    /**
     * @dev Start session - releases 20% to mentor
     * Called when WebRTC connection is established
     */
    function startSession(bytes32 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Created, "Session already started or completed");
        require(
            msg.sender == session.student || msg.sender == session.mentor,
            "Only session participants can start"
        );

        session.status = SessionStatus.Started;
        session.startTime = block.timestamp;

        // Release 20% to mentor
        uint256 releaseAmount = (session.totalAmount * START_RELEASE_PERCENT) / 100;
        session.releasedAmount += releaseAmount;
        
        IERC20(session.paymentToken).safeTransfer(session.mentor, releaseAmount);

        emit SessionStarted(sessionId, releaseAmount, block.timestamp);
    }

    /**
     * @dev Mark session 70% complete - releases 60% to mentor
     * Called when 70% of session duration has elapsed
     */
    function markSessionMidCompleted(bytes32 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Started, "Session not started");
        require(session.startTime > 0, "Session start time not set");
        
        // Verify 70% of duration has passed
        uint256 elapsedMinutes = (block.timestamp - session.startTime) / 60;
        uint256 requiredMinutes = (session.sessionDuration * SESSION_COMPLETION_THRESHOLD) / 100;
        require(elapsedMinutes >= requiredMinutes, "Session not 70% complete yet");

        session.status = SessionStatus.MidCompleted;

        // Release 60% to mentor
        uint256 releaseAmount = (session.totalAmount * MID_RELEASE_PERCENT) / 100;
        session.releasedAmount += releaseAmount;
        
        IERC20(session.paymentToken).safeTransfer(session.mentor, releaseAmount);

        emit SessionMidCompleted(sessionId, releaseAmount, block.timestamp);
    }

    /**
     * @dev Complete session with satisfaction survey - releases final 20%
     */
    function completeSessionWithSurvey(
        bytes32 sessionId,
        uint256 rating,
        string calldata feedback
    ) external nonReentrant {
        Session storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(msg.sender == session.student, "Only student can complete survey");
        require(
            session.status == SessionStatus.MidCompleted || session.status == SessionStatus.Started,
            "Session not ready for completion"
        );
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        require(!session.surveyCompleted, "Survey already completed");

        session.status = SessionStatus.Completed;
        session.surveyCompleted = true;

        // Calculate final release amount
        uint256 remainingAmount = session.totalAmount - session.releasedAmount;
        uint256 platformFee = (remainingAmount * PLATFORM_FEE_PERCENT) / 100;
        uint256 mentorAmount = remainingAmount - platformFee;

        session.releasedAmount = session.totalAmount;

        // Transfer final amounts
        if (mentorAmount > 0) {
            IERC20(session.paymentToken).safeTransfer(session.mentor, mentorAmount);
        }
        if (platformFee > 0) {
            IERC20(session.paymentToken).safeTransfer(platformWallet, platformFee);
        }

        emit SurveyCompleted(sessionId, rating, block.timestamp);
        emit SessionCompleted(sessionId, mentorAmount, block.timestamp);
    }

    /**
     * @dev Auto-complete session after 7 days timeout
     */
    function autoCompleteSession(bytes32 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(
            session.status == SessionStatus.MidCompleted || session.status == SessionStatus.Started,
            "Session not eligible for auto-completion"
        );
        require(
            block.timestamp >= session.createdAt + AUTO_RELEASE_DELAY,
            "Auto-release delay not reached"
        );

        session.status = SessionStatus.TimedOut;

        // Calculate final release amount
        uint256 remainingAmount = session.totalAmount - session.releasedAmount;
        uint256 platformFee = (remainingAmount * PLATFORM_FEE_PERCENT) / 100;
        uint256 mentorAmount = remainingAmount - platformFee;

        session.releasedAmount = session.totalAmount;

        // Transfer final amounts
        if (mentorAmount > 0) {
            IERC20(session.paymentToken).safeTransfer(session.mentor, mentorAmount);
        }
        if (platformFee > 0) {
            IERC20(session.paymentToken).safeTransfer(platformWallet, platformFee);
        }

        emit SessionCompleted(sessionId, mentorAmount, block.timestamp);
    }

    /**
     * @dev Cancel session before it starts - full refund to student
     */
    function cancelSession(bytes32 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Created, "Session already started");
        require(
            msg.sender == session.student || msg.sender == session.mentor,
            "Only session participants can cancel"
        );

        session.status = SessionStatus.Cancelled;

        // Full refund to student
        uint256 refundAmount = session.totalAmount - session.releasedAmount;
        session.releasedAmount = session.totalAmount;

        IERC20(session.paymentToken).safeTransfer(session.student, refundAmount);

        emit SessionCancelled(sessionId, refundAmount, block.timestamp);
    }

    /**
     * @dev Emergency release function (owner only)
     */
    function emergencyRelease(
        bytes32 sessionId,
        address recipient,
        uint256 amount,
        string calldata reason
    ) external onlyOwner nonReentrant {
        Session storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(recipient != address(0), "Invalid recipient");
        require(amount <= session.totalAmount - session.releasedAmount, "Amount exceeds available");

        session.releasedAmount += amount;
        IERC20(session.paymentToken).safeTransfer(recipient, amount);

        emit EmergencyRelease(sessionId, amount, reason);
    }

    /**
     * @dev Get session details
     */
    function getSession(bytes32 sessionId) external view returns (Session memory) {
        return sessions[sessionId];
    }

    /**
     * @dev Check if session can be started
     */
    function canStartSession(bytes32 sessionId) external view returns (bool) {
        Session memory session = sessions[sessionId];
        return session.student != address(0) && session.status == SessionStatus.Created;
    }

    /**
     * @dev Check if session can be marked as mid-completed
     */
    function canMarkMidCompleted(bytes32 sessionId) external view returns (bool) {
        Session memory session = sessions[sessionId];
        if (session.status != SessionStatus.Started || session.startTime == 0) {
            return false;
        }
        
        uint256 elapsedMinutes = (block.timestamp - session.startTime) / 60;
        uint256 requiredMinutes = (session.sessionDuration * SESSION_COMPLETION_THRESHOLD) / 100;
        return elapsedMinutes >= requiredMinutes;
    }

    /**
     * @dev Check if session can be auto-completed
     */
    function canAutoComplete(bytes32 sessionId) external view returns (bool) {
        Session memory session = sessions[sessionId];
        return (session.status == SessionStatus.MidCompleted || session.status == SessionStatus.Started) &&
               block.timestamp >= session.createdAt + AUTO_RELEASE_DELAY;
    }

    /**
     * @dev Update platform wallet (owner only)
     */
    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet address");
        platformWallet = newWallet;
    }

    /**
     * @dev Pause contract (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}