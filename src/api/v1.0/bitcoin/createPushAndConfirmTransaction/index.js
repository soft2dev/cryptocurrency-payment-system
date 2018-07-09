const Router = require('koa-router');
const router = new Router();
const bitcoin = require('bitcoinjs-lib');
const Q = require('q');
const request = require('request');
const testnet = bitcoin.networks.testnet;
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

var BLOCKCHAIN_API = {
        GET_ADDRESS: 'https://blockchain.info/pt/address/$address',
        GET_RAW_TX: 'https://blockchain.info/pt/rawtx/$txHash',
        PUSH_TX: 'https://blockchain.info/pt/pushtx',
        DECODE_TX: 'https://blockchain.info/pt/decode-tx',
        GET_BALANCE: 'https://blockchain.info/rawaddr/$address?limit=1'
    };


var ERR_MESSAGES = {
        TRANSACTION_PUSH: 'Error on [pushTransaction]',
        TRANSACTION_DECODE: 'Could not decode the hex of created transaction',
        TRANSACTION_CONFIRMATION_REQUEST: 'Error when requesting confirmation for the transaction',
        TRANSACTION_CONFIRMATION_TIMEOUT: 'Confirmation timeout reached'
    };

router.post('/', async (ctx) => {
    const { body } = ctx.request;
    const { fromWIF,fromAddress,toAddress,value,opt_timeout,opt_interval } = body; 
    ctx.body = exports.checkTransaction(fromWIF, fromAddress, toAddress, value, opt_timeout, opt_interval);
});

module.exports = router;
exports.checkTransaction = function(fromWIF, fromAddress,toAddress, value, opt_timeout, opt_interval) {
    var timeout = (opt_timeout || null) === null ? /* 0.5 hour */ 30 * 60 * 1000 : parseInt(opt_timeout);
    var interval = (opt_interval || null) === null ? /* 1 minute */ 60 * 1000 : parseInt(opt_interval);
    var deffered = Q.defer();
    var maxTimeout = 0;
    var timer = setInterval(function() {
        if (maxTimeout <= timeout) {
            exports.getBalance(fromAddress)
                .then(function(result) {
                    value = value*Math.pow(10, 8);
                    if (result.final_balance >= value) {
                        return exports.createPushAndConfirmTransaction(fromWIF, result.txs[0].hash, toAddress, value, opt_timeout, opt_interval)
                    }
                })
                .catch(function(error) {
                    deffered.reject(new TransactionOperationError(true, ERR_MESSAGES.TRANSACTION_CONFIRMATION_REQUEST, error));
                    clearInterval(timer);
                });
            maxTimeout = interval + maxTimeout;
        } else {
            deffered.reject(new TransactionOperationError(true, ERR_MESSAGES.TRANSACTION_CONFIRMATION_TIMEOUT, error));
            clearInterval(timer);
        }
    }, interval);
}
exports.createPushAndConfirmTransaction = function(fromWIF, txHashOrigin, toAddress, value, opt_timeout, opt_interval) {

    var timeout = (opt_timeout || null) === null ? /* 1.5 hour */ 90 * 60 * 1000 : parseInt(opt_timeout);
    var interval = (opt_interval || null) === null ? /* 1 minute */ 60 * 1000 : parseInt(opt_interval);
    var deffered = Q.defer();
        
    var transaction = exports.newTransaction(fromWIF, txHashOrigin, toAddress, value);
    var txId = '';
    exports.decodeTransaction(transaction.hex)
        .then(function(txJson) {
            txId = txJson.hash;
            return exports.pushTransaction(transaction.hex);
        })
        .catch(function(error) {
            deffered.reject(new TransactionOperationError(false, ERR_MESSAGES.TRANSACTION_DECODE, error));
        })
        .then(function() {
            var maxTimeout = 0;
            var timer = setInterval(function() {
                if (maxTimeout <= timeout) {
                    exports.getTransaction(txId)
                        .then(function(transactionResult) {
                            if (result.block_height > 0) {
                                deffered.resolve(new TransactionOperationResult(transaction, transactionResult, txId));
                            }
                        })
                        .catch(function(error) {
                            deffered.reject(new TransactionOperationError(true, ERR_MESSAGES.TRANSACTION_CONFIRMATION_REQUEST, error));
                            clearInterval(timer);
                        });
                    maxTimeout = interval + maxTimeout;
                } else {
                    deffered.reject(new TransactionOperationError(true, ERR_MESSAGES.TRANSACTION_CONFIRMATION_TIMEOUT, error));
                    clearInterval(timer);
                }
            }, interval);
        })
        .catch(function(error) {
            deffered.reject(new TransactionOperationError(false, ERR_MESSAGES.TRANSACTION_PUSH, error));
        });
    return deffered.promise;
}

