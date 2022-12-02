const { getNamedAccounts, ethers } = require("hardhat");

async function main() {
    const { deployer } = getNamedAccounts();
    const fundMe = await ethers.getContract("FundMe", deployer);
    console.log("Withdrawing contract funds...");
    const transactionResponse = await fundMe.withdraw();
    await transactionResponse.wait(1);
    const contractBalance = await ethers.provider.getBalance(fundMe.address);
    console.log(
        `contract balance: ${ethers.utils.formatEther(contractBalance)} ETH`
    );
    console.log("Funds withdrawn.");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
