const path = require('path');
const fs = require('fs');
const Web3 = require('../ui/node_modules/web3');

const web3 = new Web3('http://127.0.0.1:8545');

async function deploy() {
  const accounts = await web3.eth.getAccounts();
  console.log('Deploying from Account 0:', accounts[0]);

  const lotteryPath = path.resolve(__dirname, '../ethereum/build/Lottery.json');
  const lotteryBuild = JSON.parse(fs.readFileSync(lotteryPath, 'utf8'));

  const abi = JSON.parse(lotteryBuild.interface);
  const bytecode = lotteryBuild.bytecode;

  const lotteryContract = new web3.eth.Contract(abi);

  const deployedInstance = await lotteryContract.deploy({
    data: '0x' + bytecode
  }).send({
    from: accounts[0],
    gas: 1500000
  });

  const contractAddress = deployedInstance.options.address;
  console.log('Lottery contract successfully deployed to:', contractAddress);

  const configPath = path.resolve(__dirname, '../ui/src/contractConfig.js');
  const configContent = `const contractAddress = '${contractAddress}';\nconst contractAbi = ${JSON.stringify(abi)};\nexport default { contractAddress, contractAbi };\n`;

  fs.writeFileSync(configPath, configContent);
  console.log('Updated ui/src/contractConfig.js successfully!');
}

deploy().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});
