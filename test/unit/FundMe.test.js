const { assert, expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async function() {
          let fundMe;
          let deployer;
          let mockV3Aggregator;
          const sendValue = ethers.utils.parseEther("1");
          beforeEach(async function() {
              //const accounts = await ethers.getSigners();
              //console.log(accounts);
              deployer = (await getNamedAccounts()).deployer;
              //console.log(deployer);
              await deployments.fixture(["all"]);
              fundMe = await ethers.getContract("FundMe", deployer);
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              );
          });

          describe("constructor", async function() {
              it("sets the aggregator address correctly", async function() {
                  const response = await fundMe.getPriceFeed();
                  assert.equal(response, mockV3Aggregator.address);
              });
          });

          describe("fund", async function() {
              it("fails if not send enough ETH", async function() {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "Didn't send enough!"
                  );
              });
              it("updates the amount data structure", async function() {
                  await fundMe.fund({ value: sendValue });
                  const response = await fundMe.getAmountFunded(deployer);
                  console.log(`updated amount: ${response} wei`);
                  assert.equal(sendValue, response.toString());
              });
              it("adds funder to funder array", async function() {
                  await fundMe.fund({ value: sendValue });
                  const funder = await fundMe.getFunder(0);
                  console.log(`funder @ 0: ${funder}`);
              });
          });
          describe("withdraw", async function() {
              beforeEach(async () => {
                  await fundMe.fund({ value: sendValue });
              });

              it("withdraw ETH from single funder", async () => {
                  //arrange
                  const startingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  );
                  console.log(
                      `starting contract balance: ${startingFundMeBalance.toString()} wei`
                  );
                  const startingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  );
                  console.log(
                      `starting deployer balance: ${startingDeployerBalance.toString()} wei`
                  );
                  //act
                  const transactionResponse = await fundMe.withdraw();
                  const transactionReceipt = await transactionResponse.wait(1);
                  console.log(`withdraw()`);
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  );
                  console.log(
                      `ending contract balance: ${endingFundMeBalance.toString()} wei`
                  );
                  const endingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  );
                  console.log(
                      `ending deployer balance: ${endingDeployerBalance.toString()} wei`
                  );
                  //gas cost
                  const { gasUsed, effectiveGasPrice } = transactionReceipt;
                  const totalGasCost = gasUsed.mul(effectiveGasPrice);
                  console.log(`total gas cost: ${totalGasCost.toString()} wei`);
                  transactionReceipt.gasUsed *
                      //assert
                      assert.equal(endingFundMeBalance, 0);
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(totalGasCost).toString()
                  );
              });
              it("allows to withdraw with multiple funders", async () => {
                  const accounts = await ethers.getSigners();
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      );
                      fundMeConnectedContract.fund({ value: sendValue });
                  }
                  const transactionResponse = await fundMe.withdraw();
                  const transactionReceipt = await transactionResponse.wait(1);
                  const { gasUsed, effectiveGasPrice } = transactionReceipt;
                  const totalGasCost = gasUsed.mul(effectiveGasPrice);
                  // make sure that funders and values arrays are cleared
                  await expect(fundMe.getFunder(0)).to.be.reverted;
                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAmountFunded(accounts[i].address),
                          0
                      );
                  }
              });
              it("allows to cheaperWithdraw with multiple funders", async () => {
                  const accounts = await ethers.getSigners();
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      );
                      fundMeConnectedContract.fund({ value: sendValue });
                  }
                  const transactionResponse = await fundMe.cheaperWithdraw();
                  const transactionReceipt = await transactionResponse.wait(1);
                  const { gasUsed, effectiveGasPrice } = transactionReceipt;
                  const totalGasCost = gasUsed.mul(effectiveGasPrice);
                  // make sure that funders and values arrays are cleared
                  await expect(fundMe.getFunder(0)).to.be.reverted;
                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAmountFunded(accounts[i].address),
                          0
                      );
                  }
              });
              it("onlyOwner withdraw check", async () => {
                  const accounts = await ethers.getSigners();
                  const attacker = accounts[1];
                  const attackerConnectedContract = await fundMe.connect(
                      attacker
                  );
                  await expect(
                      attackerConnectedContract.withdraw()
                  ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
              });
          });
      });
