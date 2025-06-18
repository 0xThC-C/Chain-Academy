const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ProgressiveEscrowV3", function () {
  let progressiveEscrow;
  let mockToken;
  let owner;
  let student;
  let mentor;
  let platformWallet;
  let addrs;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const SESSION_AMOUNT = ethers.parseEther("100");
  const SESSION_DURATION = 60; // 60 minutes
  const PLATFORM_FEE_PERCENT = 10;

  beforeEach(async function () {
    [owner, student, mentor, platformWallet, ...addrs] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock USDC", "USDC", 6);

    // Mint initial supply to owner
    await mockToken.mint(owner.address, INITIAL_SUPPLY);

    // Deploy ProgressiveEscrowV3
    const ProgressiveEscrowV3 = await ethers.getContractFactory("ProgressiveEscrowV3");
    progressiveEscrow = await ProgressiveEscrowV3.deploy(platformWallet.address);

    // Add mock token as supported
    await progressiveEscrow.addSupportedToken(mockToken.target);

    // Transfer tokens to student
    await mockToken.transfer(student.address, SESSION_AMOUNT * 2n);
    
    // Approve spending
    await mockToken.connect(student).approve(progressiveEscrow.target, SESSION_AMOUNT * 2n);
  });

  describe("Deployment", function () {
    it("Should set the right platform wallet", async function () {
      expect(await progressiveEscrow.platformWallet()).to.equal(platformWallet.address);
    });

    it("Should set the right platform fee percentage", async function () {
      expect(await progressiveEscrow.PLATFORM_FEE_PERCENT()).to.equal(PLATFORM_FEE_PERCENT);
    });

    it("Should set the right constants", async function () {
      expect(await progressiveEscrow.HEARTBEAT_INTERVAL()).to.equal(30);
      expect(await progressiveEscrow.GRACE_PERIOD()).to.equal(120);
      expect(await progressiveEscrow.PROGRESSIVE_RELEASE_INTERVAL()).to.equal(180);
    });
  });

  describe("Session Creation", function () {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-1"));

    it("Should create a progressive session successfully", async function () {
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      
      await expect(
        progressiveEscrow.connect(student).createProgressiveSession(
          sessionId,
          mentor.address,
          mockToken.target,
          SESSION_AMOUNT,
          SESSION_DURATION,
          nonce
        )
      ).to.emit(progressiveEscrow, "SessionCreated")
       .withArgs(sessionId, student.address, mentor.address, SESSION_AMOUNT, mockToken.target);

      const session = await progressiveEscrow.getSession(sessionId);
      expect(session.student).to.equal(student.address);
      expect(session.mentor).to.equal(mentor.address);
      expect(session.totalAmount).to.equal(SESSION_AMOUNT);
      expect(session.sessionDuration).to.equal(SESSION_DURATION);
      expect(session.status).to.equal(0); // Created
    });

    it("Should prevent self-mentoring", async function () {
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      
      await expect(
        progressiveEscrow.connect(student).createProgressiveSession(
          sessionId,
          student.address, // Same as sender
          mockToken.target,
          SESSION_AMOUNT,
          SESSION_DURATION,
          nonce
        )
      ).to.be.revertedWith("Cannot mentor yourself");
    });

    it("Should prevent duplicate session IDs", async function () {
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      
      // First session
      await progressiveEscrow.connect(student).createProgressiveSession(
        sessionId,
        mentor.address,
        mockToken.target,
        SESSION_AMOUNT,
        SESSION_DURATION,
        nonce
      );

      const newNonce = await progressiveEscrow.getUserNonce(student.address);
      
      // Second session with same ID should fail
      await expect(
        progressiveEscrow.connect(student).createProgressiveSession(
          sessionId,
          mentor.address,
          mockToken.target,
          SESSION_AMOUNT,
          SESSION_DURATION,
          newNonce
        )
      ).to.be.revertedWith("Session already exists");
    });

    it("Should handle nonce replay protection", async function () {
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      
      // First transaction
      await progressiveEscrow.connect(student).createProgressiveSession(
        sessionId,
        mentor.address,
        mockToken.target,
        SESSION_AMOUNT,
        SESSION_DURATION,
        nonce
      );

      const sessionId2 = ethers.keccak256(ethers.toUtf8Bytes("test-session-2"));
      
      // Replay with same nonce should fail
      await expect(
        progressiveEscrow.connect(student).createProgressiveSession(
          sessionId2,
          mentor.address,
          mockToken.target,
          SESSION_AMOUNT,
          SESSION_DURATION,
          nonce // Same nonce
        )
      ).to.be.revertedWith("Invalid nonce");
    });
  });

  describe("Progressive Session Management", function () {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-1"));

    beforeEach(async function () {
      // Create a session
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      await progressiveEscrow.connect(student).createProgressiveSession(
        sessionId,
        mentor.address,
        mockToken.target,
        SESSION_AMOUNT,
        SESSION_DURATION,
        nonce
      );
    });

    it("Should start a progressive session", async function () {
      await expect(
        progressiveEscrow.connect(student).startProgressiveSession(sessionId)
      ).to.emit(progressiveEscrow, "SessionStarted");

      const session = await progressiveEscrow.getSession(sessionId);
      expect(session.status).to.equal(1); // Active
      expect(session.isActive).to.be.true;
      expect(session.isPaused).to.be.false;
      expect(session.startTime).to.be.greaterThan(0);
    });

    it("Should allow mentor to start session", async function () {
      await expect(
        progressiveEscrow.connect(mentor).startProgressiveSession(sessionId)
      ).to.emit(progressiveEscrow, "SessionStarted");

      const session = await progressiveEscrow.getSession(sessionId);
      expect(session.status).to.equal(1); // Active
    });

    it("Should prevent unauthorized users from starting session", async function () {
      await expect(
        progressiveEscrow.connect(addrs[0]).startProgressiveSession(sessionId)
      ).to.be.revertedWith("Only session participants can start");
    });

    it("Should prevent starting an already started session", async function () {
      await progressiveEscrow.connect(student).startProgressiveSession(sessionId);
      
      await expect(
        progressiveEscrow.connect(student).startProgressiveSession(sessionId)
      ).to.be.revertedWith("Session already started or completed");
    });
  });

  describe("Progressive Payment Release", function () {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-1"));

    beforeEach(async function () {
      // Create and start a session
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      await progressiveEscrow.connect(student).createProgressiveSession(
        sessionId,
        mentor.address,
        mockToken.target,
        SESSION_AMOUNT,
        SESSION_DURATION,
        nonce
      );
      await progressiveEscrow.connect(student).startProgressiveSession(sessionId);
    });

    it("Should calculate progressive payment correctly", async function () {
      // Fast forward 30 minutes (50% of session)
      await time.increase(30 * 60);

      const elapsedTime = await progressiveEscrow.getEffectiveElapsedTime(sessionId);
      expect(elapsedTime).to.be.closeTo(30, 1); // ~30 minutes

      // Should release ~45% of total (90% * 50% time progress)
      const maxRelease = await progressiveEscrow.calculateMaxRelease(SESSION_AMOUNT, 30, SESSION_DURATION);
      const expected = (SESSION_AMOUNT * 90n * 30n) / (100n * 60n); // 90% * (30/60)
      expect(maxRelease).to.equal(expected);
    });

    it("Should release progressive payment", async function () {
      // Fast forward 18 minutes (30% of session)
      await time.increase(18 * 60);

      const mentorBalanceBefore = await mockToken.balanceOf(mentor.address);
      
      await expect(
        progressiveEscrow.connect(student).releaseProgressivePayment(sessionId)
      ).to.emit(progressiveEscrow, "ProgressivePaymentReleased");

      const mentorBalanceAfter = await mockToken.balanceOf(mentor.address);
      expect(mentorBalanceAfter).to.be.greaterThan(mentorBalanceBefore);

      const session = await progressiveEscrow.getSession(sessionId);
      expect(session.releasedAmount).to.be.greaterThan(0);
    });

    it("Should prevent releasing more than available", async function () {
      // Fast forward 18 minutes (30% of session)
      await time.increase(18 * 60);

      // Release available payment
      await progressiveEscrow.connect(student).releaseProgressivePayment(sessionId);

      // Immediately try to release again (no additional time passed)
      await expect(
        progressiveEscrow.connect(student).releaseProgressivePayment(sessionId)
      ).to.be.revertedWith("No payment available for release");
    });

    it("Should cap release at 90% before completion", async function () {
      // Fast forward entire session duration
      await time.increase(SESSION_DURATION * 60);

      await progressiveEscrow.connect(student).releaseProgressivePayment(sessionId);

      const session = await progressiveEscrow.getSession(sessionId);
      const maxProgressiveRelease = (SESSION_AMOUNT * 90n) / 100n;
      expect(session.releasedAmount).to.be.at.most(maxProgressiveRelease);
    });
  });

  describe("Heartbeat System", function () {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-1"));

    beforeEach(async function () {
      // Create and start a session
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      await progressiveEscrow.connect(student).createProgressiveSession(
        sessionId,
        mentor.address,
        mockToken.target,
        SESSION_AMOUNT,
        SESSION_DURATION,
        nonce
      );
      await progressiveEscrow.connect(student).startProgressiveSession(sessionId);
    });

    it("Should update heartbeat successfully", async function () {
      await expect(
        progressiveEscrow.connect(student).updateHeartbeat(sessionId)
      ).to.emit(progressiveEscrow, "HeartbeatReceived");

      const session = await progressiveEscrow.getSession(sessionId);
      expect(session.lastHeartbeat).to.be.greaterThan(0);
    });

    it("Should detect when heartbeat is needed", async function () {
      // Fast forward past heartbeat interval
      await time.increase(35); // 35 seconds > 30 second interval

      const needsHeartbeat = await progressiveEscrow.needsHeartbeat(sessionId);
      expect(needsHeartbeat).to.be.true;
    });

    it("Should detect when session should auto-pause", async function () {
      // Fast forward past grace period
      await time.increase(35 + 120 + 5); // heartbeat interval + grace period + 5 seconds

      const shouldAutoPause = await progressiveEscrow.shouldAutoPause(sessionId);
      expect(shouldAutoPause).to.be.true;
    });

    it("Should auto-pause session after grace period", async function () {
      // Fast forward past grace period
      await time.increase(35 + 120 + 5);

      await expect(
        progressiveEscrow.connect(student).pauseSession(sessionId)
      ).to.emit(progressiveEscrow, "SessionPaused");

      const session = await progressiveEscrow.getSession(sessionId);
      expect(session.isPaused).to.be.true;
      expect(session.status).to.equal(2); // Paused
    });
  });

  describe("Session Pause/Resume", function () {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-1"));

    beforeEach(async function () {
      // Create and start a session
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      await progressiveEscrow.connect(student).createProgressiveSession(
        sessionId,
        mentor.address,
        mockToken.target,
        SESSION_AMOUNT,
        SESSION_DURATION,
        nonce
      );
      await progressiveEscrow.connect(student).startProgressiveSession(sessionId);
    });

    it("Should pause session manually", async function () {
      await expect(
        progressiveEscrow.connect(student).pauseSession(sessionId)
      ).to.emit(progressiveEscrow, "SessionPaused");

      const session = await progressiveEscrow.getSession(sessionId);
      expect(session.isPaused).to.be.true;
      expect(session.status).to.equal(2); // Paused
    });

    it("Should resume session", async function () {
      // First pause
      await progressiveEscrow.connect(student).pauseSession(sessionId);

      // Then resume
      await expect(
        progressiveEscrow.connect(student).resumeSession(sessionId)
      ).to.emit(progressiveEscrow, "SessionResumed");

      const session = await progressiveEscrow.getSession(sessionId);
      expect(session.isPaused).to.be.false;
      expect(session.status).to.equal(1); // Active
    });

    it("Should track paused time correctly", async function () {
      const initialTime = await time.latest();
      
      // Pause for 5 minutes
      await progressiveEscrow.connect(student).pauseSession(sessionId);
      await time.increase(5 * 60);
      await progressiveEscrow.connect(student).resumeSession(sessionId);

      // Get effective elapsed time (should exclude paused time)
      await time.increase(1 * 60); // 1 more minute active
      const effectiveElapsed = await progressiveEscrow.getEffectiveElapsedTime(sessionId);
      
      // Should be ~1 minute (excluding the 5 minutes paused)
      expect(effectiveElapsed).to.be.closeTo(1, 1);
    });
  });

  describe("Session Completion", function () {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-1"));

    beforeEach(async function () {
      // Create and start a session
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      await progressiveEscrow.connect(student).createProgressiveSession(
        sessionId,
        mentor.address,
        mockToken.target,
        SESSION_AMOUNT,
        SESSION_DURATION,
        nonce
      );
      await progressiveEscrow.connect(student).startProgressiveSession(sessionId);
    });

    it("Should complete session with survey", async function () {
      // Fast forward to get some progressive payments
      await time.increase(30 * 60); // 30 minutes
      await progressiveEscrow.connect(student).releaseProgressivePayment(sessionId);

      const mentorBalanceBefore = await mockToken.balanceOf(mentor.address);
      const platformBalanceBefore = await mockToken.balanceOf(platformWallet.address);

      await expect(
        progressiveEscrow.connect(student).completeSession(sessionId, 5, "Great session!")
      ).to.emit(progressiveEscrow, "SessionCompleted");

      const session = await progressiveEscrow.getSession(sessionId);
      expect(session.status).to.equal(3); // Completed
      expect(session.surveyCompleted).to.be.true;
      expect(session.releasedAmount).to.equal(SESSION_AMOUNT);

      // Check final payments
      const mentorBalanceAfter = await mockToken.balanceOf(mentor.address);
      const platformBalanceAfter = await mockToken.balanceOf(platformWallet.address);

      expect(mentorBalanceAfter).to.be.greaterThan(mentorBalanceBefore);
      expect(platformBalanceAfter).to.be.greaterThan(platformBalanceBefore);
    });

    it("Should only allow student to complete session", async function () {
      await expect(
        progressiveEscrow.connect(mentor).completeSession(sessionId, 5, "Great session!")
      ).to.be.revertedWith("Only student can complete session");
    });

    it("Should validate rating range", async function () {
      await expect(
        progressiveEscrow.connect(student).completeSession(sessionId, 0, "Bad rating")
      ).to.be.revertedWith("Rating must be between 1 and 5");

      await expect(
        progressiveEscrow.connect(student).completeSession(sessionId, 6, "Bad rating")
      ).to.be.revertedWith("Rating must be between 1 and 5");
    });
  });

  describe("Auto-completion", function () {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-1"));

    beforeEach(async function () {
      // Create and start a session
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      await progressiveEscrow.connect(student).createProgressiveSession(
        sessionId,
        mentor.address,
        mockToken.target,
        SESSION_AMOUNT,
        SESSION_DURATION,
        nonce
      );
      await progressiveEscrow.connect(student).startProgressiveSession(sessionId);
    });

    it("Should auto-complete after 7 days", async function () {
      // Fast forward 7 days
      await time.increase(7 * 24 * 60 * 60);

      await expect(
        progressiveEscrow.connect(addrs[0]).autoCompleteSession(sessionId)
      ).to.emit(progressiveEscrow, "SessionCompleted");

      const session = await progressiveEscrow.getSession(sessionId);
      expect(session.status).to.equal(3); // Completed
      expect(session.releasedAmount).to.equal(SESSION_AMOUNT);
    });

    it("Should not auto-complete before 7 days", async function () {
      // Fast forward 6 days
      await time.increase(6 * 24 * 60 * 60);

      await expect(
        progressiveEscrow.connect(addrs[0]).autoCompleteSession(sessionId)
      ).to.be.revertedWith("Auto-release delay not reached");
    });
  });

  describe("Session Cancellation", function () {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-1"));

    beforeEach(async function () {
      // Create a session (but don't start it)
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      await progressiveEscrow.connect(student).createProgressiveSession(
        sessionId,
        mentor.address,
        mockToken.target,
        SESSION_AMOUNT,
        SESSION_DURATION,
        nonce
      );
    });

    it("Should cancel session and refund student", async function () {
      const studentBalanceBefore = await mockToken.balanceOf(student.address);

      await expect(
        progressiveEscrow.connect(student).cancelSession(sessionId)
      ).to.emit(progressiveEscrow, "SessionCancelled");

      const studentBalanceAfter = await mockToken.balanceOf(student.address);
      expect(studentBalanceAfter).to.equal(studentBalanceBefore + SESSION_AMOUNT);

      const session = await progressiveEscrow.getSession(sessionId);
      expect(session.status).to.equal(4); // Cancelled
    });

    it("Should allow mentor to cancel session", async function () {
      await expect(
        progressiveEscrow.connect(mentor).cancelSession(sessionId)
      ).to.emit(progressiveEscrow, "SessionCancelled");
    });

    it("Should not allow cancellation after session started", async function () {
      await progressiveEscrow.connect(student).startProgressiveSession(sessionId);

      await expect(
        progressiveEscrow.connect(student).cancelSession(sessionId)
      ).to.be.revertedWith("Session already started");
    });
  });

  describe("Emergency Functions", function () {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-1"));

    beforeEach(async function () {
      // Create a session
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      await progressiveEscrow.connect(student).createProgressiveSession(
        sessionId,
        mentor.address,
        mockToken.target,
        SESSION_AMOUNT,
        SESSION_DURATION,
        nonce
      );
    });

    it("Should allow owner to emergency release", async function () {
      const recipientBalanceBefore = await mockToken.balanceOf(addrs[0].address);
      const releaseAmount = ethers.parseEther("10");

      await expect(
        progressiveEscrow.connect(owner).emergencyRelease(
          sessionId,
          addrs[0].address,
          releaseAmount,
          "Emergency test"
        )
      ).to.emit(progressiveEscrow, "EmergencyRelease");

      const recipientBalanceAfter = await mockToken.balanceOf(addrs[0].address);
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore + releaseAmount);
    });

    it("Should not allow non-owner to emergency release", async function () {
      await expect(
        progressiveEscrow.connect(student).emergencyRelease(
          sessionId,
          addrs[0].address,
          ethers.parseEther("10"),
          "Unauthorized"
        )
      ).to.be.reverted;
    });

    it("Should allow owner to pause/unpause contract", async function () {
      await progressiveEscrow.connect(owner).pause();
      
      const nonce = await progressiveEscrow.getUserNonce(addrs[0].address);
      await expect(
        progressiveEscrow.connect(addrs[0]).createProgressiveSession(
          ethers.keccak256(ethers.toUtf8Bytes("paused-session")),
          mentor.address,
          mockToken.target,
          SESSION_AMOUNT,
          SESSION_DURATION,
          nonce
        )
      ).to.be.reverted;

      await progressiveEscrow.connect(owner).unpause();
      
      // Should work again after unpause
      await mockToken.transfer(addrs[0].address, SESSION_AMOUNT);
      await mockToken.connect(addrs[0]).approve(progressiveEscrow.target, SESSION_AMOUNT);
      
      await expect(
        progressiveEscrow.connect(addrs[0]).createProgressiveSession(
          ethers.keccak256(ethers.toUtf8Bytes("unpaused-session")),
          mentor.address,
          mockToken.target,
          SESSION_AMOUNT,
          SESSION_DURATION,
          nonce
        )
      ).to.emit(progressiveEscrow, "SessionCreated");
    });
  });

  describe("View Functions", function () {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-1"));

    beforeEach(async function () {
      // Create and start a session
      const nonce = await progressiveEscrow.getUserNonce(student.address);
      await progressiveEscrow.connect(student).createProgressiveSession(
        sessionId,
        mentor.address,
        mockToken.target,
        SESSION_AMOUNT,
        SESSION_DURATION,
        nonce
      );
      await progressiveEscrow.connect(student).startProgressiveSession(sessionId);
    });

    it("Should return correct available payment", async function () {
      // Fast forward 30 minutes
      await time.increase(30 * 60);

      const available = await progressiveEscrow.getAvailablePayment(sessionId);
      expect(available).to.be.greaterThan(0);

      // Release payment
      await progressiveEscrow.connect(student).releaseProgressivePayment(sessionId);

      // Available should be 0 immediately after
      const availableAfter = await progressiveEscrow.getAvailablePayment(sessionId);
      expect(availableAfter).to.equal(0);
    });

    it("Should calculate effective elapsed time correctly", async function () {
      // Active for 10 minutes, but send heartbeat to keep it fresh
      await time.increase(10 * 60);
      await progressiveEscrow.connect(student).updateHeartbeat(sessionId); // Fresh heartbeat
      let elapsed = await progressiveEscrow.getEffectiveElapsedTime(sessionId);
      expect(elapsed).to.be.closeTo(10, 1);

      // Pause for 5 minutes (this should be a manual pause since heartbeat is fresh)
      await progressiveEscrow.connect(student).pauseSession(sessionId);
      await time.increase(5 * 60);
      elapsed = await progressiveEscrow.getEffectiveElapsedTime(sessionId);
      expect(elapsed).to.be.closeTo(10, 1); // Should still be ~10 minutes

      // Resume and add 5 more minutes
      await progressiveEscrow.connect(student).resumeSession(sessionId);
      await time.increase(5 * 60);
      elapsed = await progressiveEscrow.getEffectiveElapsedTime(sessionId);
      expect(elapsed).to.be.closeTo(15, 1); // Should be ~15 minutes total active time
    });
  });
});