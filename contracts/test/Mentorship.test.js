const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Mentorship", function () {
  let mentorship;
  let mockUSDT, mockUSDC;
  let owner, mentor, mentee, platformFeeRecipient;
  
  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 6); // 1M tokens with 6 decimals
  const SESSION_AMOUNT = ethers.parseUnits("100", 6); // 100 tokens

  beforeEach(async function () {
    [owner, mentor, mentee, platformFeeRecipient] = await ethers.getSigners();

    // Deploy mock ERC20 tokens (USDT and USDC)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDT = await MockERC20.deploy("Mock USDT", "USDT", 6);
    mockUSDC = await MockERC20.deploy("Mock USDC", "USDC", 6);

    // Deploy Mentorship contract
    const Mentorship = await ethers.getContractFactory("Mentorship");
    mentorship = await Mentorship.deploy(platformFeeRecipient.address);

    // Mint tokens to mentee for testing
    await mockUSDT.mint(mentee.address, INITIAL_SUPPLY);
    await mockUSDC.mint(mentee.address, INITIAL_SUPPLY);

    // Add supported tokens
    await mentorship.addSupportedToken(mockUSDT.target);
    await mentorship.addSupportedToken(mockUSDC.target);
  });

  describe("Deployment", function () {
    it("Should set the correct platform fee recipient", async function () {
      expect(await mentorship.platformFeeRecipient()).to.equal(platformFeeRecipient.address);
    });

    it("Should set the correct platform fee percentage", async function () {
      expect(await mentorship.PLATFORM_FEE_PERCENTAGE()).to.equal(10);
    });

    it("Should set the owner correctly", async function () {
      expect(await mentorship.owner()).to.equal(owner.address);
    });
  });

  describe("Token Management", function () {
    it("Should add supported tokens", async function () {
      expect(await mentorship.supportedTokens(mockUSDT.target)).to.be.true;
      expect(await mentorship.supportedTokens(mockUSDC.target)).to.be.true;
    });

    it("Should remove supported tokens", async function () {
      await mentorship.removeSupportedToken(mockUSDT.target);
      expect(await mentorship.supportedTokens(mockUSDT.target)).to.be.false;
    });

    it("Should only allow owner to add/remove tokens", async function () {
      await expect(
        mentorship.connect(mentor).addSupportedToken(mockUSDT.target)
      ).to.be.revertedWithCustomError(mentorship, "OwnableUnauthorizedAccount");
    });
  });

  describe("Session Creation", function () {
    beforeEach(async function () {
      // Approve mentorship contract to spend mentee's tokens
      await mockUSDT.connect(mentee).approve(mentorship.target, SESSION_AMOUNT);
    });

    it("Should create a mentorship session", async function () {
      const startTime = (await time.latest()) + 3600; // 1 hour from now
      const duration = 3600; // 1 hour

      await expect(
        mentorship.connect(mentee).createSession(
          mentor.address,
          mockUSDT.target,
          SESSION_AMOUNT,
          startTime,
          duration
        )
      ).to.emit(mentorship, "SessionCreated")
       .withArgs(0, mentor.address, mentee.address, mockUSDT.target, SESSION_AMOUNT, startTime, duration);
    });

    it("Should transfer tokens to contract on session creation", async function () {
      const startTime = (await time.latest()) + 3600;
      const duration = 3600;

      const initialBalance = await mockUSDT.balanceOf(mentee.address);
      
      await mentorship.connect(mentee).createSession(
        mentor.address,
        mockUSDT.target,
        SESSION_AMOUNT,
        startTime,
        duration
      );

      expect(await mockUSDT.balanceOf(mentee.address)).to.equal(initialBalance - SESSION_AMOUNT);
      expect(await mockUSDT.balanceOf(mentorship.target)).to.equal(SESSION_AMOUNT);
    });

    it("Should not allow creation with unsupported token", async function () {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const unsupportedToken = await MockERC20.deploy("Unsupported", "UNS", 18);
      
      const startTime = (await time.latest()) + 3600;
      const duration = 3600;

      await expect(
        mentorship.connect(mentee).createSession(
          mentor.address,
          unsupportedToken.target,
          SESSION_AMOUNT,
          startTime,
          duration
        )
      ).to.be.revertedWith("Token not supported");
    });

    it("Should not allow mentor to be the same as mentee", async function () {
      const startTime = (await time.latest()) + 3600;
      const duration = 3600;

      await expect(
        mentorship.connect(mentee).createSession(
          mentee.address,
          mockUSDT.target,
          SESSION_AMOUNT,
          startTime,
          duration
        )
      ).to.be.revertedWith("Invalid mentor");
    });
  });

  describe("Session Completion", function () {
    let sessionId;
    
    beforeEach(async function () {
      await mockUSDT.connect(mentee).approve(mentorship.target, SESSION_AMOUNT);
      
      const startTime = (await time.latest()) + 100; // 100 seconds from now
      const duration = 3600; // 1 hour

      const tx = await mentorship.connect(mentee).createSession(
        mentor.address,
        mockUSDT.target,
        SESSION_AMOUNT,
        startTime,
        duration
      );
      
      const receipt = await tx.wait();
      // Find the SessionCreated event
      const event = receipt.logs.find(log => {
        try {
          const parsed = mentorship.interface.parseLog(log);
          return parsed.name === 'SessionCreated';
        } catch {
          return false;
        }
      });
      sessionId = event ? mentorship.interface.parseLog(event).args[0] : 0;
    });

    it("Should complete a session and distribute payments correctly", async function () {
      // Fast forward to after session end
      await time.increase(3700); // 1 hour and 100 seconds

      const mentorInitialBalance = await mockUSDT.balanceOf(mentor.address);
      const platformInitialBalance = await mockUSDT.balanceOf(platformFeeRecipient.address);

      await mentorship.connect(mentor).completeSession(sessionId);

      const mentorFinalBalance = await mockUSDT.balanceOf(mentor.address);
      const platformFinalBalance = await mockUSDT.balanceOf(platformFeeRecipient.address);

      const expectedMentorAmount = (SESSION_AMOUNT * 90n) / 100n; // 90%
      const expectedPlatformAmount = (SESSION_AMOUNT * 10n) / 100n; // 10%

      expect(mentorFinalBalance - mentorInitialBalance).to.equal(expectedMentorAmount);
      expect(platformFinalBalance - platformInitialBalance).to.equal(expectedPlatformAmount);
    });

    it("Should not allow completion before session ends", async function () {
      await expect(
        mentorship.connect(mentor).completeSession(sessionId)
      ).to.be.revertedWith("Session not finished");
    });

    it("Should only allow session participants to complete", async function () {
      await time.increase(3700);
      
      await expect(
        mentorship.connect(owner).completeSession(sessionId)
      ).to.be.revertedWith("Not session participant");
    });
  });

  describe("Session Cancellation", function () {
    let sessionId;
    
    beforeEach(async function () {
      await mockUSDT.connect(mentee).approve(mentorship.target, SESSION_AMOUNT);
      
      const startTime = (await time.latest()) + 3600; // 1 hour from now
      const duration = 3600; // 1 hour

      const tx = await mentorship.connect(mentee).createSession(
        mentor.address,
        mockUSDT.target,
        SESSION_AMOUNT,
        startTime,
        duration
      );
      
      const receipt = await tx.wait();
      // Find the SessionCreated event
      const event = receipt.logs.find(log => {
        try {
          const parsed = mentorship.interface.parseLog(log);
          return parsed.name === 'SessionCreated';
        } catch {
          return false;
        }
      });
      sessionId = event ? mentorship.interface.parseLog(event).args[0] : 0;
    });

    it("Should cancel a session and refund mentee", async function () {
      const menteeInitialBalance = await mockUSDT.balanceOf(mentee.address);

      await mentorship.connect(mentee).cancelSession(sessionId);

      const menteeFinalBalance = await mockUSDT.balanceOf(mentee.address);
      expect(menteeFinalBalance - menteeInitialBalance).to.equal(SESSION_AMOUNT);
    });

    it("Should not allow cancellation after session starts", async function () {
      await time.increase(3601); // Move past start time

      await expect(
        mentorship.connect(mentee).cancelSession(sessionId)
      ).to.be.revertedWith("Session already started");
    });
  });

  describe("View Functions", function () {
    it("Should return mentor sessions", async function () {
      await mockUSDT.connect(mentee).approve(mentorship.target, SESSION_AMOUNT);
      
      const startTime = (await time.latest()) + 3600;
      const duration = 3600;

      await mentorship.connect(mentee).createSession(
        mentor.address,
        mockUSDT.target,
        SESSION_AMOUNT,
        startTime,
        duration
      );

      const mentorSessions = await mentorship.getMentorSessions(mentor.address);
      expect(mentorSessions.length).to.equal(1);
      expect(mentorSessions[0]).to.equal(0);
    });

    it("Should return mentee sessions", async function () {
      await mockUSDT.connect(mentee).approve(mentorship.target, SESSION_AMOUNT);
      
      const startTime = (await time.latest()) + 3600;
      const duration = 3600;

      await mentorship.connect(mentee).createSession(
        mentor.address,
        mockUSDT.target,
        SESSION_AMOUNT,
        startTime,
        duration
      );

      const menteeSessions = await mentorship.getMenteeSessions(mentee.address);
      expect(menteeSessions.length).to.equal(1);
      expect(menteeSessions[0]).to.equal(0);
    });
  });

  describe("Platform Management", function () {
    it("Should update platform fee recipient", async function () {
      const signers = await ethers.getSigners();
      const newRecipient = signers[4];
      
      await mentorship.updatePlatformFeeRecipient(newRecipient.address);
      
      expect(await mentorship.platformFeeRecipient()).to.equal(newRecipient.address);
    });

    it("Should pause and unpause contract", async function () {
      await mentorship.pause();
      
      await mockUSDT.connect(mentee).approve(mentorship.target, SESSION_AMOUNT);
      
      const startTime = (await time.latest()) + 3600;
      const duration = 3600;

      await expect(
        mentorship.connect(mentee).createSession(
          mentor.address,
          mockUSDT.target,
          SESSION_AMOUNT,
          startTime,
          duration
        )
      ).to.be.revertedWithCustomError(mentorship, "EnforcedPause");

      await mentorship.unpause();

      await expect(
        mentorship.connect(mentee).createSession(
          mentor.address,
          mockUSDT.target,
          SESSION_AMOUNT,
          startTime,
          duration
        )
      ).to.not.be.reverted;
    });
  });
});