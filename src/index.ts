import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle'
import { BigNumber, providers, Wallet } from 'ethers'

require('dotenv').config()

// FakeArtMinter contract on Goerli
const testContract = '0x20EE855E43A7af19E407E39E5110c2C1Ee41F64D'

// Required data
const HEX_DATA = '0x1249c58b'
const CONTRACT_ADDRESS = '0x20EE855E43A7af19E407E39E5110c2C1Ee41F64D'

// The amount of which the average gas price will be multiplied for maxFeePerGas
// => 1.1 equals 10% increase; 1.5 equals 50% increase...
const GAS_LIMIT_MULTIPLIER = 1.1

const CHAIN_ID = 5
const FLASHBOTS_ENDPOINT = 'https://relay-goerli.flashbots.net'

const provider = new providers.InfuraProvider(CHAIN_ID)

if (process.env.WALLET_PRIVATE_KEY === undefined) {
  console.error('Please provide WALLET_PRIVATE_KEY in .env')
  process.exit(1)
}

const wallet = new Wallet(process.env.WALLET_PRIVATE_KEY, provider)

const GWEI = BigNumber.from(10).pow(9)
const ETHER = BigNumber.from(10).pow(18)

// Custom gas oracle
const getAverageGasFromBlock = async (blockNumber: number) => {
  const block = await provider.getBlockWithTransactions(blockNumber)

  let gasPrices: Array<BigNumber> = block.transactions.map((tx: any) => {
    return tx.gasPrice
  })

  let sum: number = 0
  gasPrices.forEach((gasPrice: BigNumber) => {
    sum += gasPrice.toNumber()
  })

  const averageGasPrice: BigNumber = BigNumber.from(Math.round(sum / gasPrices.length))

  return averageGasPrice
}

const main = async () => {
  const flashbotsProvider = await FlashbotsBundleProvider.create(
    provider, 
    Wallet.createRandom(), 
    FLASHBOTS_ENDPOINT
  )

  provider.on('block', async (blockNumber) => {
    console.log(blockNumber)

    const averageGasPrice = await getAverageGasFromBlock(blockNumber - 1)
    const maxGasPrice = BigNumber.from(Math.round(averageGasPrice.toNumber() * GAS_LIMIT_MULTIPLIER))

    const bundleSumbitResponse = await flashbotsProvider.sendBundle([
      {
        transaction: {
          chainId: CHAIN_ID,
          type: 2,
          value: ETHER.div(100).mul(3),
          data: HEX_DATA,
          maxFeePerGas: maxGasPrice,
          maxPriorityFeePerGas: GWEI.mul(2),
          to: CONTRACT_ADDRESS
        },
        signer: wallet
      }
    ], blockNumber + 1)

    if ('error' in bundleSumbitResponse) {
      console.log(bundleSumbitResponse.error.message)
      return
    }
  })
}   

main()