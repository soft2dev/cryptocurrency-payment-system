const Router = require('koa-router');
const router = new Router();
const bitcoin = require('bitcoinjs-lib');
var testnet = bitcoin.networks.testnet;
const Q = require('q');

router.get('/', async (ctx) => {
  ctx.body = newWallet();
});

module.exports = router;

/**
 * newWallet - Creates a random new wallet (keypair composed by a private key in WIF format and a public key - address).
 *
 * [String] wif: private key in WIF format
 * [String] address: public key (address)
 */

function newWallet() {
    var keyPair = bitcoin.ECPair.makeRandom({ network: testnet });
    return {
        wif: keyPair.toWIF(),
        address: keyPair.getAddress()
    };
}