/**
* Gets information from an address in the blockchain.
* Arguments
* [String] address: the address of the wallet.
* Returns
* [Promise] A Q promise with the HTTP result. JSON result is resolved to resolved.data.
* Tip: the returned final_balance property of the transaction JSON contains the wallet's balance.
*/

    exports.getWallet = function(address) {
        var deffered = Q.defer();
        request.get({
            url: BLOCKCHAIN_API.GET_ADDRESS.replace('$address', address),
            qs: {
                format: 'json'
            },
            json: true
        }, function(err, httpResponse, body) {
            if (err) {
                deffered.reject(err);
            } else {
                var wallet = body;
                body.$$httpResponse = httpResponse;
                deffered.resolve(wallet);
            }
        });
        return deffered.promise;
    }

    exports.getBalance = function(address) {
        var deffered = Q.defer();
        request.get({
            url: BLOCKCHAIN_API.GET_BALANCE.replace('$address', address),
            qs: {
                format: 'json'
            },
            json: true
        }, function(err, httpResponse, body) {
            if (err) {
                deffered.reject(err);
            } else {
                var balance = body;
                body.$$httpResponse = httpResponse;
                return deffered.resolve(balance);
            }
        });
        
        return deffered.promise;
    }

    /**
     *  newTransaction(fromWIF, txHashOrigin, toAddress, value)
     *  Creates a transaction.
     *  Arguments
     *  [String] fromWIF: private key in WIF format of the origin wallet.
     *  [String] txHashOrigin: the last transaction hash to the origin wallet.
     *  [String] toAddress: the public key (address) of the destination wallet.
     *  [Number, int] value: the amount to transfer in uBTC (microbitcoins).
     *  Returns
     *  
     *  [String] hex: the transaction hex script to push into the blockchain.
     */
    exports.newTransaction = function(fromWIF, txHashOrigin, toAddress, value) {
        var kpFrom = bitcoin.ECPair.fromWIF(fromWIF,testnet);
        //var kpFrom = bitcoin.ECPair.fromWIF(fromWIF);
     
        var tx = new bitcoin.TransactionBuilder(testnet);
        tx.addInput(txHashOrigin, 0);
        tx.addOutput(toAddress, value);
        var privateKeyWIF = fromWIF;
        var kpFrom = bitcoin.ECPair.fromWIF(privateKeyWIF,testnet);
        tx.sign(0, kpFrom);
        return {
            hex: tx.build().toHex()
        };
    }

    /**
     *  getTransaction(txHash)
     *  Gets a transaction from the blockchain.
     *  Arguments
     *   [String] hexTx: the transaction hex script to push into the blockchain.
     *  Returns
     *   [Promise] A Q promise with the HTTP result. JSON result is resolved to resolved.data.
     */

    exports.getTransaction = function(txHash) {
        var deffered = Q.defer();
        request.get({
            url: BLOCKCHAIN_API.GET_RAW_TX.replace('$txHash', txHash),
            json: true
        }, function(err, httpResponse, body) {
            if (err) {
                deffered.reject(err);
            } else {
                var transaction = body;
                transaction.$$httpResponse = httpResponse;
                deffered.resolve(transaction);
            }
        });
        return deffered.promise;
    }
    /**    
    pushTransaction(hexTx)
    Pushes a transaction to the blockchain.
    Arguments
        [String] hexTx: the transaction hex script to push into the blockchain.
    Returns
        [Promise] A Q promise with the HTTP result.
    */
    exports.pushTransaction = function(hexTx) {
        var deffered = Q.defer();
        request.post({
            url: BLOCKCHAIN_API.PUSH_TX,
            form: {
                tx: hexTx
            }
        }, function(err, httpResponse, body) {
            if (err) {
                deffered.reject(err);
            } else {
                deffered.resolve({
                    httpResponse: httpResponse,
                    data: body
                });
            }
        });
        return deffered.promise;
    }

    exports.decodeTransaction = function(hex) {
        var deffered = Q.defer();
        request.post({
            url: BLOCKCHAIN_API.DECODE_TX,
            form: {
                tx: hex
            }
        }, function(err, httpResponse, body) {
            if (err) {
                deffered.reject(err);
            } else {
                var result = body;
                const dom = new JSDOM(body);
                body.$$httpResponse = httpResponse;
                var obj = JSON.parse(dom.window.document.querySelector(".prettyprint").textContent);
                deffered.resolve(obj);
            }
        });
        return deffered.promise;
    }
    function TransactionOperationError(isPushed, reason, opt_error) {
        this.txPushed = isPushed;
        this.reason = reason;
        this.error = opt_error || null;
    }

    function TransactionOperationResult(txSent, txConfirmed, decodedHash) {
        this.txSent = sentTx;
        this.txConfirmed = confirmedTx;
        this.decodedHash = decodedHash;
    }