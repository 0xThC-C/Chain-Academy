const { ethers } = require("hardhat");

async function main() {
    console.log("=== Testing ProgressiveEscrowV4 ETH Functionality ===\n");

    const [deployer, student, mentor] = await ethers.getSigners();
    
    console.log("Accounts:");
    console.log("- Deployer:", deployer.address);
    console.log("- Student:", student.address);
    console.log("- Mentor:", mentor.address);
    
    // Replace with your deployed contract address
    const contractAddress = "0xa161C5F6B18120269c279D31A7FEcAFb86c737EC"; // Update this
    
    console.log("\nConnecting to contract at:", contractAddress);
    
    const ProgressiveEscrowV4 = await ethers.getContractFactory("ProgressiveEscrowV4");
    const escrow = ProgressiveEscrowV4.attach(contractAddress);
    
    // If you need to deploy a new contract instead:
    // const escrow = await ProgressiveEscrowV4.deploy(deployer.address);
    // await escrow.waitForDeployment();
    // console.log("New contract deployed at:", await escrow.getAddress());

    const ETH_TOKEN = ethers.ZeroAddress;
    
    // Check if ETH is supported
    const isETHSupported = await escrow.isTokenSupported(ETH_TOKEN);
    console.log("ETH supported:", isETHSupported);
    
    if (!isETHSupported) {
        console.log("Adding ETH support...");
        await escrow.addSupportedToken(ETH_TOKEN);
        console.log("ETH support added!");
    }

    // Generate a unique session ID
    const sessionId = ethers.keccak256(
        ethers.toUtf8Bytes(`test-eth-session-${Date.now()}`)
    );
    
    const sessionAmount = ethers.parseEther("0.01"); // 0.01 ETH
    const sessionDuration = 30; // 30 minutes
    
    console.log("\n=== Creating ETH Session ===");
    console.log("Session ID:", sessionId);
    console.log("Amount:", ethers.formatEther(sessionAmount), "ETH");
    console.log("Duration:", sessionDuration, "minutes");
    
    // Get student's nonce
    const nonce = await escrow.getUserNonce(student.address);
    console.log("Student nonce:", nonce.toString());
    
    // Check balances before
    const studentBalanceBefore = await ethers.provider.getBalance(student.address);
    const mentorBalanceBefore = await ethers.provider.getBalance(mentor.address);
    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);
    
    console.log("\nBalances before session:");
    console.log("- Student:", ethers.formatEther(studentBalanceBefore), "ETH");
    console.log("- Mentor:", ethers.formatEther(mentorBalanceBefore), "ETH");
    console.log("- Contract:", ethers.formatEther(contractBalanceBefore), "ETH");
    
    // Create session with ETH
    console.log("\nCreating session...");
    const createTx = await escrow.connect(student).createProgressiveSession(
        sessionId,
        mentor.address,
        ETH_TOKEN,
        sessionAmount,
        sessionDuration,
        nonce,
        { value: sessionAmount }
    );
    
    await createTx.wait();
    console.log("Session created! Tx:", createTx.hash);
    
    // Check session details
    const session = await escrow.getSession(sessionId);
    console.log("\nSession details:");
    console.log("- Student:", session.student);
    console.log("- Mentor:", session.mentor);
    console.log("- Token:", session.paymentToken === ETH_TOKEN ? "ETH" : session.paymentToken);
    console.log("- Amount:", ethers.formatEther(session.totalAmount), "ETH");
    console.log("- Duration:", session.sessionDuration.toString(), "minutes");
    console.log("- Status:", session.status); // 0 = Created
    
    // Start the session
    console.log("\nStarting session...");
    const startTx = await escrow.connect(student).startProgressiveSession(sessionId);
    await startTx.wait();
    console.log("Session started! Tx:", startTx.hash);
    
    // Update heartbeat
    console.log("\nSending heartbeat...");
    const heartbeatTx = await escrow.connect(student).updateHeartbeat(sessionId);
    await heartbeatTx.wait();
    console.log("Heartbeat sent! Tx:", heartbeatTx.hash);
    
    // Check available payment (should be 0 at start)
    let availablePayment = await escrow.getAvailablePayment(sessionId);
    console.log("Available payment:", ethers.formatEther(availablePayment), "ETH");
    
    // Fast forward time by 15 minutes (half the session)
    console.log("\nFast forwarding 15 minutes...");
    await ethers.provider.send("evm_increaseTime", [15 * 60]);
    await ethers.provider.send("evm_mine");
    
    // Check available payment now
    availablePayment = await escrow.getAvailablePayment(sessionId);
    console.log("Available payment after 15 min:", ethers.formatEther(availablePayment), "ETH");
    
    // Release progressive payment
    if (availablePayment > 0) {
        console.log("\nReleasing progressive payment...");
        const releaseTx = await escrow.connect(student).releaseProgressivePayment(sessionId);
        await releaseTx.wait();
        console.log("Payment released! Tx:", releaseTx.hash);
        
        // Check mentor balance after release
        const mentorBalanceAfter = await ethers.provider.getBalance(mentor.address);
        const received = mentorBalanceAfter - mentorBalanceBefore;
        console.log("Mentor received:", ethers.formatEther(received), "ETH");
    }
    
    // Complete the session
    console.log("\nCompleting session...");
    const completeTx = await escrow.connect(student).completeSession(
        sessionId,
        5, // 5-star rating
        "Great ETH session!"
    );
    await completeTx.wait();
    console.log("Session completed! Tx:", completeTx.hash);
    
    // Check final balances
    const studentBalanceAfter = await ethers.provider.getBalance(student.address);
    const mentorBalanceAfter = await ethers.provider.getBalance(mentor.address);
    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);
    
    console.log("\nFinal balances:");
    console.log("- Student:", ethers.formatEther(studentBalanceAfter), "ETH");
    console.log("- Mentor:", ethers.formatEther(mentorBalanceAfter), "ETH");
    console.log("- Contract:", ethers.formatEther(contractBalanceAfter), "ETH");
    
    console.log("\nBalance changes:");
    console.log("- Student:", ethers.formatEther(studentBalanceAfter - studentBalanceBefore), "ETH");
    console.log("- Mentor:", ethers.formatEther(mentorBalanceAfter - mentorBalanceBefore), "ETH");
    console.log("- Contract:", ethers.formatEther(contractBalanceAfter - contractBalanceBefore), "ETH");
    
    // Check final session status
    const finalSession = await escrow.getSession(sessionId);
    console.log("\nFinal session status:", finalSession.status); // 3 = Completed
    console.log("Total released:", ethers.formatEther(finalSession.releasedAmount), "ETH");
    
    console.log("\n=== ETH Functionality Test Complete ===");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });