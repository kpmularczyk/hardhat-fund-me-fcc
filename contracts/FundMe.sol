// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "./PriceConverter.sol";
import "hardhat/console.sol";

//transaction cost	816662 gas (base)
//transaction cost	797132 gas (MINIMUM_USD as const)
//transaction cost	773529 gas (above and i_owner as immutable)
//transaction cost	748406 gas (above and NotOwner custom error)

error FundMe__NotOwner();

/** @title alsdjakd
 *  @author sdf
 *  @notice NatSpec
 *
 */
contract FundMe {
    using PriceConverter for uint256;

    uint256 public constant MINIMUM_USD = 50 * 1e18; // constant - constant:)

    address[] private s_funders;
    mapping(address => uint256) private s_fundersToAmountFunded;

    address private immutable i_owner; // immutable - changed only once

    AggregatorV3Interface private s_priceFeed;

    modifier onlyOwner() {
        //require(msg.sender == i_owner, "Sender is not the owner!");   // string is stored in slot in cotract, if we revert by custom error it is more gas efficient
        if (msg.sender != i_owner) {
            //console.log("Not owner error!");
            revert FundMe__NotOwner();
        }
        _; // the rest of code after modifier execution
    }

    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    // what happens if someone will send this contract ETH without calling fund() method
    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    function fund() public payable {
        require(
            msg.value.getConversionRate(s_priceFeed) >= MINIMUM_USD,
            "Didn't send enough!"
        ); // 1e18 = 1 * 10 ** 18 = 1 eth (in wei)
        console.log("address ", msg.sender, " sent ", msg.value);
        s_funders.push(msg.sender);
        s_fundersToAmountFunded[msg.sender] += msg.value;
    }

    function withdraw() public onlyOwner {
        for (
            uint256 funderIndex = 0;
            funderIndex < s_funders.length;
            funderIndex++
        ) {
            address funder = s_funders[funderIndex];
            s_fundersToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0); // (0) means 0 elements in array
        // // transfer
        //     // msg.sender is address type
        //     // payable(msg.sender) is payable address type
        // payable(msg.sender).transfer(address(this).balance);    // if the gas fee is > 2300 it fails, throws an error and automatically reverts
        // // send
        // bool sendSuccess = payable(msg.sender).send(address(this).balance);    // if the gas fee is > 2300 it fails and returns bool
        // require(sendSuccess, "Send failed!");
        // call - recomended for sending and reciving native currency token
        //{bool callSuccess, bytes memory dataReturned}
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed!");
    }

    function cheaperWithdraw() public onlyOwner {
        address[] memory funders = s_funders;
        uint256 length = funders.length;
        //mappings can't be in memory!!!
        for (uint128 funderIndex = 0; funderIndex < length; funderIndex++) {
            address funder = funders[funderIndex];
            s_fundersToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0); // (0) means 0 elements in array
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed!");
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function getAmountFunded(address funder) public view returns (uint256) {
        return s_fundersToAmountFunded[funder];
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }
}
