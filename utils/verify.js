const { run } = require("hardhat");

async function verify(contractAddress, args) {
    console.log("Verifying contract...");
    try {
        console.log(`Contract address: ${contractAddress}`);
        console.log(`Args: ${args}`);
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args
        });
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified!");
        } else {
            console.log(e);
        }
    }
}

module.exports = { verify };
