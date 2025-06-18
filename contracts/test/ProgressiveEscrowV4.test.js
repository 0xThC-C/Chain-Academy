const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProgressiveEscrowV4 - ETH Support", function () {
    let escrow;
    let owner, student, mentor, platformWallet;
    const ETH_TOKEN = ethers.ZeroAddress;
    
    beforeEach(async function () {
        [owner, student, mentor, platformWallet] = await ethers.getSigners();
        
        const ProgressiveEscrowV4 = await ethers.getContractFactory("ProgressiveEscrowV4");
        escrow = await ProgressiveEscrowV4.deploy(platformWallet.address);
        await escrow.waitForDeployment();
    });

    describe("ETH Support", function () {
        it("Should support ETH token by default", async function () {
            expect(await escrow.isTokenSupported(ETH_TOKEN)).to.be.true;
        });

        it("Should create session with ETH payment", async function () {
            const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-1"));
            const amount = ethers.parseEther("0.1"); // 0.1 ETH
            const duration = 60; // 60 minutes
            const nonce = 0;

            await expect(
                escrow.connect(student).createProgressiveSession(
                    sessionId,
                    mentor.address,
                    ETH_TOKEN,
                    amount,
                    duration,
                    nonce,
                    { value: amount }
                )
            ).to.emit(escrow, "SessionCreated")
             .withArgs(sessionId, student.address, mentor.address, amount, ETH_TOKEN);

            const session = await escrow.getSession(sessionId);
            expect(session.paymentToken).to.equal(ETH_TOKEN);
            expect(session.totalAmount).to.equal(amount);
        });

        it("Should reject ETH payment with wrong amount", async function () {
            const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-2"));
            const amount = ethers.parseEther("0.1");
            const wrongAmount = ethers.parseEther("0.2");
            const duration = 60;
            const nonce = 0;

            await expect(
                escrow.connect(student).createProgressiveSession(
                    sessionId,
                    mentor.address,
                    ETH_TOKEN,
                    amount,
                    duration,
                    nonce,
                    { value: wrongAmount }
                )
            ).to.be.revertedWith("ETH amount mismatch");
        });

        it("Should start and release progressive ETH payments", async function () {
            const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-3"));
            const amount = ethers.parseEther("0.1");
            const duration = 60; // 60 minutes
            const nonce = 0;

            // Create session
            await escrow.connect(student).createProgressiveSession(
                sessionId,
                mentor.address,
                ETH_TOKEN,
                amount,
                duration,
                nonce,
                { value: amount }
            );

            // Start session
            await escrow.connect(student).startProgressiveSession(sessionId);

            // Fast forward time by 30 minutes (half the session)
            await ethers.provider.send("evm_increaseTime", [30 * 60]);
            await ethers.provider.send("evm_mine");

            // Check available payment (should be around 45% of total, since 90% is releasable progressively)
            const available = await escrow.getAvailablePayment(sessionId);
            const expected = (amount * 90n / 100n) * 30n / 60n; // 45% of total
            expect(available).to.be.closeTo(expected, ethers.parseEther("0.001"));

            // Release payment
            const mentorBalanceBefore = await ethers.provider.getBalance(mentor.address);
            
            await escrow.connect(student).releaseProgressivePayment(sessionId);
            
            const mentorBalanceAfter = await ethers.provider.getBalance(mentor.address);
            expect(mentorBalanceAfter - mentorBalanceBefore).to.be.closeTo(expected, ethers.parseEther("0.001"));
        });

        it("Should complete session and distribute final ETH payments", async function () {
            const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-4"));
            const amount = ethers.parseEther("0.1");
            const duration = 60;
            const nonce = 0;

            // Create and start session
            await escrow.connect(student).createProgressiveSession(
                sessionId,
                mentor.address,
                ETH_TOKEN,
                amount,
                duration,
                nonce,
                { value: amount }
            );
            
            await escrow.connect(student).startProgressiveSession(sessionId);

            // Record initial balances
            const mentorBalanceBefore = await ethers.provider.getBalance(mentor.address);
            const platformBalanceBefore = await ethers.provider.getBalance(platformWallet.address);

            // Complete session
            await escrow.connect(student).completeSession(sessionId, 5, "Great session!");

            // Check final balances
            const mentorBalanceAfter = await ethers.provider.getBalance(mentor.address);
            const platformBalanceAfter = await ethers.provider.getBalance(platformWallet.address);

            // Mentor should receive 90% of total amount
            const expectedMentorAmount = amount * 90n / 100n;
            expect(mentorBalanceAfter - mentorBalanceBefore).to.equal(expectedMentorAmount);

            // Platform should receive 10% of total amount
            const expectedPlatformAmount = amount * 10n / 100n;
            expect(platformBalanceAfter - platformBalanceBefore).to.equal(expectedPlatformAmount);
        });

        it("Should cancel session and refund ETH to student", async function () {
            const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-5"));
            const amount = ethers.parseEther("0.1");
            const duration = 60;
            const nonce = 0;

            // Create session
            await escrow.connect(student).createProgressiveSession(
                sessionId,
                mentor.address,
                ETH_TOKEN,
                amount,
                duration,
                nonce,
                { value: amount }
            );

            const studentBalanceBefore = await ethers.provider.getBalance(student.address);

            // Cancel session
            const tx = await escrow.connect(student).cancelSession(sessionId);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const studentBalanceAfter = await ethers.provider.getBalance(student.address);

            // Student should get refund minus gas costs
            expect(studentBalanceAfter - studentBalanceBefore + gasUsed).to.equal(amount);
        });

        it("Should handle heartbeat and resume with ETH", async function () {
            const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-6"));
            const amount = ethers.parseEther("0.1");
            const duration = 60;
            const nonce = 0;

            // Create and start session
            await escrow.connect(student).createProgressiveSession(
                sessionId,
                mentor.address,
                ETH_TOKEN,
                amount,
                duration,
                nonce,
                { value: amount }
            );
            
            await escrow.connect(student).startProgressiveSession(sessionId);

            // Update heartbeat
            await expect(
                escrow.connect(student).updateHeartbeat(sessionId)
            ).to.emit(escrow, "HeartbeatReceived");

            // Pause session
            await escrow.connect(student).pauseSession(sessionId);
            
            let session = await escrow.getSession(sessionId);
            expect(session.isPaused).to.be.true;

            // Resume session
            await escrow.connect(student).resumeSession(sessionId);
            
            session = await escrow.getSession(sessionId);
            expect(session.isPaused).to.be.false;
        });
    });

    describe("Mixed Token Support", function () {
        it("Should reject ETH for ERC20 sessions", async function () {
            // Create a mock ERC20 token address (not zero address)
            const mockToken = "0x1234567890123456789012345678901234567890";
            
            // Add mock token as supported
            await escrow.addSupportedToken(mockToken);
            
            const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-session-7"));
            const amount = ethers.parseEther("100"); // 100 tokens
            const duration = 60;
            const nonce = 0;

            await expect(
                escrow.connect(student).createProgressiveSession(
                    sessionId,
                    mentor.address,
                    mockToken,
                    amount,
                    duration,
                    nonce,
                    { value: ethers.parseEther("0.1") } // Sending ETH for ERC20 session
                )
            ).to.be.revertedWith("ETH not accepted for ERC20 payments");
        });

        it("Should allow owner to add/remove ETH support", async function () {
            // Remove ETH support
            await escrow.removeSupportedToken(ETH_TOKEN);
            expect(await escrow.isTokenSupported(ETH_TOKEN)).to.be.false;

            // Add ETH support back
            await escrow.addSupportedToken(ETH_TOKEN);
            expect(await escrow.isTokenSupported(ETH_TOKEN)).to.be.true;
        });
    });

    describe("Emergency Functions", function () {
        it("Should allow emergency ETH withdrawal by owner", async function () {
            // Send some ETH to contract
            await student.sendTransaction({
                to: await escrow.getAddress(),
                value: ethers.parseEther("1.0")
            });

            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
            const withdrawAmount = ethers.parseEther("0.5");

            const tx = await escrow.emergencyWithdrawETH(owner.address, withdrawAmount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
            expect(ownerBalanceAfter - ownerBalanceBefore + gasUsed).to.equal(withdrawAmount);
        });

        it("Should allow emergency release with ETH", async function () {
            const sessionId = ethers.keccak256(ethers.toUtf8Bytes("test-emergency"));
            const amount = ethers.parseEther("0.1");
            const duration = 60;
            const nonce = 0;

            // Create session
            await escrow.connect(student).createProgressiveSession(
                sessionId,
                mentor.address,
                ETH_TOKEN,
                amount,
                duration,
                nonce,
                { value: amount }
            );

            const mentorBalanceBefore = await ethers.provider.getBalance(mentor.address);
            const emergencyAmount = ethers.parseEther("0.05");

            await expect(
                escrow.emergencyRelease(
                    sessionId,
                    mentor.address,
                    emergencyAmount,
                    "Emergency test"
                )
            ).to.emit(escrow, "EmergencyRelease");

            const mentorBalanceAfter = await ethers.provider.getBalance(mentor.address);
            expect(mentorBalanceAfter - mentorBalanceBefore).to.equal(emergencyAmount);
        });
    });
});