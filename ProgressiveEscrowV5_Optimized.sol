// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts@4.9.3/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.9.3/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts@4.9.3/access/Ownable.sol";
import "@openzeppelin/contracts@4.9.3/security/Pausable.sol";
import "@openzeppelin/contracts@4.9.3/security/ReentrancyGuard.sol";

contract ProgressiveEscrowV5 is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant PLATFORM_FEE_PERCENT = 10;
    uint256 public constant HEARTBEAT_INTERVAL = 30;
    uint256 public constant GRACE_PERIOD = 60;
    uint256 public constant AUTO_RELEASE_DELAY = 7 days;
    uint256 public constant SESSION_START_TIMEOUT = 15 minutes;
    address public constant ETH_TOKEN = address(0);

    address public platformWallet;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => ProgressiveSession) public sessions;
    mapping(address => uint256) public userNonces;
    mapping(bytes32 => bool) public usedSessionIds;

    enum SessionStatus { Created, Active, Paused, Completed, Cancelled, Expired }

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
    }

    event SessionCreated(bytes32 indexed sessionId, address indexed student, address indexed mentor, uint256 amount, address token);
    event SessionStarted(bytes32 indexed sessionId, uint256 startTime);
    event SessionPaused(bytes32 indexed sessionId, uint256 pausedAt, string reason);
    event SessionResumed(bytes32 indexed sessionId, uint256 resumedAt);
    event SessionCompleted(bytes32 indexed sessionId, uint256 mentorAmount, uint256 platformFee, uint256 completedAt);
    event SessionCancelled(bytes32 indexed sessionId, uint256 refundAmount, uint256 cancelledAt);
    event SessionExpired(bytes32 indexed sessionId, uint256 refundAmount);
    event ProgressivePaymentReleased(bytes32 indexed sessionId, uint256 amount, uint256 totalReleased, uint256 timestamp);
    event HeartbeatReceived(bytes32 indexed sessionId, uint256 timestamp);
    event EmergencyRelease(bytes32 indexed sessionId, uint256 amount, string reason);
    event TokenSupportUpdated(address token, bool supported);

    constructor(address _platformWallet) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
        
        // Enable ETH and auto-detect tokens based on chain
        supportedTokens[ETH_TOKEN] = true;
        _autoEnableTokens();
        
        emit TokenSupportUpdated(ETH_TOKEN, true);
    }

    function _autoEnableTokens() private {
        uint256 chainId = block.chainid;
        
        if (chainId == 42161) { // Arbitrum
            supportedTokens[0xaf88d065e77c8cC2239327C5EDb3A432268e5831] = true; // USDC
            supportedTokens[0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9] = true; // USDT
        } else if (chainId == 8453) { // Base
            supportedTokens[0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913] = true; // USDC
            supportedTokens[0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2] = true; // USDT
        } else if (chainId == 10) { // Optimism
            supportedTokens[0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85] = true; // USDC
            supportedTokens[0x94b008aA00579c1307B0EF2c499aD98a8ce58e58] = true; // USDT
        } else if (chainId == 137) { // Polygon
            supportedTokens[0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174] = true; // USDC
            supportedTokens[0xc2132D05D31c914a87C6611C10748AEb04B58e8F] = true; // USDT
        }
    }

    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
        emit TokenSupportUpdated(token, true);
    }

    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
        emit TokenSupportUpdated(token, false);
    }

    function getUserNonce(address user) external view returns (uint256) {
        return userNonces[user];
    }

    function createProgressiveSession(
        bytes32 sessionId,
        address mentor,
        address paymentToken,
        uint256 amount,
        uint256 durationMinutes,
        uint256 nonce
    ) external payable nonReentrant whenNotPaused {
        _validateSession(sessionId, mentor, paymentToken, amount, durationMinutes, nonce);
        _processPayment(paymentToken, amount);
        _createSession(sessionId, mentor, paymentToken, amount, durationMinutes);
    }

    function _validateSession(
        bytes32 sessionId,
        address mentor,
        address paymentToken,
        uint256 amount,
        uint256 durationMinutes,
        uint256 nonce
    ) private {
        require(mentor != address(0), "Invalid mentor address");
        require(mentor != msg.sender, "Cannot mentor yourself");
        require(supportedTokens[paymentToken], "Unsupported payment token");
        require(amount > 0, "Amount must be greater than 0");
        require(durationMinutes > 0, "Duration must be greater than 0");
        require(sessions[sessionId].student == address(0), "Session already exists");
        require(nonce == userNonces[msg.sender], "Invalid nonce");
        require(!usedSessionIds[sessionId], "Session ID already used");
    }

    function _processPayment(address paymentToken, uint256 amount) private {
        userNonces[msg.sender]++;
        
        if (paymentToken == ETH_TOKEN) {
            require(msg.value == amount, "ETH amount mismatch");
        } else {
            require(msg.value == 0, "ETH not accepted for ERC20 payments");
            IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        }
    }

    function _createSession(
        bytes32 sessionId,
        address mentor,
        address paymentToken,
        uint256 amount,
        uint256 durationMinutes
    ) private {
        usedSessionIds[sessionId] = true;
        
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

    function startProgressiveSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Created, "Session already started or completed");
        require(
            msg.sender == session.student || msg.sender == session.mentor,
            "Only session participants can start"
        );
        require(
            block.timestamp <= session.createdAt + SESSION_START_TIMEOUT,
            "Session start timeout exceeded"
        );

        session.status = SessionStatus.Active;
        session.startTime = block.timestamp;
        session.lastHeartbeat = block.timestamp;
        session.isActive = true;
        session.isPaused = false;

        emit SessionStarted(sessionId, block.timestamp);
    }

    function checkAndExpireSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Created, "Session already started");
        require(
            block.timestamp > session.createdAt + SESSION_START_TIMEOUT,
            "Session not yet expired"
        );

        session.status = SessionStatus.Expired;
        _transferPayment(session.paymentToken, session.student, session.totalAmount);
        emit SessionExpired(sessionId, session.totalAmount);
    }

    function releaseProgressivePayment(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Active, "Session not active");
        require(session.isActive && !session.isPaused, "Session not running");
        require(session.startTime > 0, "Session start time not set");
        require(
            msg.sender == session.student || msg.sender == session.mentor,
            "Only session participants can release payment"
        );

        uint256 releaseAmount = _calculateRelease(sessionId);
        require(releaseAmount > 0, "No payment to release");

        session.releasedAmount += releaseAmount;
        _transferPayment(session.paymentToken, session.mentor, releaseAmount);
        emit ProgressivePaymentReleased(sessionId, releaseAmount, session.releasedAmount, block.timestamp);
    }

    function _calculateRelease(bytes32 sessionId) private view returns (uint256) {
        ProgressiveSession storage session = sessions[sessionId];
        uint256 effectiveElapsed = getEffectiveElapsedTime(sessionId);
        uint256 maxReleaseAmount = calculateMaxRelease(session.totalAmount, effectiveElapsed, session.sessionDuration);
        
        require(maxReleaseAmount > session.releasedAmount, "No payment available for release");
        uint256 releaseAmount = maxReleaseAmount - session.releasedAmount;
        
        uint256 maxReleasableBeforeCompletion = (session.totalAmount * 90) / 100;
        if (session.releasedAmount + releaseAmount > maxReleasableBeforeCompletion) {
            releaseAmount = maxReleasableBeforeCompletion - session.releasedAmount;
        }
        
        return releaseAmount;
    }

    function updateHeartbeat(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Active, "Session not active");
        require(
            msg.sender == session.student || msg.sender == session.mentor,
            "Only session participants can update heartbeat"
        );

        session.lastHeartbeat = block.timestamp;
        
        if (session.isPaused) {
            resumeSession(sessionId);
        }

        emit HeartbeatReceived(sessionId, block.timestamp);
    }

    function pauseSession(bytes32 sessionId) public nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Active, "Session not active");
        require(!session.isPaused, "Session already paused");
        
        bool isParticipant = msg.sender == session.student || msg.sender == session.mentor;
        bool isHeartbeatTimeout = block.timestamp > session.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD;
        
        require(isParticipant || isHeartbeatTimeout, "Unauthorized pause");

        session.isPaused = true;
        session.status = SessionStatus.Paused;
        
        if (isParticipant && !isHeartbeatTimeout) {
            session.lastHeartbeat = block.timestamp;
        }
        
        string memory reason = isHeartbeatTimeout ? "Heartbeat timeout" : "Manual pause";
        emit SessionPaused(sessionId, block.timestamp, reason);
    }

    function resumeSession(bytes32 sessionId) public nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Paused, "Session not paused");
        require(
            msg.sender == session.student || msg.sender == session.mentor,
            "Only session participants can resume"
        );

        uint256 pauseDuration = block.timestamp - session.lastHeartbeat;
        session.pausedTime += pauseDuration;
        session.isPaused = false;
        session.status = SessionStatus.Active;
        session.lastHeartbeat = block.timestamp;

        emit SessionResumed(sessionId, block.timestamp);
    }

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

        _processCompletion(sessionId);
    }

    function _processCompletion(bytes32 sessionId) private {
        ProgressiveSession storage session = sessions[sessionId];
        session.status = SessionStatus.Completed;
        session.surveyCompleted = true;
        session.isActive = false;

        uint256 remainingAmount = session.totalAmount - session.releasedAmount;
        uint256 platformFee = (remainingAmount * PLATFORM_FEE_PERCENT) / 100;
        uint256 mentorAmount = remainingAmount - platformFee;

        session.releasedAmount = session.totalAmount;

        if (mentorAmount > 0) {
            _transferPayment(session.paymentToken, session.mentor, mentorAmount);
        }
        if (platformFee > 0) {
            _transferPayment(session.paymentToken, platformWallet, platformFee);
        }

        emit SessionCompleted(sessionId, mentorAmount, platformFee, block.timestamp);
    }

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

        _processCompletion(sessionId);
    }

    function cancelSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage session = sessions[sessionId];
        require(session.student != address(0), "Session does not exist");
        require(session.status == SessionStatus.Created, "Session already started");
        require(
            msg.sender == session.student || msg.sender == session.mentor,
            "Only session participants can cancel"
        );

        session.status = SessionStatus.Cancelled;
        uint256 refundAmount = session.totalAmount - session.releasedAmount;
        session.releasedAmount = session.totalAmount;

        _transferPayment(session.paymentToken, session.student, refundAmount);
        emit SessionCancelled(sessionId, refundAmount, block.timestamp);
    }

    function _transferPayment(address token, address to, uint256 amount) internal {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        
        if (token == ETH_TOKEN) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function calculateMaxRelease(uint256 totalAmount, uint256 elapsedMinutes, uint256 durationMinutes) public pure returns (uint256) {
        if (elapsedMinutes == 0 || durationMinutes == 0) return 0;
        
        uint256 releasableAmount = (totalAmount * 90) / 100;
        uint256 maxRelease = (releasableAmount * elapsedMinutes) / durationMinutes;
        
        if (maxRelease > releasableAmount) {
            maxRelease = releasableAmount;
        }
        
        return maxRelease;
    }

    function getEffectiveElapsedTime(bytes32 sessionId) public view returns (uint256) {
        ProgressiveSession memory session = sessions[sessionId];
        require(session.startTime > 0, "Session not started");
        
        uint256 totalElapsed = block.timestamp - session.startTime;
        uint256 currentPausedTime = session.pausedTime;
        
        if (session.isPaused && session.lastHeartbeat > 0) {
            currentPausedTime += block.timestamp - session.lastHeartbeat;
        }
        
        if (totalElapsed <= currentPausedTime) return 0;
        
        uint256 effectiveMinutes = (totalElapsed - currentPausedTime) / 60;
        return effectiveMinutes;
    }

    function needsHeartbeat(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession memory session = sessions[sessionId];
        if (session.status != SessionStatus.Active || session.lastHeartbeat == 0) {
            return false;
        }
        return block.timestamp > session.lastHeartbeat + HEARTBEAT_INTERVAL;
    }

    function shouldAutoPause(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession memory session = sessions[sessionId];
        if (session.status != SessionStatus.Active || session.isPaused || session.lastHeartbeat == 0) {
            return false;
        }
        return block.timestamp > session.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD;
    }

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

    function getSession(bytes32 sessionId) external view returns (ProgressiveSession memory) {
        return sessions[sessionId];
    }

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
        _transferPayment(session.paymentToken, recipient, amount);
        emit EmergencyRelease(sessionId, amount, reason);
    }

    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet address");
        platformWallet = newWallet;
    }

    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    function emergencyWithdrawETH(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    function emergencyWithdrawToken(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(token != address(0), "Invalid token");
        IERC20(token).safeTransfer(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {}
    fallback() external payable { revert("Function not found"); }
}