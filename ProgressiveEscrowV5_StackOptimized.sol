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
        supportedTokens[ETH_TOKEN] = true;
        _autoEnableTokens();
        emit TokenSupportUpdated(ETH_TOKEN, true);
    }

    function _autoEnableTokens() private {
        uint256 cId = block.chainid;
        if (cId == 42161) {
            supportedTokens[0xaf88d065e77c8cC2239327C5EDb3A432268e5831] = true;
            supportedTokens[0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9] = true;
        } else if (cId == 8453) {
            supportedTokens[0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913] = true;
            supportedTokens[0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2] = true;
        } else if (cId == 10) {
            supportedTokens[0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85] = true;
            supportedTokens[0x94b008aA00579c1307B0EF2c499aD98a8ce58e58] = true;
        } else if (cId == 137) {
            supportedTokens[0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174] = true;
            supportedTokens[0xc2132D05D31c914a87C6611C10748AEb04B58e8F] = true;
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
        // Basic validations
        require(mentor != address(0) && mentor != msg.sender, "Invalid mentor");
        require(supportedTokens[paymentToken], "Unsupported token");
        require(amount > 0 && durationMinutes > 0, "Invalid amounts");
        require(sessions[sessionId].student == address(0), "Session exists");
        require(nonce == userNonces[msg.sender], "Invalid nonce");
        require(!usedSessionIds[sessionId], "Session ID used");
        
        // Update state
        userNonces[msg.sender]++;
        usedSessionIds[sessionId] = true;

        // Handle payment
        if (paymentToken == ETH_TOKEN) {
            require(msg.value == amount, "ETH mismatch");
        } else {
            require(msg.value == 0, "No ETH for ERC20");
            IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        }

        // Create session
        ProgressiveSession storage newSession = sessions[sessionId];
        newSession.sessionId = sessionId;
        newSession.student = msg.sender;
        newSession.mentor = mentor;
        newSession.paymentToken = paymentToken;
        newSession.totalAmount = amount;
        newSession.releasedAmount = 0;
        newSession.sessionDuration = durationMinutes;
        newSession.startTime = 0;
        newSession.lastHeartbeat = 0;
        newSession.pausedTime = 0;
        newSession.createdAt = block.timestamp;
        newSession.status = SessionStatus.Created;
        newSession.isActive = false;
        newSession.isPaused = false;
        newSession.surveyCompleted = false;

        emit SessionCreated(sessionId, msg.sender, mentor, amount, paymentToken);
    }

    function startProgressiveSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Created, "Already started");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");
        require(block.timestamp <= s.createdAt + SESSION_START_TIMEOUT, "Timeout exceeded");

        s.status = SessionStatus.Active;
        s.startTime = block.timestamp;
        s.lastHeartbeat = block.timestamp;
        s.isActive = true;
        s.isPaused = false;

        emit SessionStarted(sessionId, block.timestamp);
    }

    function checkAndExpireSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Created, "Already started");
        require(block.timestamp > s.createdAt + SESSION_START_TIMEOUT, "Not expired");

        s.status = SessionStatus.Expired;
        _transferPayment(s.paymentToken, s.student, s.totalAmount);
        emit SessionExpired(sessionId, s.totalAmount);
    }

    function releaseProgressivePayment(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active, "Not active");
        require(s.isActive && !s.isPaused, "Not running");
        require(s.startTime > 0, "Not started");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");

        // Calculate release amount using iterative approach
        uint256 elapsed = _getElapsed(sessionId);
        uint256 maxRelease = _calcMaxRelease(s.totalAmount, elapsed, s.sessionDuration);
        require(maxRelease > s.releasedAmount, "No payment available");

        uint256 releaseAmount = maxRelease - s.releasedAmount;
        uint256 maxBefore = (s.totalAmount * 90) / 100;
        
        if (s.releasedAmount + releaseAmount > maxBefore) {
            releaseAmount = maxBefore - s.releasedAmount;
        }
        
        require(releaseAmount > 0, "No payment");

        s.releasedAmount += releaseAmount;
        _transferPayment(s.paymentToken, s.mentor, releaseAmount);
        emit ProgressivePaymentReleased(sessionId, releaseAmount, s.releasedAmount, block.timestamp);
    }

    function updateHeartbeat(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active, "Not active");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");

        s.lastHeartbeat = block.timestamp;
        
        if (s.isPaused) {
            resumeSession(sessionId);
        }

        emit HeartbeatReceived(sessionId, block.timestamp);
    }

    function pauseSession(bytes32 sessionId) public nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active, "Not active");
        require(!s.isPaused, "Already paused");
        
        bool isParticipant = (msg.sender == s.student || msg.sender == s.mentor);
        bool isTimeout = block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD;
        
        require(isParticipant || isTimeout, "Unauthorized");

        s.isPaused = true;
        s.status = SessionStatus.Paused;
        
        if (isParticipant && !isTimeout) {
            s.lastHeartbeat = block.timestamp;
        }
        
        emit SessionPaused(sessionId, block.timestamp, isTimeout ? "Heartbeat timeout" : "Manual pause");
    }

    function resumeSession(bytes32 sessionId) public nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Paused, "Not paused");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");

        uint256 pauseDuration = block.timestamp - s.lastHeartbeat;
        s.pausedTime += pauseDuration;
        s.isPaused = false;
        s.status = SessionStatus.Active;
        s.lastHeartbeat = block.timestamp;

        emit SessionResumed(sessionId, block.timestamp);
    }

    function completeSession(
        bytes32 sessionId,
        uint256 rating,
        string calldata feedback
    ) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(msg.sender == s.student, "Only student");
        require(s.status == SessionStatus.Active || s.status == SessionStatus.Paused, "Not ready");
        require(rating >= 1 && rating <= 5, "Invalid rating");

        s.status = SessionStatus.Completed;
        s.surveyCompleted = true;
        s.isActive = false;

        uint256 remaining = s.totalAmount - s.releasedAmount;
        uint256 fee = (remaining * PLATFORM_FEE_PERCENT) / 100;
        uint256 mentorAmount = remaining - fee;

        s.releasedAmount = s.totalAmount;

        if (mentorAmount > 0) {
            _transferPayment(s.paymentToken, s.mentor, mentorAmount);
        }
        if (fee > 0) {
            _transferPayment(s.paymentToken, platformWallet, fee);
        }

        emit SessionCompleted(sessionId, mentorAmount, fee, block.timestamp);
    }

    function autoCompleteSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active || s.status == SessionStatus.Paused, "Not eligible");
        require(block.timestamp >= s.createdAt + AUTO_RELEASE_DELAY, "Too early");

        s.status = SessionStatus.Completed;
        s.isActive = false;

        uint256 remaining = s.totalAmount - s.releasedAmount;
        uint256 fee = (remaining * PLATFORM_FEE_PERCENT) / 100;
        uint256 mentorAmount = remaining - fee;

        s.releasedAmount = s.totalAmount;

        if (mentorAmount > 0) {
            _transferPayment(s.paymentToken, s.mentor, mentorAmount);
        }
        if (fee > 0) {
            _transferPayment(s.paymentToken, platformWallet, fee);
        }

        emit SessionCompleted(sessionId, mentorAmount, fee, block.timestamp);
    }

    function cancelSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Created, "Already started");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");

        s.status = SessionStatus.Cancelled;
        uint256 refund = s.totalAmount - s.releasedAmount;
        s.releasedAmount = s.totalAmount;

        _transferPayment(s.paymentToken, s.student, refund);
        emit SessionCancelled(sessionId, refund, block.timestamp);
    }

    function _transferPayment(address token, address to, uint256 amount) internal {
        require(to != address(0) && amount > 0, "Invalid transfer");
        
        if (token == ETH_TOKEN) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // Iterative calculation instead of recursive
    function _calcMaxRelease(uint256 total, uint256 elapsed, uint256 duration) internal pure returns (uint256) {
        if (elapsed == 0 || duration == 0) return 0;
        
        uint256 releasable = (total * 90) / 100;
        uint256 maxRel = (releasable * elapsed) / duration;
        
        return maxRel > releasable ? releasable : maxRel;
    }

    function _getElapsed(bytes32 sessionId) internal view returns (uint256) {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.startTime > 0, "Not started");
        
        uint256 totalTime = block.timestamp - s.startTime;
        uint256 pausedTime = s.pausedTime;
        
        if (s.isPaused && s.lastHeartbeat > 0) {
            pausedTime += block.timestamp - s.lastHeartbeat;
        }
        
        if (totalTime <= pausedTime) return 0;
        return (totalTime - pausedTime) / 60;
    }

    // Public view functions
    function calculateMaxRelease(uint256 totalAmount, uint256 elapsedMinutes, uint256 durationMinutes) public pure returns (uint256) {
        return _calcMaxRelease(totalAmount, elapsedMinutes, durationMinutes);
    }

    function getEffectiveElapsedTime(bytes32 sessionId) public view returns (uint256) {
        return _getElapsed(sessionId);
    }

    function needsHeartbeat(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession storage s = sessions[sessionId];
        return (s.status == SessionStatus.Active && s.lastHeartbeat > 0 && 
                block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL);
    }

    function shouldAutoPause(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession storage s = sessions[sessionId];
        return (s.status == SessionStatus.Active && !s.isPaused && s.lastHeartbeat > 0 && 
                block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD);
    }

    function getAvailablePayment(bytes32 sessionId) external view returns (uint256) {
        ProgressiveSession storage s = sessions[sessionId];
        if (s.status != SessionStatus.Active || s.isPaused || s.startTime == 0) return 0;
        
        uint256 elapsed = _getElapsed(sessionId);
        uint256 maxRel = _calcMaxRelease(s.totalAmount, elapsed, s.sessionDuration);
        
        return maxRel > s.releasedAmount ? maxRel - s.releasedAmount : 0;
    }

    function getSession(bytes32 sessionId) external view returns (ProgressiveSession memory) {
        return sessions[sessionId];
    }

    function emergencyRelease(bytes32 sessionId, address recipient, uint256 amount, string calldata reason) external onlyOwner nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(recipient != address(0), "Invalid recipient");
        require(amount <= s.totalAmount - s.releasedAmount, "Exceeds available");

        s.releasedAmount += amount;
        _transferPayment(s.paymentToken, recipient, amount);
        emit EmergencyRelease(sessionId, amount, reason);
    }

    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet");
        platformWallet = newWallet;
    }

    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    function emergencyWithdrawETH(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
    }

    function emergencyWithdrawToken(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0) && token != address(0), "Invalid params");
        IERC20(token).safeTransfer(to, amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    receive() external payable {}
    fallback() external payable { revert("Function not found"); }
}