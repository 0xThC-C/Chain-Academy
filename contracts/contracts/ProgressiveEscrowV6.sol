// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ProgressiveEscrowV6 is Ownable, Pausable, ReentrancyGuard {
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

    // Optimization: Struct for validation parameters to reduce stack depth
    struct ValidationParams {
        bytes32 sessionId;
        address mentor;
        address paymentToken;
        uint256 amount;
        uint256 durationMinutes;
        uint256 nonce;
    }

    // Optimization: Struct for payment calculation parameters
    struct PaymentParams {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 sessionDuration;
        uint256 elapsedMinutes;
        uint256 maxReleasable;
        uint256 releaseAmount;
    }

    // Optimization: Struct for time calculation parameters
    struct TimeParams {
        uint256 startTime;
        uint256 currentTime;
        uint256 totalTime;
        uint256 pausedTime;
        uint256 elapsedTime;
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

    function _autoEnableTokens() private {
        uint256 cId = block.chainid;
        
        // Optimization: Use scoped blocks to limit variable lifetime
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
        // Optimization: Use struct to group parameters
        ValidationParams memory params = ValidationParams({
            sessionId: sessionId,
            mentor: mentor,
            paymentToken: paymentToken,
            amount: amount,
            durationMinutes: durationMinutes,
            nonce: nonce
        });
        
        _validateSessionInputs(params);
        _handleSessionPayment(params.paymentToken, params.amount);
        _initializeSession(params);
    }

    // Optimization: Split validation into smaller function with struct parameter
    function _validateSessionInputs(ValidationParams memory params) private view {
        require(params.mentor != address(0) && params.mentor != msg.sender, "Invalid mentor");
        require(supportedTokens[params.paymentToken], "Unsupported token");
        require(params.amount > 0 && params.durationMinutes > 0, "Invalid amounts");
        require(sessions[params.sessionId].student == address(0), "Session exists");
        require(params.nonce == userNonces[msg.sender], "Invalid nonce");
        require(!usedSessionIds[params.sessionId], "Session ID used");
    }

    function _handleSessionPayment(address paymentToken, uint256 amount) private {
        userNonces[msg.sender]++;
        
        if (paymentToken == ETH_TOKEN) {
            require(msg.value == amount, "ETH mismatch");
        } else {
            require(msg.value == 0, "No ETH for ERC20");
            IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        }
    }

    // Optimization: Use struct parameter to reduce function parameters
    function _initializeSession(ValidationParams memory params) private {
        usedSessionIds[params.sessionId] = true;
        
        // Optimization: Use storage reference for direct assignment
        ProgressiveSession storage s = sessions[params.sessionId];
        s.sessionId = params.sessionId;
        s.student = msg.sender;
        s.mentor = params.mentor;
        s.paymentToken = params.paymentToken;
        s.totalAmount = params.amount;
        s.releasedAmount = 0;
        s.sessionDuration = params.durationMinutes;
        s.startTime = 0;
        s.lastHeartbeat = 0;
        s.pausedTime = 0;
        s.createdAt = block.timestamp;
        s.status = SessionStatus.Created;
        s.isActive = false;
        s.isPaused = false;
        s.surveyCompleted = false;
        
        emit SessionCreated(params.sessionId, msg.sender, params.mentor, params.amount, params.paymentToken);
    }

    function startProgressiveSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Created, "Already started");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");
        require(block.timestamp <= s.createdAt + SESSION_START_TIMEOUT, "Timeout exceeded");

        // Optimization: Group state changes together
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
        _doTransfer(s.paymentToken, s.student, s.totalAmount);
        emit SessionExpired(sessionId, s.totalAmount);
    }

    function releaseProgressivePayment(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active, "Not active");
        require(s.isActive && !s.isPaused, "Not running");
        require(s.startTime > 0, "Not started");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");

        // Optimization: Use struct for payment calculations to reduce stack depth
        PaymentParams memory paymentData;
        paymentData.totalAmount = s.totalAmount;
        paymentData.releasedAmount = s.releasedAmount;
        paymentData.sessionDuration = s.sessionDuration;
        paymentData.elapsedMinutes = _computeElapsed(sessionId);
        
        // Calculate maximum releasable amount (90% of total)
        paymentData.maxReleasable = (paymentData.totalAmount * 90) / 100;
        
        // Calculate progressive release based on elapsed time
        {
            uint256 progressiveMax = (paymentData.totalAmount * 90 * paymentData.elapsedMinutes) / (paymentData.sessionDuration * 100);
            if (progressiveMax > paymentData.maxReleasable) {
                progressiveMax = paymentData.maxReleasable;
            }
            
            require(progressiveMax > paymentData.releasedAmount, "No payment available");
            paymentData.releaseAmount = progressiveMax - paymentData.releasedAmount;
            require(paymentData.releaseAmount > 0, "No payment");
        }

        s.releasedAmount += paymentData.releaseAmount;
        _doTransfer(s.paymentToken, s.mentor, paymentData.releaseAmount);
        emit ProgressivePaymentReleased(sessionId, paymentData.releaseAmount, s.releasedAmount, block.timestamp);
    }

    function updateHeartbeat(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active, "Not active");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");
        
        s.lastHeartbeat = block.timestamp;
        
        if (s.isPaused) {
            require(s.status == SessionStatus.Paused, "Not paused");
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
        require(s.status == SessionStatus.Active, "Not active");
        require(!s.isPaused, "Already paused");
        
        // Optimization: Use scoped block for conditional logic
        {
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

    function completeSession(
        bytes32 sessionId,
        uint256 rating,
        string calldata
    ) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(msg.sender == s.student, "Only student");
        require(s.status == SessionStatus.Active || s.status == SessionStatus.Paused, "Not ready");
        require(rating >= 1 && rating <= 5, "Invalid rating");

        _finalizeSession(sessionId);
    }

    // Optimization: Split finalization logic to reduce stack depth
    function _finalizeSession(bytes32 sessionId) private {
        ProgressiveSession storage s = sessions[sessionId];
        
        // Update session state
        s.status = SessionStatus.Completed;
        s.surveyCompleted = true;
        s.isActive = false;
        
        // Calculate and distribute remaining funds
        _distributeRemainingFunds(sessionId);
    }

    // Optimization: Separate function for fund distribution
    function _distributeRemainingFunds(bytes32 sessionId) private {
        ProgressiveSession storage s = sessions[sessionId];
        uint256 remaining = s.totalAmount - s.releasedAmount;
        
        if (remaining > 0) {
            uint256 fee = (remaining * PLATFORM_FEE_PERCENT) / 100;
            uint256 mentorAmount = remaining - fee;
            
            s.releasedAmount = s.totalAmount;
            
            if (mentorAmount > 0) {
                _doTransfer(s.paymentToken, s.mentor, mentorAmount);
            }
            if (fee > 0) {
                _doTransfer(s.paymentToken, platformWallet, fee);
            }
            
            emit SessionCompleted(sessionId, mentorAmount, fee, block.timestamp);
        } else {
            emit SessionCompleted(sessionId, 0, 0, block.timestamp);
        }
    }

    function autoCompleteSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active || s.status == SessionStatus.Paused, "Not eligible");
        require(block.timestamp >= s.createdAt + AUTO_RELEASE_DELAY, "Too early");

        _finalizeSession(sessionId);
    }

    function cancelSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Created, "Already started");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");

        s.status = SessionStatus.Cancelled;
        uint256 refund = s.totalAmount - s.releasedAmount;
        s.releasedAmount = s.totalAmount;

        _doTransfer(s.paymentToken, s.student, refund);
        emit SessionCancelled(sessionId, refund, block.timestamp);
    }

    function _doTransfer(address token, address to, uint256 amount) internal {
        require(to != address(0), "Invalid transfer");
        
        if (token == ETH_TOKEN) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // Optimization: Simplified computation function
    function _computeMaxRelease(uint256 total, uint256 elapsed, uint256 duration) internal pure returns (uint256) {
        if (elapsed == 0 || duration == 0) return 0;
        
        uint256 maxRel = (total * 90 * elapsed) / (duration * 100);
        uint256 releasable = (total * 90) / 100;
        
        return maxRel > releasable ? releasable : maxRel;
    }

    // Optimization: Use struct for time calculations
    function _computeElapsed(bytes32 sessionId) internal view returns (uint256) {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.startTime > 0, "Not started");
        
        TimeParams memory timeData;
        timeData.startTime = s.startTime;
        timeData.currentTime = block.timestamp;
        timeData.totalTime = timeData.currentTime - timeData.startTime;
        timeData.pausedTime = s.pausedTime;
        
        if (s.isPaused && s.lastHeartbeat > 0) {
            timeData.pausedTime += timeData.currentTime - s.lastHeartbeat;
        }
        
        if (timeData.totalTime <= timeData.pausedTime) {
            return 0;
        }
        
        return (timeData.totalTime - timeData.pausedTime) / 60;
    }

    function calculateMaxRelease(uint256 totalAmount, uint256 elapsedMinutes, uint256 durationMinutes) public pure returns (uint256) {
        return _computeMaxRelease(totalAmount, elapsedMinutes, durationMinutes);
    }

    function getEffectiveElapsedTime(bytes32 sessionId) public view returns (uint256) {
        return _computeElapsed(sessionId);
    }

    function needsHeartbeat(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession storage s = sessions[sessionId];
        return (s.status == SessionStatus.Active && s.lastHeartbeat > 0 && block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL);
    }

    function shouldAutoPause(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession storage s = sessions[sessionId];
        return (s.status == SessionStatus.Active && !s.isPaused && s.lastHeartbeat > 0 && block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD);
    }

    // Optimization: Rewrite with reduced variable count
    function getAvailablePayment(bytes32 sessionId) external view returns (uint256) {
        ProgressiveSession storage s = sessions[sessionId];
        
        if (s.status != SessionStatus.Active || s.isPaused || s.startTime == 0) {
            return 0;
        }
        
        // Use scoped calculations to minimize stack usage
        uint256 elapsedMinutes;
        {
            uint256 totalTime = block.timestamp - s.startTime;
            uint256 pausedTime = s.pausedTime;
            
            if (s.isPaused && s.lastHeartbeat > 0) {
                pausedTime += block.timestamp - s.lastHeartbeat;
            }
            
            if (totalTime <= pausedTime) {
                return 0;
            }
            
            elapsedMinutes = (totalTime - pausedTime) / 60;
        }
        
        if (elapsedMinutes == 0 || s.sessionDuration == 0) {
            return 0;
        }
        
        uint256 maxRel = (s.totalAmount * 90 * elapsedMinutes) / (s.sessionDuration * 100);
        uint256 releasable = (s.totalAmount * 90) / 100;
        
        if (maxRel > releasable) {
            maxRel = releasable;
        }
        
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
        _doTransfer(s.paymentToken, recipient, amount);
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

    function pause() external onlyOwner { 
        _pause(); 
    }
    
    function unpause() external onlyOwner { 
        _unpause(); 
    }

    receive() external payable {}
    
    fallback() external payable { 
        revert("Function not found"); 
    }
}