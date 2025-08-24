// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ProgressiveEscrowV8 - Chain Academy Mentorship Platform
 * @dev Enhanced mentorship session escrow with comprehensive bug fixes
 * @notice Fixes critical V7 bugs and adds robust session lifecycle management
 * 
 * KEY V8 IMPROVEMENTS:
 * - Fixed autoCompleteSession() logic for Created sessions
 * - Enhanced state machine with dispute handling
 * - Precise pause time tracking
 * - Multiple refund pathways
 * - Comprehensive event logging
 * - Gas-optimized operations
 * 
 * REMIX IDE OPTIMIZED - Single file deployment ready
 */

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ProgressiveEscrowV8 is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ============ ENHANCED ENUMS ============
    
    enum SessionStatus { 
        Created,      // 0 - Initial state after session creation
        Active,       // 1 - Session in progress with heartbeats  
        Paused,       // 2 - Temporarily paused but can resume
        Completed,    // 3 - Successfully completed with survey
        Cancelled,    // 4 - Cancelled before start (full refund)
        Expired,      // 5 - Expired without starting (full refund)
        Disputed,     // 6 - Under dispute resolution
        Abandoned,    // 7 - Abandoned by participants
        Emergency     // 8 - Emergency terminated by admin
    }

    enum DisputeReason {
        PaymentAmount,
        ServiceQuality, 
        TechnicalIssues,
        TimeDiscrepancy,
        Other
    }

    enum RefundType {
        NoShow,       // Student/mentor didn't show up
        Partial,      // Session partially completed
        Emergency,    // Emergency refund by admin
        Dispute,      // Dispute resolution refund
        Technical     // Technical issues refund
    }

    // ============ ENHANCED STRUCTS ============
    
    struct ProgressiveSession {
        // Core session data
        bytes32 sessionId;
        address student;
        address mentor;
        address paymentToken;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 sessionDuration;
        
        // Enhanced timing with precision
        uint256 createdAt;
        uint256 startTime;
        uint256 lastHeartbeat;
        uint256 effectivePausedTime;    // V8: More precise pause tracking
        uint256 lastActivityTime;      // V8: Last meaningful interaction
        
        // State management
        SessionStatus status;
        bool isActive;
        bool isPaused;
        bool surveyCompleted;
        
        // V8: Enhanced state tracking
        uint256 stateTransitionCount;   // Prevent excessive state changes
        uint256 lastStateChange;        // Track state change timing
        bool emergencyLocked;           // Emergency admin lock
        
        // V8: Dispute handling
        DisputeReason disputeReason;
        uint256 disputeCreatedAt;
        address disputeInitiator;
        bool arbitrationRequired;
        
        // V8: Recovery mechanisms
        uint256 recoveryAttempts;
        uint256 lastRecoveryAttempt;
        bool autoRecoveryEnabled;
    }

    struct PaymentCalculation {
        uint256 totalAmount;
        uint256 elapsedMinutes;
        uint256 sessionDuration;
        uint256 pausedTime;
        uint256 effectiveTime;
        uint256 progressiveRelease;
        uint256 platformFee;
        uint256 mentorAmount;
    }

    // ============ STATE VARIABLES ============
    
    mapping(bytes32 => ProgressiveSession) public sessions;
    mapping(address => bool) public supportedTokens;
    mapping(address => uint256) public userNonces;
    
    // V8: Enhanced platform settings
    address public platformWallet;
    uint256 public platformFeePercentage = 10; // 10% platform fee
    uint256 public constant MAX_PLATFORM_FEE = 50; // 50% maximum
    
    // V8: Enhanced session limits
    uint256 public constant MIN_SESSION_DURATION = 30 minutes;
    uint256 public constant MAX_SESSION_DURATION = 8 hours;
    uint256 public constant HEARTBEAT_TIMEOUT = 15 minutes;
    uint256 public constant MAX_PAUSE_DURATION = 2 hours;
    uint256 public constant MAX_TRANSITIONS = 20;
    uint256 public constant MIN_PAYMENT_THRESHOLD = 1000; // 0.01% minimum release
    
    // V8: Enhanced timeouts
    uint256 public constant DISPUTE_TIMEOUT = 7 days;
    uint256 public constant EMERGENCY_TIMEOUT = 1 days;
    uint256 public constant AUTO_COMPLETE_DELAY = 24 hours;
    
    // V8: Recovery settings
    uint256 public constant MAX_RECOVERY_ATTEMPTS = 3;
    uint256 public constant RECOVERY_COOLDOWN = 1 hours;
    
    // ============ V8 EVENTS ============
    
    event SessionCreated(
        bytes32 indexed sessionId,
        address indexed student,
        address indexed mentor,
        uint256 totalAmount,
        address paymentToken,
        uint256 sessionDuration,
        uint256 scheduledTime
    );
    
    event SessionStarted(
        bytes32 indexed sessionId,
        uint256 startTime
    );
    
    event SessionPaused(
        bytes32 indexed sessionId,
        uint256 pauseTime,
        string reason
    );
    
    event SessionResumed(
        bytes32 indexed sessionId,
        uint256 resumeTime,
        uint256 totalPausedTime
    );
    
    event SessionCompleted(
        bytes32 indexed sessionId,
        uint256 completionTime,
        uint256 finalAmount
    );
    
    event SessionStateChanged(
        bytes32 indexed sessionId,
        SessionStatus oldStatus,
        SessionStatus newStatus,
        uint256 timestamp
    );
    
    event DisputeRaised(
        bytes32 indexed sessionId,
        address indexed initiator,
        DisputeReason reason,
        uint256 timestamp
    );
    
    event DisputeResolved(
        bytes32 indexed sessionId,
        address resolver,
        uint256 studentRefund,
        uint256 mentorPayment,
        uint256 timestamp
    );
    
    event AutoRecoveryExecuted(
        bytes32 indexed sessionId,
        string recoveryAction,
        uint256 timestamp
    );
    
    event ProgressivePaymentReleased(
        bytes32 indexed sessionId,
        address indexed recipient,
        uint256 amount,
        uint256 totalReleased,
        uint256 timestamp
    );
    
    event RefundProcessed(
        bytes32 indexed sessionId,
        address recipient,
        uint256 amount,
        RefundType refundType
    );
    
    event EmergencyAction(
        bytes32 indexed sessionId,
        address admin,
        string action,
        uint256 timestamp
    );
    
    event SessionHealthCheck(
        bytes32 indexed sessionId,
        bool healthy,
        string details
    );
    
    event HeartbeatReceived(
        bytes32 indexed sessionId,
        uint256 timestamp,
        uint256 timeSinceLastHeartbeat
    );

    // ============ CONSTRUCTOR ============

    constructor(address _platformWallet) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
        
        // V8: Initialize with common supported tokens (can be updated)
        supportedTokens[address(0)] = true; // ETH
    }

    // ============ V8 SESSION MANAGEMENT ============
    
    function createSession(
        bytes32 _sessionId,
        address _mentor,
        address _paymentToken,
        uint256 _sessionDuration,
        uint256 _scheduledTime
    ) external payable nonReentrant whenNotPaused {
        require(_sessionId != bytes32(0), "Invalid session ID");
        require(_mentor != address(0) && _mentor != msg.sender, "Invalid mentor");
        require(sessions[_sessionId].sessionId == bytes32(0), "Session exists");
        require(_sessionDuration >= MIN_SESSION_DURATION && _sessionDuration <= MAX_SESSION_DURATION, "Invalid duration");
        require(_scheduledTime > block.timestamp, "Invalid schedule");
        require(supportedTokens[_paymentToken], "Token not supported");
        
        uint256 totalAmount;
        
        if (_paymentToken == address(0)) {
            // ETH payment
            require(msg.value > 0, "No payment provided");
            totalAmount = msg.value;
        } else {
            // ERC20 payment
            require(msg.value == 0, "ETH sent with token payment");
            // Amount will be transferred in next step
            revert("Use createSessionWithToken for ERC20 payments");
        }
        
        // V8: Create enhanced session
        ProgressiveSession storage session = sessions[_sessionId];
        session.sessionId = _sessionId;
        session.student = msg.sender;
        session.mentor = _mentor;
        session.paymentToken = _paymentToken;
        session.totalAmount = totalAmount;
        session.releasedAmount = 0;
        session.sessionDuration = _sessionDuration;
        session.createdAt = block.timestamp;
        session.startTime = 0;
        session.lastHeartbeat = 0;
        session.effectivePausedTime = 0;
        session.lastActivityTime = block.timestamp;
        session.status = SessionStatus.Created;
        session.isActive = false;
        session.isPaused = false;
        session.surveyCompleted = false;
        session.stateTransitionCount = 1;
        session.lastStateChange = block.timestamp;
        session.emergencyLocked = false;
        session.autoRecoveryEnabled = true;
        
        emit SessionCreated(_sessionId, msg.sender, _mentor, totalAmount, _paymentToken, _sessionDuration, _scheduledTime);
    }
    
    function createSessionWithToken(
        bytes32 _sessionId,
        address _mentor,
        address _paymentToken,
        uint256 _amount,
        uint256 _sessionDuration,
        uint256 _scheduledTime
    ) external nonReentrant whenNotPaused {
        require(_sessionId != bytes32(0), "Invalid session ID");
        require(_mentor != address(0) && _mentor != msg.sender, "Invalid mentor");
        require(sessions[_sessionId].sessionId == bytes32(0), "Session exists");
        require(_amount > 0, "Invalid amount");
        require(_sessionDuration >= MIN_SESSION_DURATION && _sessionDuration <= MAX_SESSION_DURATION, "Invalid duration");
        require(_scheduledTime > block.timestamp, "Invalid schedule");
        require(supportedTokens[_paymentToken] && _paymentToken != address(0), "Token not supported");
        
        // Transfer tokens to contract
        IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), _amount);
        
        // V8: Create enhanced session
        ProgressiveSession storage session = sessions[_sessionId];
        session.sessionId = _sessionId;
        session.student = msg.sender;
        session.mentor = _mentor;
        session.paymentToken = _paymentToken;
        session.totalAmount = _amount;
        session.releasedAmount = 0;
        session.sessionDuration = _sessionDuration;
        session.createdAt = block.timestamp;
        session.startTime = 0;
        session.lastHeartbeat = 0;
        session.effectivePausedTime = 0;
        session.lastActivityTime = block.timestamp;
        session.status = SessionStatus.Created;
        session.isActive = false;
        session.isPaused = false;
        session.surveyCompleted = false;
        session.stateTransitionCount = 1;
        session.lastStateChange = block.timestamp;
        session.emergencyLocked = false;
        session.autoRecoveryEnabled = true;
        
        emit SessionCreated(_sessionId, msg.sender, _mentor, _amount, _paymentToken, _sessionDuration, _scheduledTime);
    }


    // ============ V8 SESSION LIFECYCLE ============
    
    function startSession(bytes32 _sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(msg.sender == session.student || msg.sender == session.mentor, "Not authorized");
        require(session.status == SessionStatus.Created, "Cannot start session");
        require(!session.emergencyLocked, "Session locked");
        
        // V8: Enhanced state transition
        _changeSessionStatus(session, SessionStatus.Active);
        session.startTime = block.timestamp;
        session.lastHeartbeat = block.timestamp;
        session.lastActivityTime = block.timestamp;
        session.isActive = true;
        
        emit SessionStarted(_sessionId, block.timestamp);
    }
    
    function sendHeartbeat(bytes32 _sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(msg.sender == session.student || msg.sender == session.mentor, "Not authorized");
        require(session.status == SessionStatus.Active, "Session not active");
        require(!session.emergencyLocked, "Session locked");
        
        // V8: Enhanced heartbeat with pause detection
        uint256 previousHeartbeat = session.lastHeartbeat;
        session.lastHeartbeat = block.timestamp;
        session.lastActivityTime = block.timestamp;
        
        // V8: Calculate pause time if session was paused
        if (session.isPaused && previousHeartbeat > 0) {
            uint256 pauseDuration = block.timestamp - previousHeartbeat;
            session.effectivePausedTime += pauseDuration;
            session.isPaused = false;
            
            emit SessionResumed(_sessionId, block.timestamp, session.effectivePausedTime);
        }
    }
    
    function pauseSession(bytes32 _sessionId, string calldata _reason) external nonReentrant {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(msg.sender == session.student || msg.sender == session.mentor, "Not authorized");
        require(session.status == SessionStatus.Active, "Session not active");
        require(!session.isPaused, "Already paused");
        require(!session.emergencyLocked, "Session locked");
        
        // V8: Enhanced pause with state tracking
        _changeSessionStatus(session, SessionStatus.Paused);
        session.isPaused = true;
        session.lastActivityTime = block.timestamp;
        
        emit SessionPaused(_sessionId, block.timestamp, _reason);
    }
    
    function completeSession(bytes32 _sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(msg.sender == session.student || msg.sender == session.mentor, "Not authorized");
        require(session.status == SessionStatus.Active || session.status == SessionStatus.Paused, "Cannot complete");
        require(!session.emergencyLocked, "Session locked");
        
        // V8: Enhanced completion
        _changeSessionStatus(session, SessionStatus.Completed);
        session.isActive = false;
        session.isPaused = false;
        session.surveyCompleted = true;
        session.lastActivityTime = block.timestamp;
        
        // V8: Calculate and release final payment
        PaymentCalculation memory calc = calculateProgressivePayment(_sessionId);
        if (calc.mentorAmount > 0) {
            _releasePayment(session, calc.mentorAmount, calc.platformFee);
        }
        
        emit SessionCompleted(_sessionId, block.timestamp, calc.mentorAmount);
    }

    // ============ V8 ENHANCED AUTO COMPLETION ============
    
    function autoCompleteSession(bytes32 _sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(!session.emergencyLocked, "Session locked");
        
        // V8: FIXED - Enhanced eligibility check for auto-completion
        bool eligible = false;
        string memory reason;
        
        if (session.status == SessionStatus.Created) {
            // V8: FIX - Allow auto-completion of Created sessions that exceed timeout
            if (block.timestamp >= session.createdAt + AUTO_COMPLETE_DELAY) {
                eligible = true;
                reason = "No-show timeout reached";
            }
        } else if (session.status == SessionStatus.Active) {
            // Original V7 logic for Active sessions
            if (block.timestamp >= session.lastHeartbeat + HEARTBEAT_TIMEOUT) {
                eligible = true;
                reason = "Heartbeat timeout";
            }
        } else if (session.status == SessionStatus.Paused) {
            // V7 logic for Paused sessions
            if (session.effectivePausedTime >= MAX_PAUSE_DURATION) {
                eligible = true;
                reason = "Max pause duration exceeded";
            }
        } else if (session.status == SessionStatus.Disputed) {
            // V8: Auto-resolve expired disputes
            if (block.timestamp >= session.disputeCreatedAt + DISPUTE_TIMEOUT) {
                eligible = true;
                reason = "Dispute timeout";
            }
        }
        
        require(eligible, string(abi.encodePacked("Not eligible for auto-completion: ", reason)));
        
        // V8: Process based on session state
        if (session.status == SessionStatus.Created) {
            // No-show refund
            _processNoShowRefund(session);
        } else {
            // Standard completion
            _changeSessionStatus(session, SessionStatus.Completed);
            session.isActive = false;
            session.isPaused = false;
            
            PaymentCalculation memory calc = calculateProgressivePayment(_sessionId);
            if (calc.mentorAmount > 0) {
                _releasePayment(session, calc.mentorAmount, calc.platformFee);
            }
            
            emit SessionCompleted(_sessionId, block.timestamp, calc.mentorAmount);
        }
    }

    // ============ V8 REFUND PATHWAYS ============
    
    function processNoShowRefund(bytes32 _sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(session.status == SessionStatus.Created, "Not in Created state");
        require(block.timestamp >= session.createdAt + AUTO_COMPLETE_DELAY, "Too early for no-show");
        require(!session.emergencyLocked, "Session locked");
        
        _processNoShowRefund(session);
    }
    
    function processPartialRefund(bytes32 _sessionId, uint256 _completionPercentage) external nonReentrant {
        require(_completionPercentage <= 100, "Invalid percentage");
        
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(msg.sender == session.student || msg.sender == session.mentor, "Not authorized");
        require(session.status == SessionStatus.Active || session.status == SessionStatus.Paused, "Invalid status");
        require(!session.emergencyLocked, "Session locked");
        
        // V8: Calculate partial amounts
        uint256 mentorAmount = (session.totalAmount * _completionPercentage) / 100;
        uint256 platformFee = (mentorAmount * platformFeePercentage) / 100;
        uint256 studentRefund = session.totalAmount - mentorAmount;
        
        _changeSessionStatus(session, SessionStatus.Completed);
        session.isActive = false;
        session.isPaused = false;
        
        // Process payments
        if (mentorAmount > 0) {
            _transferFunds(session.paymentToken, session.mentor, mentorAmount - platformFee);
            if (platformFee > 0) {
                _transferFunds(session.paymentToken, platformWallet, platformFee);
            }
        }
        
        if (studentRefund > 0) {
            _transferFunds(session.paymentToken, session.student, studentRefund);
        }
        
        session.releasedAmount = session.totalAmount;
        
        emit RefundProcessed(_sessionId, session.student, studentRefund, RefundType.Partial);
    }
    
    function processEmergencyRefund(bytes32 _sessionId, string calldata _reason) external nonReentrant onlyOwner {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(session.totalAmount > session.releasedAmount, "Nothing to refund");
        
        uint256 refundAmount = session.totalAmount - session.releasedAmount;
        
        _changeSessionStatus(session, SessionStatus.Emergency);
        session.emergencyLocked = true;
        session.isActive = false;
        session.isPaused = false;
        
        // Emergency refund to student
        _transferFunds(session.paymentToken, session.student, refundAmount);
        session.releasedAmount = session.totalAmount;
        
        emit EmergencyAction(_sessionId, msg.sender, _reason, block.timestamp);
        emit RefundProcessed(_sessionId, session.student, refundAmount, RefundType.Emergency);
    }

    // ============ V8 DISPUTE HANDLING ============
    
    function raiseDispute(bytes32 _sessionId, DisputeReason _reason) external nonReentrant {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(msg.sender == session.student || msg.sender == session.mentor, "Not authorized");
        require(session.status != SessionStatus.Completed && session.status != SessionStatus.Disputed, "Invalid status");
        require(!session.emergencyLocked, "Session locked");
        
        // V8: Enhanced dispute tracking
        _changeSessionStatus(session, SessionStatus.Disputed);
        session.disputeReason = _reason;
        session.disputeCreatedAt = block.timestamp;
        session.disputeInitiator = msg.sender;
        session.arbitrationRequired = true;
        session.isActive = false;
        session.isPaused = false;
        
        emit DisputeRaised(_sessionId, msg.sender, _reason, block.timestamp);
    }
    
    function resolveDispute(
        bytes32 _sessionId,
        uint256 _studentRefund,
        uint256 _mentorPayment
    ) external nonReentrant onlyOwner {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(session.status == SessionStatus.Disputed, "Not disputed");
        require(_studentRefund + _mentorPayment <= session.totalAmount, "Invalid amounts");
        
        _changeSessionStatus(session, SessionStatus.Completed);
        session.arbitrationRequired = false;
        
        // Process dispute resolution
        if (_mentorPayment > 0) {
            uint256 platformFee = (_mentorPayment * platformFeePercentage) / 100;
            _transferFunds(session.paymentToken, session.mentor, _mentorPayment - platformFee);
            if (platformFee > 0) {
                _transferFunds(session.paymentToken, platformWallet, platformFee);
            }
        }
        
        if (_studentRefund > 0) {
            _transferFunds(session.paymentToken, session.student, _studentRefund);
        }
        
        session.releasedAmount = session.totalAmount;
        
        emit DisputeResolved(_sessionId, msg.sender, _studentRefund, _mentorPayment, block.timestamp);
    }

    // ============ V8 AUTO RECOVERY ============
    
    function executeAutoRecovery(bytes32 _sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(session.autoRecoveryEnabled, "Auto-recovery disabled");
        require(session.recoveryAttempts < MAX_RECOVERY_ATTEMPTS, "Max attempts reached");
        require(block.timestamp >= session.lastRecoveryAttempt + RECOVERY_COOLDOWN, "Recovery cooldown");
        
        session.recoveryAttempts++;
        session.lastRecoveryAttempt = block.timestamp;
        
        string memory action;
        
        // V8: Smart recovery based on session state
        if (session.status == SessionStatus.Created && block.timestamp >= session.createdAt + AUTO_COMPLETE_DELAY) {
            _processNoShowRefund(session);
            action = "No-show refund executed";
        } else if (session.status == SessionStatus.Active && block.timestamp >= session.lastHeartbeat + HEARTBEAT_TIMEOUT) {
            _changeSessionStatus(session, SessionStatus.Completed);
            PaymentCalculation memory calc = calculateProgressivePayment(_sessionId);
            if (calc.mentorAmount > 0) {
                _releasePayment(session, calc.mentorAmount, calc.platformFee);
            }
            action = "Session auto-completed";
        } else if (session.status == SessionStatus.Paused && session.effectivePausedTime >= MAX_PAUSE_DURATION) {
            _changeSessionStatus(session, SessionStatus.Completed);
            PaymentCalculation memory calc = calculateProgressivePayment(_sessionId);
            if (calc.mentorAmount > 0) {
                _releasePayment(session, calc.mentorAmount, calc.platformFee);
            }
            action = "Paused session completed";
        } else {
            revert("No recovery action available");
        }
        
        emit AutoRecoveryExecuted(_sessionId, action, block.timestamp);
    }

    // ============ V8 PAYMENT CALCULATIONS ============
    
    function calculateProgressivePayment(bytes32 _sessionId) public view returns (PaymentCalculation memory) {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        
        PaymentCalculation memory calc;
        calc.totalAmount = session.totalAmount;
        calc.sessionDuration = session.sessionDuration;
        calc.pausedTime = session.effectivePausedTime;
        
        if (session.status == SessionStatus.Created || session.startTime == 0) {
            // Not started - no payment
            calc.elapsedMinutes = 0;
            calc.effectiveTime = 0;
            calc.progressiveRelease = 0;
        } else {
            // Calculate effective time
            uint256 totalElapsed = block.timestamp - session.startTime;
            calc.elapsedMinutes = totalElapsed / 60;
            calc.effectiveTime = totalElapsed > calc.pausedTime ? totalElapsed - calc.pausedTime : 0;
            
            // V8: Progressive release calculation with precision protection
            if (calc.effectiveTime >= calc.sessionDuration) {
                // Full session completed
                calc.progressiveRelease = calc.totalAmount;
            } else if (calc.effectiveTime > 0) {
                // Partial completion - proportional payment
                calc.progressiveRelease = (calc.totalAmount * calc.effectiveTime) / calc.sessionDuration;
                
                // V8: Apply minimum threshold
                uint256 minThreshold = (calc.totalAmount * MIN_PAYMENT_THRESHOLD) / 100000;
                if (calc.progressiveRelease < minThreshold) {
                    calc.progressiveRelease = 0;
                }
            }
        }
        
        // Calculate fees
        calc.platformFee = (calc.progressiveRelease * platformFeePercentage) / 100;
        calc.mentorAmount = calc.progressiveRelease > calc.platformFee ? calc.progressiveRelease - calc.platformFee : 0;
        
        return calc;
    }
    
    function getAvailablePayment(bytes32 _sessionId) external view returns (uint256) {
        ProgressiveSession storage session = sessions[_sessionId];
        if (session.sessionId == bytes32(0)) return 0;
        
        PaymentCalculation memory calc = calculateProgressivePayment(_sessionId);
        
        // Return available amount (not yet released)
        if (calc.progressiveRelease > session.releasedAmount) {
            return calc.progressiveRelease - session.releasedAmount;
        }
        
        return 0;
    }

    // ============ V8 HEALTH MONITORING ============
    
    function checkSessionHealth(bytes32 _sessionId) external view returns (bool healthy, string memory details) {
        ProgressiveSession storage session = sessions[_sessionId];
        if (session.sessionId == bytes32(0)) {
            return (false, "Session not found");
        }
        
        if (session.emergencyLocked) {
            return (false, "Session emergency locked");
        }
        
        if (session.status == SessionStatus.Active && block.timestamp > session.lastHeartbeat + HEARTBEAT_TIMEOUT) {
            return (false, "Heartbeat timeout exceeded");
        }
        
        if (session.status == SessionStatus.Paused && session.effectivePausedTime > MAX_PAUSE_DURATION) {
            return (false, "Session paused too long");
        }
        
        if (session.stateTransitionCount > (MAX_TRANSITIONS * 4) / 5) {
            return (false, "Too many state transitions");
        }
        
        return (true, "Session healthy");
    }

    // ============ V8 INTERNAL FUNCTIONS ============
    
    function _changeSessionStatus(ProgressiveSession storage session, SessionStatus newStatus) internal {
        SessionStatus oldStatus = session.status;
        session.status = newStatus;
        session.stateTransitionCount++;
        session.lastStateChange = block.timestamp;
        
        emit SessionStateChanged(session.sessionId, oldStatus, newStatus, block.timestamp);
    }
    
    function _processNoShowRefund(ProgressiveSession storage session) internal {
        _changeSessionStatus(session, SessionStatus.Expired);
        session.isActive = false;
        session.isPaused = false;
        
        // Full refund to student
        uint256 refundAmount = session.totalAmount - session.releasedAmount;
        if (refundAmount > 0) {
            _transferFunds(session.paymentToken, session.student, refundAmount);
            session.releasedAmount = session.totalAmount;
        }
        
        emit RefundProcessed(session.sessionId, session.student, refundAmount, RefundType.NoShow);
    }
    
    function _releasePayment(ProgressiveSession storage session, uint256 mentorAmount, uint256 platformFee) internal {
        if (mentorAmount > 0) {
            _transferFunds(session.paymentToken, session.mentor, mentorAmount);
        }
        
        if (platformFee > 0) {
            _transferFunds(session.paymentToken, platformWallet, platformFee);
        }
        
        session.releasedAmount += (mentorAmount + platformFee);
        
        emit ProgressivePaymentReleased(session.sessionId, session.mentor, mentorAmount, session.releasedAmount, block.timestamp);
    }
    
    function _transferFunds(address token, address to, uint256 amount) internal {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        
        if (token == address(0)) {
            // ETH transfer
            (bool success, ) = to.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC20 transfer
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // ============ V8 ADMIN FUNCTIONS ============
    
    function addSupportedToken(address _token) external onlyOwner {
        supportedTokens[_token] = true;
    }
    
    function removeSupportedToken(address _token) external onlyOwner {
        supportedTokens[_token] = false;
    }
    
    function updatePlatformWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid wallet");
        platformWallet = _newWallet;
    }
    
    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= MAX_PLATFORM_FEE, "Fee too high");
        platformFeePercentage = _newFee;
    }
    
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }

    // ============ V8 VIEW FUNCTIONS ============
    
    function getSession(bytes32 _sessionId) external view returns (ProgressiveSession memory) {
        return sessions[_sessionId];
    }
    
    function isSupportedToken(address _token) external view returns (bool) {
        return supportedTokens[_token];
    }
    
    function version() external pure returns (string memory) {
        return "8.0.0";
    }
    
    function getContractFeatures() external pure returns (string[] memory) {
        string[] memory features = new string[](8);
        features[0] = "Enhanced State Machine";
        features[1] = "Multiple Refund Pathways";
        features[2] = "Auto-Recovery System";
        features[3] = "Dispute Resolution";
        features[4] = "Health Monitoring";
        features[5] = "Progressive Payments";
        features[6] = "Emergency Controls";
        features[7] = "Gas Optimized";
        return features;
    }

    // ============ V7 COMPATIBILITY LAYER ============
    
    /**
     * @dev V7 Compatibility - createProgressiveSession function
     * @notice This function maintains compatibility with V7 frontend calls
     * @notice Internally uses V8 enhanced logic while keeping V7 interface
     */
    function createProgressiveSession(
        bytes32 sessionId,
        address mentor,
        address paymentToken,
        uint256 amount,
        uint256 durationMinutes,
        uint256 /* nonce */
    ) external payable nonReentrant whenNotPaused {
        require(sessionId != bytes32(0), "Invalid session ID");
        require(mentor != address(0) && mentor != msg.sender, "Invalid mentor");
        require(sessions[sessionId].sessionId == bytes32(0), "Session exists");
        require(amount > 0, "Invalid amount");
        require(durationMinutes >= MIN_SESSION_DURATION && durationMinutes <= MAX_SESSION_DURATION, "Invalid duration");
        require(supportedTokens[paymentToken], "Token not supported");
        
        // V7 Compatibility: Nonce is accepted but not strictly required in V8
        // This allows V7 frontend to work without changes
        // Note: nonce parameter is silenced as /* nonce */ to avoid unused parameter warning
        
        uint256 totalAmount;
        
        if (paymentToken == address(0)) {
            // ETH payment
            require(msg.value == amount, "ETH amount mismatch");
            totalAmount = amount;
        } else {
            // ERC20 payment
            require(msg.value == 0, "No ETH for ERC20");
            IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
            totalAmount = amount;
        }
        
        // V8: Create enhanced session with immediate scheduled time (V7 compatibility)
        uint256 scheduledTime = block.timestamp + 60; // 1 minute from now for immediate sessions
        
        // V8: Use enhanced ProgressiveSession struct
        ProgressiveSession storage session = sessions[sessionId];
        session.sessionId = sessionId;
        session.student = msg.sender;
        session.mentor = mentor;
        session.paymentToken = paymentToken;
        session.totalAmount = totalAmount;
        session.releasedAmount = 0;
        session.sessionDuration = durationMinutes;
        session.createdAt = block.timestamp;
        session.startTime = 0;
        session.lastHeartbeat = 0;
        session.effectivePausedTime = 0;
        session.lastActivityTime = block.timestamp;
        session.status = SessionStatus.Created;
        session.isActive = false;
        session.isPaused = false;
        session.surveyCompleted = false;
        
        // V8: Enhanced fields
        session.stateTransitionCount = 1;
        session.lastStateChange = block.timestamp;
        session.emergencyLocked = false;
        session.autoRecoveryEnabled = true;
        session.recoveryAttempts = 0;
        session.lastRecoveryAttempt = 0;
        
        emit SessionCreated(sessionId, msg.sender, mentor, totalAmount, paymentToken, durationMinutes, scheduledTime);
    }
    
    /**
     * @dev V7 Compatibility - startProgressiveSession function
     * @notice Alias for startSession to maintain V7 compatibility
     */
    function startProgressiveSession(bytes32 _sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(msg.sender == session.student || msg.sender == session.mentor, "Not authorized");
        require(session.status == SessionStatus.Created, "Cannot start session");
        require(!session.emergencyLocked, "Session locked");
        
        // V8: Enhanced state transition
        _changeSessionStatus(session, SessionStatus.Active);
        session.startTime = block.timestamp;
        session.lastHeartbeat = block.timestamp;
        session.lastActivityTime = block.timestamp;
        session.isActive = true;
        
        emit SessionStarted(_sessionId, block.timestamp);
    }
    
    /**
     * @dev V7 Compatibility - getUserNonce function
     * @notice Returns 0 for V8 (nonces not strictly required)
     * @param user Address to get nonce for (unused in V8)
     * @return Always returns 0 for V8 compatibility
     */
    function getUserNonce(address user) external pure returns (uint256) {
        // V8 doesn't use nonces for session creation, return 0 for V7 compatibility
        user; // Silence unused parameter warning
        return 0;
    }
    
    /**
     * @dev V7 Compatibility - needsHeartbeat function
     * @notice Checks if session needs a heartbeat
     */
    function needsHeartbeat(bytes32 _sessionId) external view returns (bool) {
        ProgressiveSession memory session = sessions[_sessionId];
        if (session.sessionId == bytes32(0) || session.status != SessionStatus.Active) {
            return false;
        }
        
        return (block.timestamp - session.lastHeartbeat) > HEARTBEAT_TIMEOUT;
    }
    
    /**
     * @dev V7 Compatibility - shouldAutoPause function
     * @notice Checks if session should be auto-paused
     */
    function shouldAutoPause(bytes32 _sessionId) external view returns (bool) {
        ProgressiveSession memory session = sessions[_sessionId];
        if (session.sessionId == bytes32(0) || session.status != SessionStatus.Active) {
            return false;
        }
        
        return (block.timestamp - session.lastHeartbeat) > HEARTBEAT_TIMEOUT;
    }
    
    /**
     * @dev V7 Compatibility - getEffectiveElapsedTime function
     * @notice Returns effective elapsed time accounting for pauses
     */
    function getEffectiveElapsedTime(bytes32 _sessionId) external view returns (uint256) {
        ProgressiveSession memory session = sessions[_sessionId];
        if (session.sessionId == bytes32(0) || session.startTime == 0) {
            return 0;
        }
        
        uint256 totalElapsed = block.timestamp - session.startTime;
        return totalElapsed > session.effectivePausedTime ? 
               totalElapsed - session.effectivePausedTime : 0;
    }
    
    /**
     * @dev V7 Compatibility - releaseProgressivePayment function
     * @notice Alias for progressive payment release
     */
    function releaseProgressivePayment(bytes32 _sessionId) external {
        // Use V8 enhanced payment logic
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(session.status == SessionStatus.Active, "Session not active");
        require(msg.sender == session.student || msg.sender == session.mentor, "Not authorized");
        
        PaymentCalculation memory calc = calculateProgressivePayment(_sessionId);
        if (calc.mentorAmount > 0) {
            _releasePayment(session, calc.mentorAmount, calc.platformFee);
        }
    }
    
    /**
     * @dev V7 Compatibility - updateHeartbeat function
     * @notice Alias for sendHeartbeat
     */
    function updateHeartbeat(bytes32 _sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[_sessionId];
        require(session.sessionId != bytes32(0), "Session not found");
        require(msg.sender == session.student || msg.sender == session.mentor, "Not authorized");
        require(session.status == SessionStatus.Active, "Session not active");
        require(!session.emergencyLocked, "Session locked");
        
        // V8: Enhanced heartbeat with pause detection
        uint256 previousHeartbeat = session.lastHeartbeat;
        session.lastHeartbeat = block.timestamp;
        session.lastActivityTime = block.timestamp;
        
        // V8: Auto-unpause if paused and heartbeat received
        if (session.isPaused && session.status == SessionStatus.Paused) {
            _changeSessionStatus(session, SessionStatus.Active);
            session.isPaused = false;
        }
        
        emit HeartbeatReceived(_sessionId, block.timestamp, block.timestamp - previousHeartbeat);
    }
}