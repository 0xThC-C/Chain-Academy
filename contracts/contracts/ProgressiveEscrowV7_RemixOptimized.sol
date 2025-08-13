// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProgressiveEscrowV7 - REMIX OPTIMIZED
 * @dev Ultra-optimized for Remix IDE compilation - eliminates ALL stack too deep errors
 * IMPORTANT: Configure Remix with: viaIR: true, optimizer enabled, runs: 100
 */
contract ProgressiveEscrowV7 is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant PLATFORM_FEE_PERCENT = 10;
    uint256 public constant HEARTBEAT_INTERVAL = 30;
    uint256 public constant GRACE_PERIOD = 60;
    uint256 public constant AUTO_RELEASE_DELAY = 7 days;
    uint256 public constant SESSION_START_TIMEOUT = 15 minutes;
    address public constant ETH_TOKEN = address(0);

    // State variables
    address public platformWallet;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => ProgressiveSession) public sessions;
    mapping(address => uint256) public userNonces;
    mapping(bytes32 => bool) public usedSessionIds;

    enum SessionStatus { Created, Active, Paused, Completed, Cancelled, Expired }

    // REMIX OPTIMIZATION: Reduced struct size to minimize memory footprint
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

    // REMIX OPTIMIZATION: Small structs for grouping parameters (max 8 fields each)
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

    // Events
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

    constructor(address _platformWallet) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
        supportedTokens[ETH_TOKEN] = true;
        _autoEnableTokens();
        emit TokenSupportUpdated(ETH_TOKEN, true);
    }

    // REMIX OPTIMIZATION: Minimal function with direct assignments
    function _autoEnableTokens() private {
        uint256 cId = block.chainid;
        
        if (cId == 42161) { // Arbitrum
            supportedTokens[0xaf88d065e77c8cC2239327C5EDb3A432268e5831] = true;
            supportedTokens[0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9] = true;
        } else if (cId == 8453) { // Base  
            supportedTokens[0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913] = true;
            supportedTokens[0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2] = true;
        } else if (cId == 10) { // Optimism
            supportedTokens[0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85] = true;
            supportedTokens[0x94b008aA00579c1307B0EF2c499aD98a8ce58e58] = true;
        } else if (cId == 137) { // Polygon
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

    // REMIX OPTIMIZATION: Single parameter struct to avoid parameter limit
    function createProgressiveSession(
        bytes32 sessionId,
        address mentor,
        address paymentToken,
        uint256 amount,
        uint256 durationMinutes,
        uint256 nonce
    ) external payable nonReentrant whenNotPaused {
        
        // Create struct within function to minimize stack usage
        CreateParams memory p = CreateParams(sessionId, mentor, paymentToken, amount, durationMinutes, nonce);
        
        // All validations in single block
        {
            require(p.mentor != address(0) && p.mentor != msg.sender, "Invalid mentor");
            require(supportedTokens[p.paymentToken], "Unsupported token");
            require(p.amount > 0 && p.durationMinutes > 0, "Invalid amounts");
            require(sessions[p.sessionId].student == address(0), "Session exists");
            require(p.nonce == userNonces[msg.sender], "Invalid nonce");
            require(!usedSessionIds[p.sessionId], "Session ID used");
        }
        
        // Handle payment in separate block
        {
            userNonces[msg.sender]++;
            if (p.paymentToken == ETH_TOKEN) {
                require(msg.value == p.amount, "ETH mismatch");
            } else {
                require(msg.value == 0, "No ETH for ERC20");
                IERC20(p.paymentToken).safeTransferFrom(msg.sender, address(this), p.amount);
            }
        }
        
        // Initialize session
        _initSession(p);
    }

    // REMIX OPTIMIZATION: Separate initialization to reduce main function complexity
    function _initSession(CreateParams memory p) private {
        usedSessionIds[p.sessionId] = true;
        
        ProgressiveSession storage s = sessions[p.sessionId];
        s.sessionId = p.sessionId;
        s.student = msg.sender;
        s.mentor = p.mentor;
        s.paymentToken = p.paymentToken;
        s.totalAmount = p.amount;
        s.sessionDuration = p.durationMinutes;
        s.createdAt = block.timestamp;
        s.status = SessionStatus.Created;
        
        emit SessionCreated(p.sessionId, msg.sender, p.mentor, p.amount, p.paymentToken);
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

        emit SessionStarted(sessionId, block.timestamp);
    }

    function checkAndExpireSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Created, "Already started");
        require(block.timestamp > s.createdAt + SESSION_START_TIMEOUT, "Not expired");

        s.status = SessionStatus.Expired;
        _transfer(s.paymentToken, s.student, s.totalAmount);
        emit SessionExpired(sessionId, s.totalAmount);
    }

    // REMIX OPTIMIZATION: Ultra-simplified payment release
    function releaseProgressivePayment(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active && s.isActive && !s.isPaused, "Not active");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");

        uint256 releaseAmount;
        
        // Single scoped block for all calculations
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

    function updateHeartbeat(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active, "Not active");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");
        
        s.lastHeartbeat = block.timestamp;
        
        if (s.isPaused) {
            s.pausedTime += block.timestamp - s.lastHeartbeat;
            s.isPaused = false;
            s.status = SessionStatus.Active;
            emit SessionResumed(sessionId, block.timestamp);
        }
        
        emit HeartbeatReceived(sessionId, block.timestamp);
    }

    function pauseSession(bytes32 sessionId) public nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active && !s.isPaused, "Cannot pause");
        
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

        s.pausedTime += block.timestamp - s.lastHeartbeat;
        s.isPaused = false;
        s.status = SessionStatus.Active;
        s.lastHeartbeat = block.timestamp;

        emit SessionResumed(sessionId, block.timestamp);
    }

    function completeSession(bytes32 sessionId, uint256 rating, string calldata) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(msg.sender == s.student, "Only student");
        require(s.status == SessionStatus.Active || s.status == SessionStatus.Paused, "Not ready");
        require(rating >= 1 && rating <= 5, "Invalid rating");

        _finalize(sessionId);
    }

    function autoCompleteSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active || s.status == SessionStatus.Paused, "Not eligible");
        require(block.timestamp >= s.createdAt + AUTO_RELEASE_DELAY, "Too early");

        _finalize(sessionId);
    }

    // REMIX OPTIMIZATION: Minimal finalization function
    function _finalize(bytes32 sessionId) private {
        ProgressiveSession storage s = sessions[sessionId];
        s.status = SessionStatus.Completed;
        s.surveyCompleted = true;
        s.isActive = false;
        
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

    function cancelSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Created, "Already started");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");

        s.status = SessionStatus.Cancelled;
        uint256 refund = s.totalAmount - s.releasedAmount;
        s.releasedAmount = s.totalAmount;

        _transfer(s.paymentToken, s.student, refund);
        emit SessionCancelled(sessionId, refund, block.timestamp);
    }

    // REMIX OPTIMIZATION: Simplified transfer function
    function _transfer(address token, address to, uint256 amount) internal {
        if (token == ETH_TOKEN) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // REMIX OPTIMIZATION: Single calculation function with minimal variables
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

    // Public/External view functions
    function calculateMaxRelease(uint256 totalAmount, uint256 elapsedMinutes, uint256 durationMinutes) public pure returns (uint256) {
        if (elapsedMinutes == 0 || durationMinutes == 0) return 0;
        uint256 maxRel = (totalAmount * 90 * elapsedMinutes) / (durationMinutes * 100);
        return maxRel > (totalAmount * 90) / 100 ? (totalAmount * 90) / 100 : maxRel;
    }

    function getEffectiveElapsedTime(bytes32 sessionId) public view returns (uint256) {
        return _getElapsed(sessionId);
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
        
        if (s.status != SessionStatus.Active || s.isPaused || s.startTime == 0) return 0;
        
        uint256 elapsed = _getElapsed(sessionId);
        if (elapsed == 0 || s.sessionDuration == 0) return 0;
        
        uint256 maxRel = (s.totalAmount * 90 * elapsed) / (s.sessionDuration * 100);
        uint256 releasable = (s.totalAmount * 90) / 100;
        
        if (maxRel > releasable) maxRel = releasable;
        return maxRel > s.releasedAmount ? maxRel - s.releasedAmount : 0;
    }

    function getSession(bytes32 sessionId) external view returns (ProgressiveSession memory) {
        return sessions[sessionId];
    }

    // Admin functions
    function emergencyRelease(bytes32 sessionId, address recipient, uint256 amount, string calldata reason) external onlyOwner nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(recipient != address(0), "Invalid recipient");
        require(amount <= s.totalAmount - s.releasedAmount, "Exceeds available");

        s.releasedAmount += amount;
        _transfer(s.paymentToken, recipient, amount);
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
        require(to != address(0) && amount <= address(this).balance, "Invalid");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Failed");
    }

    function emergencyWithdrawToken(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0) && token != address(0), "Invalid");
        IERC20(token).safeTransfer(to, amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    receive() external payable {}
    fallback() external payable { revert("Function not found"); }
}