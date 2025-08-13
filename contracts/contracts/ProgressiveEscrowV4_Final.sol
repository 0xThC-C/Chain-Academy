// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ProgressiveEscrowV4_Final is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant PLATFORM_FEE_PERCENT = 10;
    uint256 public constant HEARTBEAT_INTERVAL = 30;
    uint256 public constant GRACE_PERIOD = 60;
    uint256 public constant SESSION_START_TIMEOUT = 15 minutes;
    address public constant ETH_TOKEN = address(0);

    address public platformWallet;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => ProgressiveSession) public sessions;
    mapping(address => uint256) public userNonces;

    enum SessionStatus { Created, Active, Paused, Completed, Cancelled, Expired }

    struct ProgressiveSession {
        bytes32 sessionId; address student; address mentor; address paymentToken;
        uint256 totalAmount; uint256 releasedAmount; uint256 sessionDuration; uint256 startTime;
        uint256 lastHeartbeat; uint256 pausedTime; uint256 createdAt; SessionStatus status;
        bool isActive; bool isPaused; bool surveyCompleted;
    }

    event SessionCreated(bytes32 indexed sessionId, address indexed student, address indexed mentor, uint256 amount, address token);
    event SessionStarted(bytes32 indexed sessionId, uint256 startTime);
    event SessionPaused(bytes32 indexed sessionId, uint256 pausedAt, string reason);
    event SessionResumed(bytes32 indexed sessionId, uint256 resumedAt);
    event SessionCompleted(bytes32 indexed sessionId, uint256 mentorAmount, uint256 platformFee, uint256 completedAt);
    event ProgressivePaymentReleased(bytes32 indexed sessionId, uint256 amount, uint256 totalReleased, uint256 timestamp);
    event HeartbeatReceived(bytes32 indexed sessionId, uint256 timestamp);
    event TokenSupportUpdated(address token, bool supported);

    constructor(address _platformWallet) Ownable(msg.sender) {
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

    function createProgressiveSession(bytes32 sessionId, address mentor, address paymentToken, uint256 amount, uint256 durationMinutes, uint256 nonce) external payable nonReentrant whenNotPaused {
        _validateSessionCreation(sessionId, mentor, paymentToken, amount, durationMinutes, nonce);
        _handlePayment(paymentToken, amount);
        _createSession(sessionId, mentor, paymentToken, amount, durationMinutes);
    }

    function _validateSessionCreation(bytes32 sessionId, address mentor, address paymentToken, uint256 amount, uint256 durationMinutes, uint256 nonce) private view {
        require(mentor != address(0) && mentor != msg.sender, "Invalid mentor");
        require(supportedTokens[paymentToken] && amount > 0 && durationMinutes > 0, "Invalid params");
        require(sessions[sessionId].student == address(0) && nonce == userNonces[msg.sender], "Session exists or nonce");
    }

    function _handlePayment(address paymentToken, uint256 amount) private {
        userNonces[msg.sender]++;
        if (paymentToken == ETH_TOKEN) {
            require(msg.value == amount, "ETH mismatch");
        } else {
            require(msg.value == 0, "No ETH for ERC20");
            IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        }
    }

    function _createSession(bytes32 sessionId, address mentor, address paymentToken, uint256 amount, uint256 durationMinutes) private {
        ProgressiveSession storage s = sessions[sessionId];
        (s.sessionId, s.student, s.mentor, s.paymentToken) = (sessionId, msg.sender, mentor, paymentToken);
        (s.totalAmount, s.releasedAmount, s.sessionDuration, s.startTime) = (amount, 0, durationMinutes, 0);
        (s.lastHeartbeat, s.pausedTime, s.createdAt, s.status) = (0, 0, block.timestamp, SessionStatus.Created);
        (s.isActive, s.isPaused, s.surveyCompleted) = (false, false, false);
        emit SessionCreated(sessionId, msg.sender, mentor, amount, paymentToken);
    }

    function startProgressiveSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0) && s.status == SessionStatus.Created, "Session missing or started");
        require((msg.sender == s.student || msg.sender == s.mentor) && block.timestamp <= s.createdAt + SESSION_START_TIMEOUT, "Not participant or timeout");

        (s.status, s.startTime, s.lastHeartbeat, s.isActive, s.isPaused) = (SessionStatus.Active, block.timestamp, block.timestamp, true, false);
        emit SessionStarted(sessionId, block.timestamp);
    }

    function updateHeartbeat(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0) && s.status == SessionStatus.Active && (msg.sender == s.student || msg.sender == s.mentor), "Invalid session or participant");
        
        s.lastHeartbeat = block.timestamp;
        if (s.isPaused) {
            s.pausedTime += block.timestamp - s.lastHeartbeat;
            (s.isPaused, s.status) = (false, SessionStatus.Active);
            emit SessionResumed(sessionId, block.timestamp);
        }
        emit HeartbeatReceived(sessionId, block.timestamp);
    }

    function pauseSession(bytes32 sessionId) public nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0) && s.status == SessionStatus.Active && !s.isPaused, "Invalid pause");
        
        bool isParticipant = (msg.sender == s.student || msg.sender == s.mentor);
        bool isTimeout = block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD;
        require(isParticipant || isTimeout, "Unauthorized");

        (s.isPaused, s.status) = (true, SessionStatus.Paused);
        if (isParticipant && !isTimeout) s.lastHeartbeat = block.timestamp;
        emit SessionPaused(sessionId, block.timestamp, isTimeout ? "Heartbeat timeout" : "Manual pause");
    }

    function resumeSession(bytes32 sessionId) public nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0) && s.status == SessionStatus.Paused && (msg.sender == s.student || msg.sender == s.mentor), "Invalid resume");

        s.pausedTime += block.timestamp - s.lastHeartbeat;
        (s.isPaused, s.status, s.lastHeartbeat) = (false, SessionStatus.Active, block.timestamp);
        emit SessionResumed(sessionId, block.timestamp);
    }

    function releaseProgressivePayment(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        _validatePaymentRelease(s);
        
        uint256 releaseAmount = _calculateReleaseAmount(s);
        s.releasedAmount += releaseAmount;
        _executeTransfer(s.paymentToken, s.mentor, releaseAmount);
        emit ProgressivePaymentReleased(sessionId, releaseAmount, s.releasedAmount, block.timestamp);
    }

    function _validatePaymentRelease(ProgressiveSession storage s) private view {
        require(s.student != address(0) && s.status == SessionStatus.Active && s.isActive && !s.isPaused && s.startTime > 0, "Invalid release");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");
    }

    function _calculateReleaseAmount(ProgressiveSession storage s) private view returns (uint256) {
        uint256 elapsed = (block.timestamp - s.startTime + 1 minutes) / 60;
        uint256 maxRel = (s.totalAmount * 90 * elapsed) / (s.sessionDuration * 100);
        if (maxRel > (s.totalAmount * 90) / 100) maxRel = (s.totalAmount * 90) / 100;
        
        require(maxRel > s.releasedAmount, "No payment available");
        uint256 releaseAmount = maxRel - s.releasedAmount;
        require(releaseAmount > 0, "No payment");
        return releaseAmount;
    }

    function _executeTransfer(address token, address to, uint256 amount) private {
        if (token == ETH_TOKEN) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function completeSession(bytes32 sessionId, uint256 rating, string calldata) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0) && msg.sender == s.student && rating >= 1 && rating <= 5, "Invalid completion");
        require(s.status == SessionStatus.Active || s.status == SessionStatus.Paused, "Not ready");

        _finalizeSession(s);
        emit SessionCompleted(sessionId, s.totalAmount - s.releasedAmount, (s.totalAmount - s.releasedAmount) * PLATFORM_FEE_PERCENT / 100, block.timestamp);
    }

    function _finalizeSession(ProgressiveSession storage s) private {
        (s.status, s.surveyCompleted, s.isActive) = (SessionStatus.Completed, true, false);
        uint256 remaining = s.totalAmount - s.releasedAmount;
        uint256 fee = (remaining * PLATFORM_FEE_PERCENT) / 100;
        uint256 mentorAmount = remaining - fee;
        s.releasedAmount = s.totalAmount;

        if (mentorAmount > 0) _executeTransfer(s.paymentToken, s.mentor, mentorAmount);
        if (fee > 0) _executeTransfer(s.paymentToken, platformWallet, fee);
    }

    function cancelSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0) && s.status == SessionStatus.Created && (msg.sender == s.student || msg.sender == s.mentor), "Invalid cancel");

        s.status = SessionStatus.Cancelled;
        uint256 refund = s.totalAmount - s.releasedAmount;
        s.releasedAmount = s.totalAmount;
        _executeTransfer(s.paymentToken, s.student, refund);
    }

    function getSession(bytes32 sessionId) external view returns (ProgressiveSession memory) {
        return sessions[sessionId];
    }

    function getUserNonce(address user) external view returns (uint256) {
        return userNonces[user];
    }

    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
        emit TokenSupportUpdated(token, true);
    }

    function needsHeartbeat(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession storage s = sessions[sessionId];
        return (s.status == SessionStatus.Active && s.lastHeartbeat > 0 && block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL);
    }

    function shouldAutoPause(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession storage s = sessions[sessionId];
        return (s.status == SessionStatus.Active && !s.isPaused && s.lastHeartbeat > 0 && block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD);
    }

    function getAvailablePayment(bytes32 sessionId) external view returns (uint256) {
        ProgressiveSession storage s = sessions[sessionId];
        uint256 elapsed = (block.timestamp - s.startTime + 1 minutes) / 60;
        
        if (elapsed == 0 || s.status != SessionStatus.Active || !s.isActive || s.isPaused || s.sessionDuration == 0)
            return 0;

        uint256 maxRel = (s.totalAmount * 90 * elapsed) / (s.sessionDuration * 100);
        if (maxRel > (s.totalAmount * 90) / 100) maxRel = (s.totalAmount * 90) / 100;
        return maxRel > s.releasedAmount ? maxRel - s.releasedAmount : 0;
    }

    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet");
        platformWallet = newWallet;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    receive() external payable {}
    fallback() external payable { revert("Function not found"); }
}