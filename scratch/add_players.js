const Web3 = require('../ui/node_modules/web3');
const config = require('../ui/src/contractConfig.js');

const web3 = new Web3('http://127.0.0.1:8545');
const lottery = new web3.eth.Contract(config.default.contractAbi, config.default.contractAddress);

async function addPlayers() {
  const accounts = await web3.eth.getAccounts();
  console.log('Available accounts:', accounts.slice(0, 4));

  const entries = [
    { account: accounts[0], amount: '0.5' },
    { account: accounts[1], amount: '1.0' },
    { account: accounts[2], amount: '1.5' },
    { account: accounts[3], amount: '2.0' }
  ];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    console.log(`Entering Player ${i + 1} (${entry.account}) with ${entry.amount} ETH...`);
    await lottery.methods.enter().send({
      from: entry.account,
      value: web3.utils.toWei(entry.amount, 'ether'),
      gas: 300000
    });
  }

  const players = await lottery.methods.getPlayers().call();
  const balanceWei = await web3.eth.getBalance(config.default.contractAddress);
  const balanceEther = web3.utils.fromWei(balanceWei, 'ether');

  console.log('----------------------------------------------------');
  console.log(`Successfully entered ${players.length} players!`);
  console.log(`Total Prize Pool: ${balanceEther} ETH`);
  console.log('Players:', players);
}

addPlayers().catch(console.error);
