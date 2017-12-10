let utils = require('./utils.js')
let ico = artifacts.require("./MomsAvenueCrowdsale.sol");
let token = artifacts.require("./MomsAvenueToken.sol");
const BigNumber = web3.BigNumber;
const decimals = 18;
const rate = 10000;
let start = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1000;
let end = start + 7 * (60 * 60 * 24); // 7 days
let owner;
let wallet;
let investor;
let investor2;
let tokenInstance;
let icoInstance;

contract('MomsAvenueCrowdsale', accounts => {
    beforeEach(async() => {
        owner = accounts[0];
        wallet = accounts[1];
        investor = accounts[2];
        investor2 = accounts[3];
        tokenInstance = await token.new({gas: 2000000});
        icoInstance = await ico.new(
            start,
            end,
            wallet,
            tokenInstance.address,
            owner,
            {gas: 2000000}
        );

        tokenInstance.approve(icoInstance.address, 20000000 * 10 ** 18);
    });
    
    it("test initialization", async() => {
        let transferRate = (await icoInstance.rate.call()).valueOf();
        assert.equal(transferRate, rate);
    });

    it('should allow to set crowdsale active flag only by token owner', async () => {
        await icoInstance.setCrowdsaleActive(false, {from: owner});

        assert.equal(await icoInstance.crowdsaleActive.call(), false);
    });

    it('should not allow to set crowdsale active flag by investor', async () => {
        try {
            await icoInstance.setCrowdsaleActive(false, {from: investor1});
            throw new Error('Promise was unexpectedly fulfilled');
        } catch (error) {
        }
    });

    it("should not allow to buy tokens before start time", async() => {
        const etherToInvest = new BigNumber(web3.toWei(5, "ether"));

        try {
            await icoInstance.buyTokens(investor, {value: etherToInvest.valueOf(), from: investor});
            throw new Error('Promise was unexpectedly fulfilled');
        } catch (error) {
            assert.equal(await getTokenBalance(investor), 0);
        }
    });

    it("test transfering 5 ether from single account to buy tokens", async() => {
        utils.increaseTime(start - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1);
        const walletEtherStartBalance = getEtherBalance(wallet);
        assert.equal(await getTokenBalance(owner), 2200000000 * (10 ** decimals));
        assert.equal(await getTokenBalance(investor), 0);
        const etherToInvest = new BigNumber(web3.toWei(5, "ether"));

        await icoInstance.buyTokens(investor, {value: etherToInvest.valueOf(), from: investor});

        const weiRaised = (await icoInstance.weiRaised.call()).valueOf();
        assert.equal(web3.fromWei(weiRaised, "ether"), 5);
        assert.equal(await getTokensSold(), 5 * rate * (10 ** decimals));

        assert.equal(await getTokenBalance(owner), (2200000000 - 5 * rate) * (10 ** decimals));
        assert.equal(await getTokenBalance(investor), 5 * rate * (10 ** decimals));
        assert.equal(getEtherBalance(wallet).toNumber(), walletEtherStartBalance.add(etherToInvest).valueOf());
    });

    it("test transfering 5 ether from 2 accounts to buy tokens", async() => {
        utils.increaseTime(start - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1);
        const walletEtherStartBalance = getEtherBalance(wallet);
        assert.equal(await getTokenBalance(owner), 2200000000 * (10 ** decimals));
        assert.equal(await getTokenBalance(investor), 0);
        assert.equal(await getTokenBalance(investor2), 0);
        const etherToInvest = new BigNumber(web3.toWei(5, "ether"));

        await icoInstance.buyTokens(investor, {value: etherToInvest.valueOf(), from: investor});
        await icoInstance.buyTokens(investor2, {value: etherToInvest.valueOf(), from: investor2});

        const weiRaised = (await icoInstance.weiRaised.call()).valueOf();
        assert.equal(web3.fromWei(weiRaised, "ether"), 10);
        assert.equal(await getTokensSold(), 10 * rate * (10 ** decimals));

        assert.equal(await getTokenBalance(owner), (2200000000 - 10 * rate) * (10 ** decimals));
        assert.equal(await getTokenBalance(investor), 5 * rate * (10 ** decimals));
        assert.equal(await getTokenBalance(investor2), 5 * rate * (10 ** decimals));
        assert.equal(getEtherBalance(wallet).toNumber(), walletEtherStartBalance.add(etherToInvest).add(etherToInvest).valueOf());
    });

    it("should not allow to send 0 ether investments", async() => {
        utils.increaseTime(start - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1);

        try {
            await icoInstance.buyTokens(investor, {value: 0, from: investor});
            throw new Error('Promise was unexpectedly fulfilled');
        } catch (error) {
        }
    });

    it("should not allow investments which exceeds goal", async() => {
        utils.increaseTime(start - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1);
        const etherToInvest = new BigNumber(web3.toWei(1500, "ether"));

        try {
            await icoInstance.buyTokens(investor, {value: etherToInvest, from: investor});
            throw new Error('Promise was unexpectedly fulfilled');
        } catch (error) {
        }
    });

    it("should allow to invest using fallback function", async() => {
        utils.increaseTime(start - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1);
        const walletEtherStartBalance = getEtherBalance(wallet);
        assert.equal(await getTokenBalance(owner), 2200000000 * (10 ** decimals));
        assert.equal(await getTokenBalance(investor), 0);
        const etherToInvest = new BigNumber(web3.toWei(5, "ether"));

        await icoInstance.sendTransaction({value: etherToInvest.valueOf(), from: investor});

        const weiRaised = (await icoInstance.weiRaised.call()).valueOf();
        assert.equal(web3.fromWei(weiRaised, "ether"), 5);
        assert.equal(await getTokensSold(), 5 * rate * (10 ** decimals));

        assert.equal(await getTokenBalance(owner), (2200000000 - 5 * rate) * (10 ** decimals));
        assert.equal(await getTokenBalance(investor), 5 * rate * (10 ** decimals));
        assert.equal(getEtherBalance(wallet).toNumber(), walletEtherStartBalance.add(etherToInvest).valueOf());
    });

    it("should not allow to buy tokens when crowdsale is not active", async() => {
        utils.increaseTime(start - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1);

        await icoInstance.setCrowdsaleActive(false);

        const etherToInvest = new BigNumber(web3.toWei(5, "ether"));

        try {
            await icoInstance.buyTokens(investor, {value: etherToInvest.valueOf(), from: investor});
            throw new Error('Promise was unexpectedly fulfilled');
        } catch (error) {
        }
    });

    it("should not allow to buy tokens after end time", async() => {
        utils.increaseTime(end - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1);
        const etherToInvest = new BigNumber(web3.toWei(5, "ether"));

        try {
            await icoInstance.buyTokens(investor, {value: etherToInvest.valueOf(), from: investor});
            throw new Error('Promise was unexpectedly fulfilled');
        } catch (error) {
            assert.equal(await getTokenBalance(investor), 0);
        }
    });
});

async function getTokenBalance(account) {
    return await tokenInstance.balanceOf.call(account);
}

async function getTokensSold() {
    return await icoInstance.tokensSold.call();
}

function getEtherBalance(account) {
    return web3.eth.getBalance(account);
}