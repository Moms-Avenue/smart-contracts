let utils = require('./utils.js')
let token = artifacts.require("./MomsAvenueToken.sol");
let instance;
let owner;
let icoAddress;
let investor1;
let investor2;
const decimals = 18;

contract('MomsAvenueToken', accounts => {
    beforeEach(async() => {
        owner = accounts[0];
        icoAddress = accounts[1];
        investor1 = accounts[2];
        investor2 = accounts[3];
        instance = await token.new({gas: 2000000});
    });

    it("test initialization", async () => {
        assert.equal(await getTokenBalance(owner), 2200000000 * (10 ** decimals));
    });

    it("should allow investor to spend 10MOM", async () => {
        await instance.approve(investor1, 10 * (10 ** decimals));
        let allowed = await getAllowedAmount(owner, investor1);
        assert.equal(allowed, 10 * (10 ** decimals));
    });

    it("should allow to transfer tokens 10 MOM from owner", async () => {
        await instance.transfer(investor1, 10 * (10 ** decimals), {from: owner});

        assert.equal(await getTokenBalance(owner), 2199999990 * (10 ** decimals));
        assert.equal(await getTokenBalance(investor1), 10 * (10 ** decimals));
    });

    it("should not allow to transfer tokens 5 MOM from investor if trading is disabled", async () => {
        await instance.transfer(investor1, 10 * (10 ** decimals), {from: owner});

        try {
            await instance.transfer(investor2, 5 * (10 ** decimals), {from: investor1});
            throw new Error('Promise was unexpectedly fulfilled');
        } catch (error) {
        }
    });

    it("should allow to transfer tokens 5 MOM from investor if trading is enabled", async () => {
        await instance.transfer(investor1, 10 * (10 ** decimals), {from: owner});

        await instance.setAllowTrading(true);

        await instance.transfer(investor2, 5 * (10 ** decimals), {from: investor1});

        assert.equal(await getTokenBalance(owner), 2199999990 * (10 ** decimals));
        assert.equal(await getTokenBalance(investor1), 5 * (10 ** decimals));
        assert.equal(await getTokenBalance(investor2), 5 * (10 ** decimals));
    });

    it("should not allow to transfer locked tokens from owner if 1 year has not passed", async () => {
        utils.increaseTime(web3.eth.getBlock(web3.eth.blockNumber).timestamp + 10000000);
        try {
            await instance.transfer(investor1, 2000000000 * (10 ** decimals), {from: owner});
            throw new Error('Promise was unexpectedly fulfilled');
        } catch (error) {
        }
    });

    
    it("should allow to transfer locked tokens from owner if 1 year has passed", async () => {
        utils.increaseTime(web3.eth.getBlock(web3.eth.blockNumber).timestamp + 31536000);

        await instance.transfer(investor1, 2000000000 * (10 ** decimals), {from: owner});
    });

    it('should allow to set allow trading flag by owner', async () => {
        await instance.setAllowTrading(true, {from: owner});

        assert.equal(await instance.allowTrading.call(), true);
    });

    it('should not allow to set allow trading flag by investor', async () => {
        try {
            await instance.setAllowTrading(true, {from: investor1});
            throw new Error('Promise was unexpectedly fulfilled');
        } catch (error) {
        }
    });
})

async function getTokenBalance(account) {
    return await instance.balanceOf.call(account);
}

async function getAllowedAmount(account1, account2) {
    return await instance.allowance.call(account1, account2);
}