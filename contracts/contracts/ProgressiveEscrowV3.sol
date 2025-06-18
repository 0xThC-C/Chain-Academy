// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ProgressiveEscrowV3
 * @dev Revolutionary progressive payment system for mentorship sessions
 * 
 * Payment Flow:
 * - Continuous release proportional to time elapsed (e.g., $100/hour = $5 every 3 minutes)
 * - Uses blockchain timestamp (block.timestamp) as source of truth
 * - Heartbeat system ensures session is active
 * - Auto-pause payment if WebRTC connection drops
 * - Grace period of 2 minutes for reconnection before pausing
 */
contract ProgressiveEscrowV3 is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Session status enum
    enum SessionStatus {
        Created,        // Session booked, payment escrowed
        Active,         // Session started, progressive payments enabled
        Paused,         // Session paused (connection lost)
        Completed,      // Session completed, final payment released
        Cancelled       // Session cancelled, refund issued
    }

    // Progressive session structure
    struct ProgressiveSession {
        bytes32 sessionId;
        address student;
        address mentor;
        address paymentToken;    // USDC or USDT
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 sessionDuration; // in minutes
        uint256 startTime;
        uint256 lastHeartbeat;
        uint256 pausedTime;      // Total time paused (cumulative)
        uint256 createdAt;
        SessionStatus status;
        bool isActive;
        bool isPaused;
        bool surveyCompleted;
    }

    // Constants
    uint256 public constant PLATFORM_FEE_PERCENT = 10; // 10%
    uint256 public constant HEARTBEAT_INTERVAL = 30; // 30 seconds
    uint256 public constant GRACE_PERIOD = 120; // 2 minutes
    uint256 public constant PROGRESSIVE_RELEASE_INTERVAL = 180; // 3 minutes
    uint256 public constant AUTO_RELEASE_DELAY = 7 days;

    // State variables
    mapping(bytes32 => ProgressiveSession) public sessions;
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
        uint256 timestamp
    );
    
    event ProgressivePaymentReleased(
        bytes32 indexed sessionId,
        uint256 releasedAmount,
        uint256 totalReleased,
        uint256 timestamp
    );
    
    event SessionPaused(
        bytes32 indexed sessionId,
        uint256 timestamp,
        string reason
    );
    
    event SessionResumed(
        bytes32 indexed sessionId,
        uint256 timestamp
    );
    
    event SessionCompleted(
        bytes32 indexed sessionId,
        uint256 finalAmount,
        uint256 platformFee,
        uint256 timestamp
    );
    
    event SessionCancelled(
        bytes32 indexed sessionId,
        uint256 refundAmount,
        uint256 timestamp
    );
    
    event HeartbeatReceived(
        bytes32 indexed sessionId,
        uint256 timestamp
    );

    event EmergencyRelease(
        bytes32 indexed sessionId,
        uint256 amount,
        string reason
    );

    constructor(address _platformWallet) Ownable(msg.sender) {
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
     * @dev Create new progressive mentorship session with escrowed payment
     * @param nonce User nonce for replay protection
     */
    function createProgressiveSession(
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

        // Create progressive session
        sessions[sessionId] = ProgressiveSession({
            sessionId: sessionId,
            student: msg.sender,
            mentor: mentor,
            paymentToken: paymentToken,
            totalAmount: amount,
            releasedAmount: 0,
            sessionDuration: durationMinutes,
            startTime: 0,
            lastHeartbeat: 0,
            pausedTime: 0,
            createdAt: block.timestamp,
            status: SessionStatus.Created,
            isActive: false,
            isPaused: false,
            surveyCompleted: false
        });

        emit SessionCreated(sessionId, msg.sender, mentor, amount, paymentToken);
    }

    /**
     * @dev Start progressive session
     * Called when WebRTC connection is established
     */
    function startProgressiveSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Created, "Session already started or completed");
        require(
            msg.sender == session.student || msg.sender == session.mentor,
            "Only session participants can start"
        );

        session.status = SessionStatus.Active;
        session.startTime = block.timestamp;
        session.lastHeartbeat = block.timestamp;
        session.isActive = true;
        session.isPaused = false;

        emit SessionStarted(sessionId, block.timestamp);
    }

    /**
     * @dev Release progressive payment based on time elapsed
     * Called every 3 minutes during active session
     */
    function releaseProgressivePayment(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Active, "Session not active");
        require(session.isActive && !session.isPaused, "Session not running");
        require(session.startTime > 0, "Session start time not set");
        
        // Verify caller is participant or authorized
        require(
            msg.sender == session.student || msg.sender == session.mentor,
            "Only session participants can release payment"
        );

        // Check if enough time has passed for next release
        uint256 effectiveElapsed = getEffectiveElapsedTime(sessionId);
        uint256 maxReleaseAmount = calculateMaxRelease(session.totalAmount, effectiveElapsed, session.sessionDuration);
        
        require(maxReleaseAmount > session.releasedAmount, "No payment available for release");

        // Calculate amount to release (progressive based on time)
        uint256 releaseAmount = maxReleaseAmount - session.releasedAmount;
        
        // Ensure we don't exceed 90% (10% reserved for platform fee after completion)
        uint256 maxReleasableBeforeCompletion = (session.totalAmount * 90) / 100;
        if (session.releasedAmount + releaseAmount > maxReleasableBeforeCompletion) {
            releaseAmount = maxReleasableBeforeCompletion - session.releasedAmount;
        }

        require(releaseAmount > 0, "No payment to release");

        session.releasedAmount += releaseAmount;
        IERC20(session.paymentToken).safeTransfer(session.mentor, releaseAmount);

        emit ProgressivePaymentReleased(sessionId, releaseAmount, session.releasedAmount, block.timestamp);
    }

    /**
     * @dev Update heartbeat to keep session active
     * Called every 30 seconds by frontend
     */
    function updateHeartbeat(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Active, "Session not active");
        require(
            msg.sender == session.student || msg.sender == session.mentor,
            "Only session participants can update heartbeat"
        );

        session.lastHeartbeat = block.timestamp;
        
        // Resume session if it was paused due to missed heartbeat
        if (session.isPaused) {
            resumeSession(sessionId);
        }

        emit HeartbeatReceived(sessionId, block.timestamp);
    }

    /**
     * @dev Pause session (internal or external call)
     */
    function pauseSession(bytes32 sessionId) public nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Active, "Session not active");
        require(!session.isPaused, "Session already paused");
        
        // Allow participants or automatic pause due to missed heartbeat
        bool isParticipant = msg.sender == session.student || msg.sender == session.mentor;
        bool isHeartbeatTimeout = block.timestamp > session.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD;
        
        require(isParticipant || isHeartbeatTimeout, "Unauthorized pause");

        session.isPaused = true;
        session.status = SessionStatus.Paused;
        
        // For manual pause, set lastHeartbeat to current time to track pause start
        if (isParticipant && !isHeartbeatTimeout) {
            session.lastHeartbeat = block.timestamp;
        }
        
        string memory reason = isHeartbeatTimeout ? "Heartbeat timeout" : "Manual pause";
        emit SessionPaused(sessionId, block.timestamp, reason);
    }

    /**
     * @dev Resume session
     */
    function resumeSession(bytes32 sessionId) public nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Paused, "Session not paused");
        require(
            msg.sender == session.student || msg.sender == session.mentor,
            "Only session participants can resume"
        );

        // Calculate paused duration and add to cumulative paused time
        uint256 pauseDuration = block.timestamp - session.lastHeartbeat;
        session.pausedTime += pauseDuration;
        
        session.isPaused = false;
        session.status = SessionStatus.Active;
        session.lastHeartbeat = block.timestamp;

        emit SessionResumed(sessionId, block.timestamp);
    }

    /**
     * @dev Complete session with final payment and platform fee
     */
    function completeSession(
        bytes32 sessionId,
        uint256 rating,
        string calldata feedback
    ) external nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(msg.sender == session.student, "Only student can complete session");
        require(
            session.status == SessionStatus.Active || session.status == SessionStatus.Paused,
            "Session not ready for completion"
        );
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");

        session.status = SessionStatus.Completed;
        session.surveyCompleted = true;
        session.isActive = false;

        // Calculate final payment
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

        emit SessionCompleted(sessionId, mentorAmount, platformFee, block.timestamp);
    }

    /**
     * @dev Auto-complete session after 7 days timeout
     */
    function autoCompleteSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(
            session.status == SessionStatus.Active || session.status == SessionStatus.Paused,
            "Session not eligible for auto-completion"
        );
        require(
            block.timestamp >= session.createdAt + AUTO_RELEASE_DELAY,
            "Auto-release delay not reached"
        );

        session.status = SessionStatus.Completed;
        session.isActive = false;

        // Calculate final payment
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

        emit SessionCompleted(sessionId, mentorAmount, platformFee, block.timestamp);
    }

    /**
     * @dev Cancel session before it starts - full refund to student
     */
    function cancelSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
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
     * @dev Calculate maximum release amount based on time elapsed
     */
    function calculateMaxRelease(uint256 totalAmount, uint256 elapsedMinutes, uint256 durationMinutes) public pure returns (uint256) {
        if (elapsedMinutes == 0 || durationMinutes == 0) return 0;
        
        // Progressive release: amount proportional to time elapsed
        // Reserve 10% for platform fee (release 90% progressively)
        uint256 releasableAmount = (totalAmount * 90) / 100;
        uint256 maxRelease = (releasableAmount * elapsedMinutes) / durationMinutes;
        
        // Cap at 90% of total
        if (maxRelease > releasableAmount) {
            maxRelease = releasableAmount;
        }
        
        return maxRelease;
    }

    /**
     * @dev Get effective elapsed time (excluding paused periods)
     */
    function getEffectiveElapsedTime(bytes32 sessionId) public view returns (uint256) {
        ProgressiveSession memory session = sessions[sessionId];
        require(session.startTime > 0, "Session not started");
        
        uint256 totalElapsed = block.timestamp - session.startTime;
        uint256 currentPausedTime = session.pausedTime;
        
        // If currently paused, add current pause duration
        if (session.isPaused && session.lastHeartbeat > 0) {
            currentPausedTime += block.timestamp - session.lastHeartbeat;
        }
        
        // Effective time is total elapsed minus all paused periods
        if (totalElapsed <= currentPausedTime) return 0;
        
        uint256 effectiveMinutes = (totalElapsed - currentPausedTime) / 60;
        return effectiveMinutes;
    }

    /**
     * @dev Check if session needs heartbeat (for auto-pause)
     */
    function needsHeartbeat(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession memory session = sessions[sessionId];
        if (session.status != SessionStatus.Active || session.lastHeartbeat == 0) {
            return false;
        }
        
        return block.timestamp > session.lastHeartbeat + HEARTBEAT_INTERVAL;
    }

    /**
     * @dev Check if session should be auto-paused
     */
    function shouldAutoPause(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession memory session = sessions[sessionId];
        if (session.status != SessionStatus.Active || session.isPaused || session.lastHeartbeat == 0) {
            return false;
        }
        
        return block.timestamp > session.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD;
    }

    /**
     * @dev Get available payment amount for release
     */
    function getAvailablePayment(bytes32 sessionId) external view returns (uint256) {
        ProgressiveSession memory session = sessions[sessionId];
        if (session.status != SessionStatus.Active || session.isPaused || session.startTime == 0) {
            return 0;
        }
        
        uint256 effectiveElapsed = getEffectiveElapsedTime(sessionId);
        uint256 maxRelease = calculateMaxRelease(session.totalAmount, effectiveElapsed, session.sessionDuration);
        
        if (maxRelease <= session.releasedAmount) return 0;
        
        return maxRelease - session.releasedAmount;
    }

    /**
     * @dev Get session details
     */
    function getSession(bytes32 sessionId) external view returns (ProgressiveSession memory) {
        return sessions[sessionId];
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
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(recipient != address(0), "Invalid recipient");
        require(amount <= session.totalAmount - session.releasedAmount, "Amount exceeds available");

        session.releasedAmount += amount;
        IERC20(session.paymentToken).safeTransfer(recipient, amount);

        emit EmergencyRelease(sessionId, amount, reason);
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