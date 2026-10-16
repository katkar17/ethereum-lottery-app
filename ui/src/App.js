import React from 'react';
import LoadingOverlay from 'react-loading-overlay';
import './App.css';
import web3 from './web3';
import lottery from './lottery';
import contractInfo from './contractConfig';

const KNOWN_ACCOUNTS = {
  '0x627306090abab3a6e1400e9345bc60c78a8bef57': 'Sahil_katkar (Manager)',
  '0xf17f52151ebef6c7334fad080c5704d77216b732': 'Ishwar_kumavat',
  '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef': 'abdul_khan'
};

class App extends React.Component {
  getAccountName = address => {
    if (!address) return '';
    const lower = address.toLowerCase();
    const custom = localStorage.getItem(`nick_${lower}`);
    if (custom) return custom;
    if (KNOWN_ACCOUNTS[lower]) return KNOWN_ACCOUNTS[lower];
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  state = {
    manager: '',
    players: [],
    balance: '',
    balanceEther: '',
    value: '',
    message: '',
    isMetaMaskPluginAvailable: false,
    isTransactionIsRunning: false,
    startWarning: false,
    errorMessage: '',
    successMessage: '',
    userAccount: '',
    userBalanceEther: '',
    networkName: '',
    winnerInfo: null,
    recentTxs: []
  };

  async componentDidMount() {
    const isMetaMaskPluginAvailable = Boolean(
      (typeof window !== 'undefined' && (window.ethereum || window.web3)) || (web3 && lottery)
    );
    this.setState({ isMetaMaskPluginAvailable });
    this.updateContractInfo();
    this.loadUserAccount();
    this.loadRecentTransactions();

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', () => {
        this.loadUserAccount();
        this.loadRecentTransactions();
      });
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }

  loadRecentTransactions = async () => {
    if (!web3) return;
    try {
      const latest = await web3.eth.getBlockNumber();
      const txs = [];
      const fromBlock = Math.max(1, latest - 8);
      for (let i = latest; i >= fromBlock; i--) {
        const block = await web3.eth.getBlock(i, true);
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            const r = await web3.eth.getTransactionReceipt(tx.hash);
            const isJoin = tx.input && tx.input.startsWith('0xe97dcb62');
            const isPick = tx.input && tx.input.startsWith('0x5d495aea');
            if (isJoin || isPick) {
              const amountStr = isJoin
                ? `${web3.utils.fromWei(tx.value || '0', 'ether')} ETH`
                : 'Prize Draw';
              txs.push({
                hash: tx.hash,
                type: isJoin ? 'Join Lottery' : 'Pick Winner',
                account: this.getAccountName(tx.from),
                amount: amountStr,
                status: r && r.status ? 'SUCCESS' : 'FAILED',
                time: new Date(block.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              });
            }
          }
        }
      }
      this.setState({ recentTxs: txs });
    } catch (e) {
      console.warn('Could not load recent txs:', e);
    }
  };

  loadUserAccount = async () => {
    if (!web3) return;
    try {
      const accounts = await web3.eth.getAccounts();
      if (accounts && accounts.length > 0) {
        const userAccount = accounts[0];
        const balanceWei = await web3.eth.getBalance(userAccount);
        const userBalanceEther = Number(web3.utils.fromWei(balanceWei, 'ether')).toFixed(7);
        let networkName = 'Unknown Network';
        if (window.ethereum) {
          try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId === '0x539' || chainId === '1337' || chainId === 1337) networkName = 'Localhost (Ganache)';
            else if (chainId === '0xaa36a7' || chainId === '11155111') networkName = 'Sepolia';
            else if (chainId === '0x1') networkName = 'Ethereum Mainnet';
            else if (chainId === '0x4') networkName = 'Rinkeby (Deprecated)';
            else if (chainId === '0x4268' || chainId === '17000') networkName = 'Holesky';
            else networkName = `Chain ${parseInt(chainId, 16) || chainId}`;
          } catch (e) {}
        }
        this.setState({ userAccount, userBalanceEther, networkName });
        this.updateContractInfo();
      } else {
        this.setState({ userAccount: '', userBalanceEther: '', networkName: '' });
      }
    } catch (err) {
      console.warn('Could not read user account:', err);
    }
  };

  switchToGanache = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x539' }],
      });
      setTimeout(() => window.location.reload(), 300);
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x539',
              chainName: 'Ganache Local',
              rpcUrls: ['http://127.0.0.1:8545'],
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
            }],
          });
          setTimeout(() => window.location.reload(), 300);
        } catch (addError) {
          this.setState({ errorMessage: addError.message });
        }
      } else {
        this.setState({ errorMessage: switchError.message });
      }
    }
  };

  async updateContractInfo() {
    try {
      const res = await fetch('/api/contract-info');
      if (res.ok) {
        const { manager, players, balanceWei: balance, balanceEther } = await res.json();
        this.setState({ manager, players, balance, balanceEther });
        return;
      }
    } catch (e) {
      // API endpoint unavailable, fall back to direct Web3 call
    }

    if (web3 && lottery) {
      try {
        const manager = await lottery.methods.manager().call();
        const players = await lottery.methods.getPlayers().call();
        const balanceWei = await web3.eth.getBalance(contractInfo.contractAddress);
        const balanceEther = web3.utils.fromWei(balanceWei, 'ether');
        this.setState({ manager, players, balance: balanceWei, balanceEther });
      } catch (err) {
        console.log('Direct contract call notice:', err);
      }
    }
  }

  requestAccountAccess = async () => {
    if (window.ethereum) {
      try {
        if (window.ethereum.request) {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
        } else if (window.ethereum.enable) {
          await window.ethereum.enable();
        }
        this.setState({ errorMessage: '' });
        await this.loadUserAccount();
      } catch (err) {
        if (err.message && err.message.includes('already pending')) {
          this.setState({
            errorMessage: 'MetaMask popup is open! Click the fox icon 🦊 at the top-right of your browser to approve the connection.'
          });
        } else {
          this.setState({ errorMessage: err.message });
        }
      }
    }
  };

  onSubmit = async event => {
    event.preventDefault();
    this.setState({
      errorMessage: '',
      successMessage: '',
      message: ''
    });
    const { isMetaMaskPluginAvailable, value } = this.state;
    if (!isMetaMaskPluginAvailable) {
      return this.metaMaskNotAvailable();
    }

    const etherVal = parseFloat(value);
    if (!value || isNaN(etherVal) || etherVal <= 0.01) {
      this.setState({
        errorMessage: '⚠️ Minimum entry amount must be strictly greater than 0.01 ETH (for example: 0.02, 0.05, or 0.1 ETH).'
      });
      return;
    }

    try {
      await this.requestAccountAccess();
      const accounts = await web3.eth.getAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No Ethereum accounts found. Please unlock your wallet.');
      }
      this.setState({
        message: 'Transaction is processing. Please confirm the transaction in MetaMask.',
        isTransactionIsRunning: true
      });

      const enteredAmount = value;
      await lottery.methods.enter().send({
        from: accounts[0],
        value: web3.utils.toWei(enteredAmount, 'ether'),
        gas: 300000
      });
      await this.updateContractInfo();
      await this.loadUserAccount();
      await this.loadRecentTransactions();
      this.setState({
        successMessage: `🎉 Congratulations! Successfully joined with ${enteredAmount} ETH! You are now entered in the lottery.`,
        value: ''
      });
    } catch (err) {
      this.setState({
        errorMessage: err.message
      });
    }
    this.setState({ isTransactionIsRunning: false });
  };

  onClickPickWinner = async event => {
    event.preventDefault();
    this.setState({
      errorMessage: '',
      message: ''
    });
    const { isMetaMaskPluginAvailable, userAccount, manager, players } = this.state;
    if (!isMetaMaskPluginAvailable) {
      return this.metaMaskNotAvailable();
    }

    if (userAccount && manager && userAccount.toLowerCase() !== manager.toLowerCase()) {
      this.setState({
        errorMessage: `⚠️ Only the Contract Manager (${manager.substring(0, 8)}...) can Pick a Winner. Your active MetaMask account (${userAccount.substring(0, 8)}...) is a Player. Please switch to Account 1 (Manager) in MetaMask to draw the winner!`
      });
      return;
    }

    try {
      await this.requestAccountAccess();
      const accounts = await web3.eth.getAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No Ethereum accounts found. Please unlock your wallet.');
      }

      if (manager && accounts[0].toLowerCase() !== manager.toLowerCase()) {
        throw new Error(`Only the Contract Manager (${manager}) can pick a winner. Currently selected: ${accounts[0]}. Switch to Account 1 in MetaMask.`);
      }

      const priorPlayers = [...players];
      const prizePool = this.state.balanceEther;

      if (!priorPlayers || priorPlayers.length === 0) {
        throw new Error('Cannot pick a winner because no players have entered yet.');
      }

      // Record pre-draw balances
      const preBalances = {};
      for (const p of priorPlayers) {
        try {
          preBalances[p] = await web3.eth.getBalance(p);
        } catch (e) {}
      }

      this.setState({
        message: 'Drawing winner and transferring prize pool... Please confirm in MetaMask.',
        isTransactionIsRunning: true
      });

      const txReceipt = await lottery.methods.pickWinner().send({
        from: accounts[0],
        gas: 600000
      });

      // Find who received the balance increase
      let winnerAccount = priorPlayers[0];
      let largestIncrease = web3.utils.toBN(0);

      for (const p of priorPlayers) {
        try {
          const postBal = await web3.eth.getBalance(p);
          const diff = web3.utils.toBN(postBal).sub(web3.utils.toBN(preBalances[p] || '0'));
          if (diff.gt(largestIncrease)) {
            largestIncrease = diff;
            winnerAccount = p;
          }
        } catch (e) {}
      }

      this.setState({
        winnerInfo: {
          address: winnerAccount,
          prize: prizePool,
          txHash: txReceipt.transactionHash
        },
        message: `Winner picked! ${winnerAccount} won ${prizePool} ETH!`
      });
      await this.updateContractInfo();
      await this.loadUserAccount();
      await this.loadRecentTransactions();
    } catch (ex) {
      this.setState({
        errorMessage: ex.message
      });
    }

    this.setState({ isTransactionIsRunning: false });
  };


  metaMaskNotAvailable = () => {
    this.setState({
      startWarning: true
    });
  };

  onClickUpdateAnnouncement = () => {
    this.updateContractInfo();
  };

  walletStatus() {
    const { userAccount, userBalanceEther, networkName, isMetaMaskPluginAvailable } = this.state;
    if (!isMetaMaskPluginAvailable) {
      return (
        <div className='metamask-not-found'>
          MetaMask Not Detected. Please install MetaMask.
        </div>
      );
    }

    if (!userAccount) {
      return (
        <div className='wallet-connect-container'>
          <button
            type='button'
            className='connect-wallet-button'
            onClick={this.requestAccountAccess}
          >
            <span role='img' aria-label='fox'>🦊</span> Connect MetaMask Wallet
          </button>
        </div>
      );
    }

    const shortAddress = `${userAccount.substring(0, 6)}...${userAccount.substring(userAccount.length - 4)}`;
    const accountName = this.getAccountName(userAccount);
    const isManager = Boolean(
      userAccount && this.state.manager && userAccount.toLowerCase() === this.state.manager.toLowerCase()
    );

    return (
      <div className='user-wallet-card'>
        <div className='wallet-header'>
          <span className='wallet-dot'>●</span>
          <span className='wallet-status-label'>Connected Wallet</span>
          <span className='wallet-role-tag'>
            {isManager ? (
              <span className='role-manager'><span role='img' aria-label='crown'>👑</span> Manager</span>
            ) : (
              <span className='role-player'><span role='img' aria-label='user'>👤</span> Player</span>
            )}
          </span>
          <span className='wallet-network-tag'>{networkName}</span>
        </div>
        <div className='wallet-details'>
          <div className='wallet-field'>
            <span className='field-label'>Name:</span>
            <span className='wallet-name-highlight'>{accountName}</span>
          </div>
          <div className='wallet-field'>
            <span className='field-label'>Account:</span>
            <span className='field-value' title={userAccount}>{shortAddress}</span>
          </div>
          <div className='wallet-field'>
            <span className='field-label'>Balance:</span>
            <span className='field-value-highlight'>{userBalanceEther} ETH</span>
          </div>
        </div>
        {networkName !== 'Localhost (Ganache)' && (
          <div className='network-warning-box'>
            <div className='network-warning-text'>
              Connected to <b>{networkName}</b>. Click below to switch to <b>Ganache Local</b>:
            </div>
            <button
              type='button'
              className='switch-network-button'
              onClick={this.switchToGanache}
            >
              <span role='img' aria-label='refresh'>🔄</span> Switch to Ganache Local
            </button>
          </div>
        )}
      </div>
    );
  }

  mainWindow() {
    const {
      isMetaMaskPluginAvailable,
      startWarning,
      errorMessage
    } = this.state;
    return (
      <div className='container-contact100'>
        <div className='wrap-contact100'>
          <form
            onSubmit={this.onSubmit}
            className='contact100-form validate-form'
          >
            <span className='contact100-form-title'>Try Your Luck</span>
            {this.walletStatus()}
            {!isMetaMaskPluginAvailable && startWarning && (
              <div className='metamask-not-found warning'>
                Metamask Not Found
              </div>
            )}
            {errorMessage && (
              <div className='metamask-not-found error-message'>
                {errorMessage}
              </div>
            )}
            {this.state.successMessage && (
              <div className='metamask-success-banner'>
                {this.state.successMessage}
              </div>
            )}
            {this.inputForm()}
            {this.announcements()}
            {this.recentTransactionsCard()}
          </form>
          {this.rules()}
        </div>
      </div>
    );
  }

  rules() {
    return (
      <div className='contact100-more flex-col-c-m'>
        <div className='flex-w size1 p-b-47'>
          <div className='txt1 p-r-25'>
            <span className='lnr lnr-book'></span>
          </div>

          <div className='flex-col size2'>
            <span className='txt1 p-b-20'>Decentralized Lottery App</span>

            <span className='txt2'>
              This lottery contract has a prize pool and a list of people who
              have entered the prize pool. People send some amount of
              money(ether) in the contract. As soon as people send some amount
              of money, they are being recorded as a player. Ethers, that the
              players send, directly goes to the contract account. After a
              certain times, contract manager make the contract to pick a
              winner. Then the contract pick a winner randomly and transfer all
              money from the prize pool to the winner. At that point, the
              lottery contract resets and becomes ready to accept a new list of
              players.
            </span>

            <div className='contract-info-container'>
              <div>Contract Address: {contractInfo.contractAddress}</div>
              <div>
                Monitor Contract Transaction in{' '}
                <a
                  target='_blank'
                  rel='noopener noreferrer'
                  className='remote-link'
                  href='https://rinkeby.etherscan.io/tx/0x3349da25727612e32d292b2fd1f1d2ac5d07b35b9b0f62f356f60d3aa65c6241'
                >
                  EtherScan
                </a>
              </div>
              <div>Developed By Sahil Katkar</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  announcements() {
    const { manager, players, balanceEther } = this.state;
    return (
      <div className='announcement-container'>
        <div className='announcement-title'>
          Announcements
          <div
            className='refresh-button'
            onClick={this.onClickUpdateAnnouncement}
          >
            <span className='refresh-text'>Update Announcements</span>
            <span className='lnr lnr-sync refresh-icon'></span>
          </div>
        </div>
        <div className='announcement-section'>
          <span className='lnr lnr-bullhorn announcement-icon'></span>
          <div className='announcement-status'>
            Minimum <span className='marked-number'>0.01</span> ether is
            required.
          </div>
        </div>
        <div className='announcement-section'>
          <span className='lnr lnr-bullhorn announcement-icon'></span>
          <div className='announcement-status'>
            The contract is managed by{' '}
            <span className='manager-address'>{manager}</span>.
          </div>
        </div>
        <div className='announcement-section'>
          <span className='lnr lnr-bullhorn announcement-icon'></span>
          <div className='announcement-status'>
            Total <span className='marked-number'>{players.length}</span>{' '}
            players already joined here.
          </div>
        </div>
        <div className='announcement-section'>
          <span className='lnr lnr-bullhorn announcement-icon'></span>
          <div className='announcement-status'>
            You may win <span className='marked-number'>{balanceEther}</span>{' '}
            ether !!!.
          </div>
        </div>
        {players && players.length > 0 && (
          <div className='players-list-container'>
            <div className='players-list-title'>Joined Players ({players.length}):</div>
            <ul className='players-list'>
              {players.map((player, idx) => {
                const isCurrent = this.state.userAccount && player.toLowerCase() === this.state.userAccount.toLowerCase();
                const playerName = this.getAccountName(player);
                const shortAddr = `${player.substring(0, 6)}...${player.substring(player.length - 4)}`;
                return (
                  <li key={idx} className='player-item'>
                    <span className='player-badge'>#{idx + 1}</span>
                    <span className='player-name-tag'>
                      <span role='img' aria-label='user'>👤</span> {playerName}
                    </span>
                    <span className='player-address'>({shortAddr})</span>
                    {isCurrent && <span className='you-tag'>★ You</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div className='manager-section'>
          {(() => {
            const isManager = Boolean(
              this.state.userAccount &&
              this.state.manager &&
              this.state.userAccount.toLowerCase() === this.state.manager.toLowerCase()
            );
            if (isManager) {
              const hasPlayers = this.state.players && this.state.players.length > 0;
              if (!hasPlayers) {
                return (
                  <div>
                    <div className='manager-ready-note'>
                      <span role='img' aria-label='crown'>👑</span> You are connected as Contract Manager
                    </div>
                    <div className='manager-warning' style={{ color: '#ffb74d', borderColor: '#ff9800' }}>
                      Lottery is empty right now (0 players). At least 1 player must join before picking a winner.
                    </div>
                    <button
                      type='button'
                      disabled
                      className='custom-button disabled-manager-btn'
                    >
                      <span role='img' aria-label='hourglass'>⏳</span> Pick Winner (Waiting for Players)
                    </button>
                  </div>
                );
              }
              return (
                <div>
                  <div className='manager-ready-note'>
                    <span role='img' aria-label='crown'>👑</span> You are connected as Contract Manager ({this.state.players.length} players ready)
                  </div>
                  <button onClick={this.onClickPickWinner} className='custom-button'>
                    <span role='img' aria-label='trophy'>🏆</span> Pick Winner Now ({this.state.balanceEther} ETH Pool)
                  </button>
                </div>
              );
            }
            return (
              <div>
                <div className='manager-warning'>
                  (Only For Contract Manager)
                  <br />
                  Connected account is a Player. To draw the winner, switch to <b>Sahil_katkar (Manager)</b> in MetaMask.
                </div>
                <button
                  type='button'
                  onClick={this.onClickPickWinner}
                  className='custom-button disabled-manager-btn'
                >
                  <span role='img' aria-label='lock'>🔒</span> Pick Winner (Manager Only)
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  recentTransactionsCard() {
    const { recentTxs } = this.state;
    if (!recentTxs || recentTxs.length === 0) return null;

    return (
      <div className='recent-txs-card'>
        <div className='recent-txs-header'>
          <span>
            <span role='img' aria-label='chain'>⛓️</span> Live Blockchain Activity
          </span>
          <span className='live-badge'>● LIVE</span>
        </div>
        <div className='recent-txs-list'>
          {recentTxs.map(tx => (
            <div key={tx.hash} className='recent-tx-row'>
              <span className={`tx-status-badge ${tx.status === 'SUCCESS' ? 'success' : 'failed'}`}>
                {tx.status === 'SUCCESS' ? '✅ SUCCESS' : '❌ FAILED'}
              </span>
              <span className='tx-type'>{tx.type}</span>
              <span className='tx-name'>{tx.account}</span>
              <span className='tx-amount'>{tx.amount}</span>
              <span className='tx-time'>{tx.time}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  inputForm() {
    return (
      <div>
        <div className='wrap-input100 validate-input'>
          <input
            id='email'
            className='input100'
            type='text'
            name='email'
            placeholder='Amount in ETH (e.g. 0.02)'
            value={this.state.value}
            onChange={event => this.setState({ value: event.target.value, errorMessage: '' })}
          />
          <span className='focus-input100'></span>
        </div>
        <div className='preset-container'>
          <span className='preset-label'>Quick Select:</span>
          {['0.02', '0.05', '0.1', '0.5'].map(amt => (
            <button
              type='button'
              key={amt}
              className={`preset-btn ${this.state.value === amt ? 'preset-active' : ''}`}
              onClick={() => this.setState({ value: amt, errorMessage: '' })}
            >
              {amt} ETH
            </button>
          ))}
        </div>
        <div className='container-contact100-form-btn'>
          <button className='contact100-form-btn'>Join Lottery</button>
        </div>
        <span className='network-warning'>
          Connected network: {this.state.networkName || 'Ethereum Testnet'} (testnet ether).
        </span>
      </div>
    );
  }

  winnerBlastModal() {
    const { winnerInfo } = this.state;
    if (!winnerInfo) return null;

    const winnerName = this.getAccountName(winnerInfo.address);

    return (
      <div className='winner-blast-overlay'>
        <div className='winner-blast-card'>
          <div className='blast-confetti'>
            <span role='img' aria-label='celebrate'>🎉 🏆 🎊 🚀 💰</span>
          </div>
          <h2 className='blast-title'>WINNER ANNOUNCED!</h2>
          <div className='blast-subtitle'>
            The smart contract has chosen a winner and transferred the prize pool!
          </div>

          <div className='blast-winner-box'>
            <div className='blast-label'>WINNER</div>
            <div className='blast-winner-name'>{winnerName}</div>
            <div className='blast-label' style={{ marginTop: '8px' }}>WALLET ADDRESS</div>
            <div className='blast-address'>{winnerInfo.address}</div>
          </div>

          <div className='blast-prize-badge'>
            Prize Won: <span className='blast-amount'>{winnerInfo.prize} ETH</span>
          </div>

          <div>
            <button
              type='button'
              className='blast-close-btn'
              onClick={() => this.setState({ winnerInfo: null })}
            >
              Continue Playing
            </button>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { isTransactionIsRunning, message } = this.state;
    return (
      <div>
        {this.winnerBlastModal()}
        <LoadingOverlay active={isTransactionIsRunning} spinner text={message}>
          {this.mainWindow()}
        </LoadingOverlay>
      </div>
    );
  }
}

export default App;

