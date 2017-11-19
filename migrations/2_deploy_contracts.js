const MomsAvenueCrowdsale = artifacts.require('./MomsAvenueCrowdsale.sol');
const MomsAvenueToken = artifacts.require('./MomsAvenueToken.sol');

module.exports = function(deployer, network, accounts) {
    liveDeploy(deployer, accounts)
};

function latestTime() {
    return web3.eth.getBlock('latest').timestamp;
}

const duration = {
    seconds: function(val) { return val },
    minutes: function(val) { return val * this.seconds(60) },
    hours: function(val) { return val * this.minutes(60) },
    days: function(val) { return val * this.hours(24) },
    weeks: function(val) { return val * this.days(7) },
    years: function(val) { return val * this.days(365) }
}

function liveDeploy(deployer, accounts) {
    const BigNumber = web3.BigNumber;
    const RATE = new BigNumber(1);
    const startTime = latestTime();
    const endTime = startTime + duration.weeks(1);
    const wallet = "0x591c339c18caf9b37389335e29e753ed4259a868";
    const owner = "0x376c9fde9555e9a491c4cd8597ca67bb1bbf397e";

    deployer.deploy(MomsAvenueToken).then(() => {
        return deployer.deploy(MomsAvenueCrowdsale,
            startTime,
            endTime,
            wallet,
            MomsAvenueToken.address,
            owner
        )
    })
}
