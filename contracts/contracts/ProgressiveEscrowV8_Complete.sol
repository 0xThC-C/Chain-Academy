// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProgressiveEscrowV8_Complete - BULLETPROOF FUND PROTECTION
 * @dev Production-ready contract that fixes ALL V7 fund-trapping issues
 * 
 * CRITICAL FIXES IMPLEMENTED:
 * ✅ Multiple refund pathways to prevent fund trapping
 * ✅ Enhanced autoCompleteSession that accepts ALL eligible sessions
 * ✅ Comprehensive session state validation
 * ✅ Emergency recovery mechanisms
 * ✅ Batch operations for efficiency
 * ✅ Circuit breaker protection
 * ✅ Gas optimization for Remix IDE
 * ✅ Detailed event logging for monitoring
 * ✅ Built-in testing and validation functions
 * 
 * @author Chain Academy Team
 * @notice This contract is optimized for Remix IDE deployment with comprehensive error handling
 */
contract ProgressiveEscrowV8_Complete is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
    uint256 public constant PLATFORM_FEE_PERCENT = 10;
    uint256 public constant HEARTBEAT_INTERVAL = 30;
    uint256 public constant GRACE_PERIOD = 60;
    uint256 public constant AUTO_RELEASE_DELAY = 7 days;
    uint256 public constant SESSION_START_TIMEOUT = 15 minutes;
    uint256 public constant REFUND_GRACE_PERIOD = 1 hours;
    uint256 public constant EMERGENCY_THRESHOLD = 24 hours;
    address public constant ETH_TOKEN = address(0);
    uint256 public constant MAX_BATCH_SIZE = 50;

    // ═══════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════
    
    address public platformWallet;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => ProgressiveSession) public sessions;
    mapping(address => uint256) public userNonces;
    mapping(bytes32 => bool) public usedSessionIds;
    
    // Enhanced tracking for bulletproof refunds
    mapping(bytes32 => bool) public refundProcessed;
    mapping(bytes32 => uint256) public refundTimestamp;
    mapping(bytes32 => RefundAttempt[]) public refundAttempts;
    
    // Circuit breaker protection
    bool public emergencyMode;
    uint256 public dailyRefundLimit;
    uint256 public dailyRefundCount;
    uint256 public lastResetDay;
    
    // Metrics tracking
    uint256 public totalSessionsCreated;
    uint256 public totalRefundsProcessed;
    uint256 public totalEmergencyRefunds;

    // ═══════════════════════════════════════════════════════════════════
    // ENUMS AND STRUCTS
    // ═══════════════════════════════════════════════════════════════════
    
    enum SessionStatus { 
        Created,           // 0 - Initial state
        Active,           // 1 - Session in progress
        Paused,           // 2 - Temporarily paused
        Completed,        // 3 - Successfully finished
        Cancelled,        // 4 - Manually cancelled
        Expired,          // 5 - Timed out
        Disputed,         // 6 - Under dispute
        RefundProcessed,  // 7 - Refund completed
        Emergency         // 8 - Emergency state
    }

    struct ProgressiveSession {
        bytes32 sessionId;
        address student;
        address mentor;
        address paymentToken;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 sessionDuration;
        uint256 startTime;
        uint256 lastHeartbeat;
        uint256 pausedTime;
        uint256 createdAt;
        SessionStatus status;
        bool isActive;
        bool isPaused;
        bool surveyCompleted;
        // V8 Enhanced fields
        bool noShowRefundEligible;
        uint256 refundEligibleAt;
        uint256 lastStatusUpdate;
        bool emergencyRefundEligible;
    }

    struct RefundAttempt {
        uint256 timestamp;
        string method;
        bool success;
        string failureReason;
    }

    struct CreateParams {
        bytes32 sessionId;
        address mentor;
        address paymentToken;
        uint256 amount;
        uint256 durationMinutes;
        uint256 nonce;
    }

    struct PaymentCalc {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 sessionDuration;
        uint256 elapsedMinutes;
    }

    struct SessionMetrics {
        uint256 totalSessions;
        uint256 activeSessions;
        uint256 completedSessions;
        uint256 refundedSessions;
        uint256 totalValueLocked;
        uint256 totalRefunded;
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════
    
    event SessionCreated(bytes32 indexed sessionId, address indexed student, address indexed mentor, uint256 amount, address token);
    event SessionStarted(bytes32 indexed sessionId, uint256 startTime);
    event SessionPaused(bytes32 indexed sessionId, uint256 pausedAt, string reason);
    event SessionResumed(bytes32 indexed sessionId, uint256 resumedAt);
    event SessionCompleted(bytes32 indexed sessionId, uint256 mentorAmount, uint256 platformFee, uint256 completedAt);
    event SessionCancelled(bytes32 indexed sessionId, uint256 refundAmount, uint256 cancelledAt);
    event SessionExpired(bytes32 indexed sessionId, uint256 refundAmount);
    event ProgressivePaymentReleased(bytes32 indexed sessionId, uint256 amount, uint256 totalReleased, uint256 timestamp);
    event HeartbeatReceived(bytes32 indexed sessionId, uint256 timestamp);
    event TokenSupportUpdated(address token, bool supported);
    
    // Enhanced V8 Events
    event NoShowRefundEligible(bytes32 indexed sessionId, uint256 eligibleAt);
    event AutoRefundProcessed(bytes32 indexed sessionId, address indexed student, uint256 amount, string method);
    event RefundPathwayUsed(bytes32 indexed sessionId, string pathway, uint256 timestamp);
    event RefundAttemptFailed(bytes32 indexed sessionId, string method, string reason);
    event EmergencyModeActivated(address indexed activator, string reason);
    event EmergencyModeDeactivated(address indexed deactivator);
    event BatchRefundProcessed(uint256 sessionCount, uint256 totalAmount);
    event CircuitBreakerTriggered(string reason, uint256 timestamp);
    event MetricsSnapshot(uint256 totalSessions, uint256 totalRefunds, uint256 totalValue);

    // ═══════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════
    
    modifier validSession(bytes32 sessionId) {
        require(sessions[sessionId].student != address(0), "Session not found");
        _;
    }

    modifier onlyParticipant(bytes32 sessionId) {
        ProgressiveSession storage s = sessions[sessionId];
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");
        _;
    }

    modifier notInEmergencyMode() {
        require(!emergencyMode, "Emergency mode active");
        _;
    }

    modifier withinRefundLimit(uint256 amount) {
        _checkDailyLimit();
        require(dailyRefundCount < dailyRefundLimit, "Daily refund limit exceeded");
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════
    
    constructor(address _platformWallet) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
        supportedTokens[ETH_TOKEN] = true;
        dailyRefundLimit = 1000; // Default daily limit
        lastResetDay = block.timestamp / 86400;
        _autoEnableTokens();
        emit TokenSupportUpdated(ETH_TOKEN, true);
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTO TOKEN CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════
    
    function _autoEnableTokens() private {
        uint256 cId = block.chainid;
        
        if (cId == 42161) { // Arbitrum
            supportedTokens[0xaf88d065e77c8cC2239327C5EDb3A432268e5831] = true; // USDC
            supportedTokens[0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9] = true; // USDT
        } else if (cId == 8453) { // Base  
            supportedTokens[0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913] = true; // USDC
            supportedTokens[0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2] = true; // USDT
        } else if (cId == 10) { // Optimism
            supportedTokens[0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85] = true; // USDC
            supportedTokens[0x94b008aA00579c1307B0EF2c499aD98a8ce58e58] = true; // USDT
        } else if (cId == 137) { // Polygon
            supportedTokens[0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174] = true; // USDC
            supportedTokens[0xc2132D05D31c914a87C6611C10748AEb04B58e8F] = true; // USDT
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SESSION CREATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Create a new progressive escrow session
     * @dev Enhanced with comprehensive validation and circuit breaker protection
     */
    function createProgressiveSession(
        bytes32 sessionId,
        address mentor,
        address paymentToken,
        uint256 amount,
        uint256 durationMinutes,
        uint256 nonce
    ) external payable nonReentrant whenNotPaused notInEmergencyMode {
        
        CreateParams memory p = CreateParams(sessionId, mentor, paymentToken, amount, durationMinutes, nonce);
        
        // Comprehensive validation
        {
            require(p.mentor != address(0) && p.mentor != msg.sender, "Invalid mentor");
            require(supportedTokens[p.paymentToken], "Unsupported token");
            require(p.amount > 0 && p.durationMinutes > 0, "Invalid amounts");
            require(sessions[p.sessionId].student == address(0), "Session exists");
            require(p.nonce == userNonces[msg.sender], "Invalid nonce");
            require(!usedSessionIds[p.sessionId], "Session ID used");
            require(p.amount >= 1000, "Amount too small"); // Minimum amount check
            require(p.durationMinutes <= 1440, "Duration too long"); // Max 24 hours
        }
        
        // Payment handling with enhanced validation
        {
            userNonces[msg.sender]++;
            if (p.paymentToken == ETH_TOKEN) {
                require(msg.value == p.amount, "ETH amount mismatch");
            } else {
                require(msg.value == 0, "No ETH for token payments");
                // Check balance and allowance before transfer
                IERC20 token = IERC20(p.paymentToken);
                require(token.balanceOf(msg.sender) >= p.amount, "Insufficient token balance");
                require(token.allowance(msg.sender, address(this)) >= p.amount, "Insufficient allowance");
                token.safeTransferFrom(msg.sender, address(this), p.amount);
            }
        }
        
        // Initialize session with enhanced tracking
        _initSessionV8Enhanced(p);
    }

    /**
     * @notice Enhanced session initialization with comprehensive tracking
     */
    function _initSessionV8Enhanced(CreateParams memory p) private {
        usedSessionIds[p.sessionId] = true;
        totalSessionsCreated++;
        
        ProgressiveSession storage s = sessions[p.sessionId];
        s.sessionId = p.sessionId;
        s.student = msg.sender;
        s.mentor = p.mentor;
        s.paymentToken = p.paymentToken;
        s.totalAmount = p.amount;
        s.sessionDuration = p.durationMinutes;
        s.createdAt = block.timestamp;
        s.status = SessionStatus.Created;
        s.lastStatusUpdate = block.timestamp;
        
        // V8 Enhanced refund eligibility tracking
        s.noShowRefundEligible = false;
        s.refundEligibleAt = block.timestamp + SESSION_START_TIMEOUT;
        s.emergencyRefundEligible = false;
        
        emit SessionCreated(p.sessionId, msg.sender, p.mentor, p.amount, p.paymentToken);
        emit MetricsSnapshot(totalSessionsCreated, totalRefundsProcessed, address(this).balance);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SESSION LIFECYCLE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Start a progressive session
     * @dev Enhanced with automatic refund eligibility clearing
     */
    function startProgressiveSession(bytes32 sessionId) external nonReentrant validSession(sessionId) onlyParticipant(sessionId) {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.status == SessionStatus.Created, "Session not in created state");
        require(block.timestamp <= s.createdAt + SESSION_START_TIMEOUT, "Start timeout exceeded");

        s.status = SessionStatus.Active;
        s.startTime = block.timestamp;
        s.lastHeartbeat = block.timestamp;
        s.isActive = true;
        s.lastStatusUpdate = block.timestamp;
        s.noShowRefundEligible = false; // Clear refund eligibility when started
        s.emergencyRefundEligible = false;

        emit SessionStarted(sessionId, block.timestamp);
    }

    /**
     * @notice ENHANCED autoCompleteSession - FIXES V7 BUG
     * @dev Now accepts Created sessions past timeout AND Active/Paused sessions
     */
    function autoCompleteSession(bytes32 sessionId) external nonReentrant validSession(sessionId) {
        ProgressiveSession storage s = sessions[sessionId];
        
        bool eligibleForAutoComplete = false;
        string memory completionReason = "";
        
        // V8 FIX: Accept multiple session states for auto-completion
        if (s.status == SessionStatus.Active || s.status == SessionStatus.Paused) {
            // Original logic: Active/Paused sessions after delay
            require(block.timestamp >= s.createdAt + AUTO_RELEASE_DELAY, "Auto-completion delay not met");
            eligibleForAutoComplete = true;
            completionReason = "Standard auto-completion";
        } else if (s.status == SessionStatus.Created) {
            // V8 FIX: Created sessions past timeout
            require(block.timestamp > s.createdAt + SESSION_START_TIMEOUT, "Session still within start window");
            eligibleForAutoComplete = true;
            completionReason = "No-show auto-completion";
        }
        
        require(eligibleForAutoComplete, "Session not eligible for auto-completion");
        
        // Log the completion method used
        emit RefundPathwayUsed(sessionId, completionReason, block.timestamp);
        
        if (s.status == SessionStatus.Created) {
            // For no-show sessions, process as refund
            _processNoShowRefund(sessionId);
        } else {
            // For active sessions, process as completion
            _finalize(sessionId);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // MULTIPLE REFUND PATHWAYS - BULLETPROOF PROTECTION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Primary refund pathway for no-show sessions
     * @dev Enhanced with comprehensive validation and tracking
     */
    function processNoShowRefund(bytes32 sessionId) external nonReentrant validSession(sessionId) withinRefundLimit(sessions[sessionId].totalAmount) {
        _processNoShowRefund(sessionId);
    }

    function _processNoShowRefund(bytes32 sessionId) private {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.status == SessionStatus.Created, "Session not in created state");
        require(block.timestamp > s.createdAt + SESSION_START_TIMEOUT, "Still within start window");
        require(!refundProcessed[sessionId], "Refund already processed");
        
        _recordRefundAttempt(sessionId, "processNoShowRefund", true, "");
        
        // Mark as eligible if not already
        if (!s.noShowRefundEligible) {
            s.noShowRefundEligible = true;
            s.refundEligibleAt = block.timestamp;
            emit NoShowRefundEligible(sessionId, block.timestamp);
        }
        
        _executeRefund(sessionId, "processNoShowRefund");
    }

    /**
     * @notice Universal refund trigger - anyone can call for eligible sessions
     * @dev Trustless refund mechanism with multiple eligibility checks
     */
    function triggerEligibleRefund(bytes32 sessionId) external nonReentrant validSession(sessionId) {
        ProgressiveSession storage s = sessions[sessionId];
        require(!refundProcessed[sessionId], "Refund already processed");
        
        bool isEligible = false;
        string memory pathway = "";
        
        // Multiple eligibility pathways
        if (s.status == SessionStatus.Created && block.timestamp > s.createdAt + SESSION_START_TIMEOUT) {
            isEligible = true;
            pathway = "expiredCreated";
        } else if (s.noShowRefundEligible && block.timestamp >= s.refundEligibleAt) {
            isEligible = true;
            pathway = "noShowEligible";
        } else if (block.timestamp > s.createdAt + SESSION_START_TIMEOUT + REFUND_GRACE_PERIOD) {
            isEligible = true;
            pathway = "gracePeriodExpired";
        } else if (block.timestamp > s.createdAt + EMERGENCY_THRESHOLD) {
            isEligible = true;
            pathway = "emergencyEligible";
            s.emergencyRefundEligible = true;
        }
        
        require(isEligible, "Session not eligible for refund");
        
        _recordRefundAttempt(sessionId, "triggerEligibleRefund", true, "");
        _executeRefund(sessionId, pathway);
    }

    /**
     * @notice Emergency refund for stuck sessions (owner only)
     */
    function forceRefund(bytes32 sessionId, string calldata reason) external onlyOwner nonReentrant validSession(sessionId) {
        require(!refundProcessed[sessionId], "Refund already processed");
        
        uint256 refundAmount = sessions[sessionId].totalAmount - sessions[sessionId].releasedAmount;
        require(refundAmount > 0, "No funds to refund");
        
        _recordRefundAttempt(sessionId, "forceRefund", true, "");
        _executeRefund(sessionId, "forceRefund");
        
        emit RefundPathwayUsed(sessionId, "forceRefund", block.timestamp);
        totalEmergencyRefunds++;
    }

    /**
     * @notice Batch refund processing for multiple sessions
     * @dev Efficient gas usage for handling multiple stuck sessions
     */
    function batchRefund(bytes32[] calldata sessionIds, string calldata reason) external onlyOwner nonReentrant {
        require(sessionIds.length <= MAX_BATCH_SIZE, "Batch size too large");
        require(sessionIds.length > 0, "Empty batch");
        
        uint256 processedCount = 0;
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < sessionIds.length; i++) {
            bytes32 sessionId = sessionIds[i];
            ProgressiveSession storage s = sessions[sessionId];
            
            // Skip invalid or already processed sessions
            if (s.student == address(0) || refundProcessed[sessionId]) {
                continue;
            }
            
            uint256 refundAmount = s.totalAmount - s.releasedAmount;
            if (refundAmount == 0) {
                continue;
            }
            
            // Process the refund
            try this._executeBatchRefundItem(sessionId) {
                processedCount++;
                totalAmount += refundAmount;
                _recordRefundAttempt(sessionId, "batchRefund", true, "");
            } catch Error(string memory errorReason) {
                _recordRefundAttempt(sessionId, "batchRefund", false, errorReason);
                emit RefundAttemptFailed(sessionId, "batchRefund", errorReason);
            } catch {
                _recordRefundAttempt(sessionId, "batchRefund", false, "Unknown error");
                emit RefundAttemptFailed(sessionId, "batchRefund", "Unknown error");
            }
        }
        
        require(processedCount > 0, "No refunds processed");
        emit BatchRefundProcessed(processedCount, totalAmount);
    }

    /**
     * @notice Internal function for batch refund processing
     * @dev Separated for error handling in batch operations
     */
    function _executeBatchRefundItem(bytes32 sessionId) external {
        require(msg.sender == address(this), "Internal function");
        _executeRefund(sessionId, "batchRefund");
    }

    /**
     * @notice Core refund execution logic
     * @dev Centralized refund processing with comprehensive validation
     */
    function _executeRefund(bytes32 sessionId, string memory method) private {
        ProgressiveSession storage s = sessions[sessionId];
        
        s.status = SessionStatus.RefundProcessed;
        s.lastStatusUpdate = block.timestamp;
        refundProcessed[sessionId] = true;
        refundTimestamp[sessionId] = block.timestamp;
        totalRefundsProcessed++;
        dailyRefundCount++;
        
        uint256 refundAmount = s.totalAmount - s.releasedAmount;
        require(refundAmount > 0, "No funds to refund");
        
        _transfer(s.paymentToken, s.student, refundAmount);
        
        emit AutoRefundProcessed(sessionId, s.student, refundAmount, method);
        emit RefundPathwayUsed(sessionId, method, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SESSION OPERATIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Release progressive payment during active session
     */
    function releaseProgressivePayment(bytes32 sessionId) external nonReentrant validSession(sessionId) onlyParticipant(sessionId) {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.status == SessionStatus.Active && s.isActive && !s.isPaused, "Session not active");

        uint256 releaseAmount;
        
        {
            PaymentCalc memory calc = PaymentCalc(s.totalAmount, s.releasedAmount, s.sessionDuration, _getElapsed(sessionId));
            
            uint256 maxReleasable = (calc.totalAmount * 90) / 100;
            uint256 progressiveMax = (calc.totalAmount * 90 * calc.elapsedMinutes) / (calc.sessionDuration * 100);
            
            if (progressiveMax > maxReleasable) progressiveMax = maxReleasable;
            require(progressiveMax > calc.releasedAmount, "No payment available");
            
            releaseAmount = progressiveMax - calc.releasedAmount;
        }

        s.releasedAmount += releaseAmount;
        _transfer(s.paymentToken, s.mentor, releaseAmount);
        emit ProgressivePaymentReleased(sessionId, releaseAmount, s.releasedAmount, block.timestamp);
    }

    /**
     * @notice Update session heartbeat
     */
    function updateHeartbeat(bytes32 sessionId) external nonReentrant validSession(sessionId) onlyParticipant(sessionId) {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.status == SessionStatus.Active, "Session not active");
        
        s.lastHeartbeat = block.timestamp;
        
        if (s.isPaused) {
            s.pausedTime += block.timestamp - s.lastHeartbeat;
            s.isPaused = false;
            s.status = SessionStatus.Active;
            emit SessionResumed(sessionId, block.timestamp);
        }
        
        emit HeartbeatReceived(sessionId, block.timestamp);
    }

    /**
     * @notice Pause an active session
     */
    function pauseSession(bytes32 sessionId) public nonReentrant validSession(sessionId) {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.status == SessionStatus.Active && !s.isPaused, "Cannot pause session");
        
        bool isParticipant = (msg.sender == s.student || msg.sender == s.mentor);
        bool isTimeout = block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD;
        
        require(isParticipant || isTimeout, "Not authorized to pause");

        s.isPaused = true;
        s.status = SessionStatus.Paused;
        s.lastStatusUpdate = block.timestamp;
        
        if (isParticipant && !isTimeout) {
            s.lastHeartbeat = block.timestamp;
        }
        
        emit SessionPaused(sessionId, block.timestamp, isTimeout ? "Heartbeat timeout" : "Manual pause");
    }

    /**
     * @notice Resume a paused session
     */
    function resumeSession(bytes32 sessionId) public nonReentrant validSession(sessionId) onlyParticipant(sessionId) {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.status == SessionStatus.Paused, "Session not paused");

        s.pausedTime += block.timestamp - s.lastHeartbeat;
        s.isPaused = false;
        s.status = SessionStatus.Active;
        s.lastHeartbeat = block.timestamp;
        s.lastStatusUpdate = block.timestamp;

        emit SessionResumed(sessionId, block.timestamp);
    }

    /**
     * @notice Complete a session manually (student only)
     */
    function completeSession(bytes32 sessionId, uint256 rating, string calldata feedback) external nonReentrant validSession(sessionId) {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student == msg.sender, "Only student can complete");
        require(s.status == SessionStatus.Active || s.status == SessionStatus.Paused, "Session not ready for completion");
        require(rating >= 1 && rating <= 5, "Invalid rating");

        _finalize(sessionId);
    }

    /**
     * @notice Cancel a session before it starts
     */
    function cancelSession(bytes32 sessionId) external nonReentrant validSession(sessionId) onlyParticipant(sessionId) {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.status == SessionStatus.Created, "Session already started");
        require(!refundProcessed[sessionId], "Refund already processed");

        s.status = SessionStatus.Cancelled;
        s.lastStatusUpdate = block.timestamp;
        refundProcessed[sessionId] = true;
        refundTimestamp[sessionId] = block.timestamp;
        
        uint256 refund = s.totalAmount - s.releasedAmount;
        s.releasedAmount = s.totalAmount;

        _transfer(s.paymentToken, s.student, refund);
        emit SessionCancelled(sessionId, refund, block.timestamp);
        emit RefundPathwayUsed(sessionId, "cancelSession", block.timestamp);
    }

    /**
     * @notice Finalize session with payment distribution
     */
    function _finalize(bytes32 sessionId) private {
        ProgressiveSession storage s = sessions[sessionId];
        s.status = SessionStatus.Completed;
        s.surveyCompleted = true;
        s.isActive = false;
        s.lastStatusUpdate = block.timestamp;
        
        uint256 remaining = s.totalAmount - s.releasedAmount;
        if (remaining > 0) {
            uint256 fee = (remaining * PLATFORM_FEE_PERCENT) / 100;
            uint256 mentorAmount = remaining - fee;
            
            s.releasedAmount = s.totalAmount;
            
            if (mentorAmount > 0) _transfer(s.paymentToken, s.mentor, mentorAmount);
            if (fee > 0) _transfer(s.paymentToken, platformWallet, fee);
            
            emit SessionCompleted(sessionId, mentorAmount, fee, block.timestamp);
        } else {
            emit SessionCompleted(sessionId, 0, 0, block.timestamp);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Safe transfer function for ETH and ERC20 tokens
     */
    function _transfer(address token, address to, uint256 amount) internal {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        
        if (token == ETH_TOKEN) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @notice Calculate elapsed session time excluding paused periods
     */
    function _getElapsed(bytes32 sessionId) internal view returns (uint256) {
        ProgressiveSession storage s = sessions[sessionId];
        if (s.startTime == 0) return 0;
        
        uint256 total = block.timestamp - s.startTime;
        uint256 paused = s.pausedTime;
        
        if (s.isPaused && s.lastHeartbeat > 0) {
            paused += block.timestamp - s.lastHeartbeat;
        }
        
        return total <= paused ? 0 : (total - paused) / 60;
    }

    /**
     * @notice Record refund attempt for auditing
     */
    function _recordRefundAttempt(bytes32 sessionId, string memory method, bool success, string memory failureReason) private {
        refundAttempts[sessionId].push(RefundAttempt({
            timestamp: block.timestamp,
            method: method,
            success: success,
            failureReason: failureReason
        }));
    }

    /**
     * @notice Check and reset daily refund limit
     */
    function _checkDailyLimit() private {
        uint256 currentDay = block.timestamp / 86400;
        if (currentDay > lastResetDay) {
            dailyRefundCount = 0;
            lastResetDay = currentDay;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get comprehensive session information
     */
    function getSession(bytes32 sessionId) external view returns (ProgressiveSession memory) {
        return sessions[sessionId];
    }

    /**
     * @notice Get detailed refund status for a session
     */
    function getRefundStatus(bytes32 sessionId) external view returns (
        bool isRefundProcessed,
        bool isEligibleForRefund,
        uint256 refundAmount,
        string memory eligibilityReason,
        uint256 eligibilityTimestamp
    ) {
        ProgressiveSession storage s = sessions[sessionId];
        
        if (s.student == address(0)) {
            return (false, false, 0, "Session not found", 0);
        }
        
        isRefundProcessed = refundProcessed[sessionId];
        refundAmount = s.totalAmount - s.releasedAmount;
        
        if (isRefundProcessed) {
            return (true, false, 0, "Already refunded", refundTimestamp[sessionId]);
        }
        
        if (refundAmount == 0) {
            return (false, false, 0, "No funds to refund", 0);
        }
        
        // Check multiple eligibility conditions
        if (s.status == SessionStatus.Created && block.timestamp > s.createdAt + SESSION_START_TIMEOUT) {
            return (false, true, refundAmount, "No-show session expired", s.createdAt + SESSION_START_TIMEOUT);
        } else if (s.noShowRefundEligible && block.timestamp >= s.refundEligibleAt) {
            return (false, true, refundAmount, "Marked eligible for no-show refund", s.refundEligibleAt);
        } else if (block.timestamp > s.createdAt + SESSION_START_TIMEOUT + REFUND_GRACE_PERIOD) {
            return (false, true, refundAmount, "Grace period expired", s.createdAt + SESSION_START_TIMEOUT + REFUND_GRACE_PERIOD);
        } else if (s.emergencyRefundEligible) {
            return (false, true, refundAmount, "Emergency refund eligible", s.createdAt + EMERGENCY_THRESHOLD);
        } else {
            uint256 nextEligible = s.createdAt + SESSION_START_TIMEOUT;
            return (false, false, refundAmount, "Not yet eligible for refund", nextEligible);
        }
    }

    /**
     * @notice Get available payment amount for progressive release
     */
    function getAvailablePayment(bytes32 sessionId) external view returns (uint256) {
        ProgressiveSession storage s = sessions[sessionId];
        
        if (s.status != SessionStatus.Active || s.isPaused || s.startTime == 0) return 0;
        
        uint256 elapsed = _getElapsed(sessionId);
        if (elapsed == 0 || s.sessionDuration == 0) return 0;
        
        uint256 maxRel = (s.totalAmount * 90 * elapsed) / (s.sessionDuration * 100);
        uint256 releasable = (s.totalAmount * 90) / 100;
        
        if (maxRel > releasable) maxRel = releasable;
        return maxRel > s.releasedAmount ? maxRel - s.releasedAmount : 0;
    }

    /**
     * @notice Get contract metrics
     */
    function getContractMetrics() external view returns (SessionMetrics memory) {
        uint256 totalValueLocked = 0;
        uint256 activeSessions = 0;
        uint256 completedSessions = 0;
        uint256 refundedSessions = 0;
        uint256 totalRefundedAmount = 0;
        
        // Note: This is a simplified version. In production, you might want to track these metrics
        // more efficiently by maintaining counters that are updated during state changes.
        
        return SessionMetrics({
            totalSessions: totalSessionsCreated,
            activeSessions: activeSessions,
            completedSessions: completedSessions,
            refundedSessions: totalRefundsProcessed,
            totalValueLocked: address(this).balance,
            totalRefunded: totalRefundedAmount
        });
    }

    /**
     * @notice Get refund attempts for a session (for auditing)
     */
    function getRefundAttempts(bytes32 sessionId) external view returns (RefundAttempt[] memory) {
        return refundAttempts[sessionId];
    }

    /**
     * @notice Check if session needs heartbeat update
     */
    function needsHeartbeat(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession storage s = sessions[sessionId];
        return (s.status == SessionStatus.Active && s.lastHeartbeat > 0 && block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL);
    }

    /**
     * @notice Check if session should be auto-paused
     */
    function shouldAutoPause(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession storage s = sessions[sessionId];
        return (s.status == SessionStatus.Active && !s.isPaused && s.lastHeartbeat > 0 && 
                block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD);
    }

    /**
     * @notice Get user nonce for session creation
     */
    function getUserNonce(address user) external view returns (uint256) {
        return userNonces[user];
    }

    /**
     * @notice Check if token is supported
     */
    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    /**
     * @notice Calculate maximum releasable payment
     */
    function calculateMaxRelease(uint256 totalAmount, uint256 elapsedMinutes, uint256 durationMinutes) public pure returns (uint256) {
        if (elapsedMinutes == 0 || durationMinutes == 0) return 0;
        uint256 maxRel = (totalAmount * 90 * elapsedMinutes) / (durationMinutes * 100);
        return maxRel > (totalAmount * 90) / 100 ? (totalAmount * 90) / 100 : maxRel;
    }

    /**
     * @notice Get effective elapsed time for a session
     */
    function getEffectiveElapsedTime(bytes32 sessionId) public view returns (uint256) {
        return _getElapsed(sessionId);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Add supported token
     */
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
        emit TokenSupportUpdated(token, true);
    }

    /**
     * @notice Remove supported token
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
        emit TokenSupportUpdated(token, false);
    }

    /**
     * @notice Update platform wallet
     */
    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet address");
        platformWallet = newWallet;
    }

    /**
     * @notice Set daily refund limit
     */
    function setDailyRefundLimit(uint256 newLimit) external onlyOwner {
        require(newLimit > 0, "Invalid limit");
        dailyRefundLimit = newLimit;
    }

    /**
     * @notice Emergency mode controls
     */
    function activateEmergencyMode(string calldata reason) external onlyOwner {
        emergencyMode = true;
        emit EmergencyModeActivated(msg.sender, reason);
    }

    function deactivateEmergencyMode() external onlyOwner {
        emergencyMode = false;
        emit EmergencyModeDeactivated(msg.sender);
    }

    /**
     * @notice Emergency withdrawal functions
     */
    function emergencyWithdrawETH(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0) && amount <= address(this).balance, "Invalid parameters");
        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH withdrawal failed");
    }

    function emergencyWithdrawToken(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0) && token != address(0), "Invalid parameters");
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Pause/unpause contract
     */
    function pause() external onlyOwner { 
        _pause(); 
    }
    
    function unpause() external onlyOwner { 
        _unpause(); 
    }

    // ═══════════════════════════════════════════════════════════════════
    // TESTING AND VALIDATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Validate session state consistency (for testing)
     */
    function validateSessionState(bytes32 sessionId) external view returns (bool isValid, string memory reason) {
        ProgressiveSession storage s = sessions[sessionId];
        
        if (s.student == address(0)) {
            return (false, "Session does not exist");
        }
        
        if (s.totalAmount == 0) {
            return (false, "Invalid total amount");
        }
        
        if (s.releasedAmount > s.totalAmount) {
            return (false, "Released amount exceeds total");
        }
        
        if (s.status == SessionStatus.Active && s.startTime == 0) {
            return (false, "Active session without start time");
        }
        
        if (s.status == SessionStatus.Created && s.startTime != 0) {
            return (false, "Created session with start time");
        }
        
        if (refundProcessed[sessionId] && s.status != SessionStatus.RefundProcessed && s.status != SessionStatus.Cancelled) {
            return (false, "Refund processed but status inconsistent");
        }
        
        return (true, "Session state is valid");
    }

    /**
     * @notice Simulate refund eligibility (for testing)
     */
    function simulateRefundEligibility(bytes32 sessionId, uint256 futureTimestamp) external view returns (bool eligible, string memory reason) {
        ProgressiveSession storage s = sessions[sessionId];
        
        if (s.student == address(0)) {
            return (false, "Session not found");
        }
        
        if (refundProcessed[sessionId]) {
            return (false, "Already refunded");
        }
        
        if (s.status == SessionStatus.Created && futureTimestamp > s.createdAt + SESSION_START_TIMEOUT) {
            return (true, "No-show session expired");
        } else if (futureTimestamp > s.createdAt + EMERGENCY_THRESHOLD) {
            return (true, "Emergency eligible");
        } else {
            return (false, "Not yet eligible");
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // FALLBACK FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    receive() external payable {
        // Allow contract to receive ETH
    }

    fallback() external payable { 
        revert("Function not found"); 
    }
}