// donate-dogecoin Copyright (GPL) 2016  Nathan Robinson
// modified to work with dogecoin by Max Lee aka Phoenix616

var address = "DHHkwioXcUGxC8PfASsAFdpMLKbSsEMkqo"; // The dogecoin address to receive donations. Change to yours
var popup = false; // Set to true if you want a popup to pay dogecoin
var currencyCode = "EUR"; // Change to your default currency. Choose from https://chain.so/api#get-prices
var qrcode = true; // Set to false to disable qrcode
var message = true; // Set to false to disable showing of the message
var organization = "Moep.tv"; // Change to your organization name
var mbits = false; // Set to false to display dogecoin traditionally
var defaultAmountToDonate = 5; // Default amount to donate
var defaultCurrency = 'EUR'; // Default currency to fallback

var params = {};

if (location.hash) {
    var parts = location.hash.substring(location.hash.indexOf("/") == 1 ? 2 : 1).split('/');
    var directLength = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
        if (parts[i].indexOf("=") != -1) {
            var nv = parts[i].split('=');
            params[nv[0]] = nv[1];
            directLength = -1;
        } else if (directLength != -1) {
            directLength++;
        }
    }
    
    // this is a mess, works but needs to be improved
    if (directLength > 0) {
        if (directLength == 1) {
            if (isNaN(parts[0]) === false) {
                params.amount = parts[0];
            } else if (validAddress(parts[0])) {
                params.address = parts[0];
            } else {
                params.name = parts[0];
            }
        } else if (directLength == 2) {
            if (isNaN(parts[1]) === false) {
                if (validAddress(parts[0])) {
                    params.address = parts[0];
                } else {
                    params.name = parts[0];
                }
                params.amount = parts[1];
            } else if (isNaN(parts[0]) === false) {
                params.amount = parts[0];
                params.currency = parts[1];
            } else {
                if (validAddress(parts[0])) {
                    params.address = parts[0];
                    if (parts[1].length == 3) {
                        params.currency = parts[1];
                    } else {
                        params.name = parts[1];
                    }
                } else {
                    params.name = parts[0];
                    params.currency = parts[1];
                }
            }
        } else if (directLength == 3) {
            if (validAddress(parts[0])) {
                params.address = parts[0];
                if (isNaN(parts[1]) === false) {
                    params.amount = parts[1];
                    params.currency = parts[2];
                } else {
                    params.name = parts[1];
                    if (isNaN(parts[2]) === false) {
                        params.amount = parts[2];
                    } else {
                        params.currency = parts[2];
                    }
                }
            } else {
                params.name = parts[0];
                params.amount = parts[1];
                params.currency = parts[2];
            }
        } else if (directLength == 4) {
            params.address = parts[0];
            params.name = parts[1];
            params.amount = parts[2];
            params.currency = parts[3];
        }
    }
}

function turnName(data) {
    data = data.replace("%20", " ");
    var ignoreHyphen = false;
    var returnstring = "";
    for (i = 0; i < data.length; i++) {
        if (data[i] != "-" ) {
            returnstring = returnstring + data[i];
        }
    
        if (data[i] == "-" && data[i+1] == "-") {
            returnstring = returnstring + "-";
            ignoreHyphen = true
        }
    
        if (data[i] == "-" && ignoreHyphen == false) {
            returnstring = returnstring + " ";
            ignoreHyphen = false;
        }
    }
    return returnstring
}

if (params.address){address = params.address;}
if (params.popup == "true"){popup = true};
if (params.popup == "false"){popup = false};
if (params.currency){currencyCode = params.currency.toUpperCase();}
if (params.qrcode == "true"){qrcode = true};
if (params.qrcode == "false"){qrcode = false};
if (params.message == "true"){message = true};
if (params.message == "false"){message = false};
if (params.name){organization = turnName(params.name);}

if (params.mbits == "true"){mbits = true};
if (params.mbits == "false"){mbits = false};


function getPrice(currencyExchangeResponse) {
    try {
        var amount = 0;
        var sum = 0;
        for (var i = 0; i < currencyExchangeResponse["data"]["prices"].length; i++) {
            var price = Number(currencyExchangeResponse["data"]["prices"][i]["price"]);
            if (price > 0) {
                amount++;
                sum += price;
            }
        }
        if (amount > 0) {
            return sum / amount;
        }
    } catch (err) {
        handlePricingError(currencyExchangeResponse);
    }
    return -1;
}

function drawCurrencyButton() {
  document.getElementById("fiatcurrency").innerText = currencyCode;
}

function drawDonationElements(url, donateDisplayMessage) {
    drawCurrencyButton();
    if (qrcode == true) {
        document.getElementById("qrcodePlaceHolder").innerHTML = "";
        $('#qrcodePlaceHolder').qrcode(url);
        document.getElementById("qrcodeLink").href = url;
    }
    if (message == true) {
        document.getElementById("donatetext").innerHTML = "<br>" + donateDisplayMessage + " (<a href='" + url + "'>link</a>)";
    }
}

function donate() {
    $.getJSON(`https://chain.so/api/v2/get_price/BTC/${currencyCode}`, function(btcExchangeResponse) {
        var fiatDonationAmount = getFiatDonationAmount();
        var bitcoinPrice = getPrice(btcExchangeResponse);
        $.getJSON(`https://chain.so/api/v2/get_price/DOGE/BTC`, function(dogeExchangeResponse) {
            var dogecoinPrice = getPrice(dogeExchangeResponse);
            if (bitcoinPrice <= 0 || dogecoinPrice <= 0) {
                return;
            }
            var dogecoinAmountToDonate = computeDogecoinAmount(fiatDonationAmount, dogecoinPrice, bitcoinPrice);
            var donationElements = composeDonationElements(dogecoinAmountToDonate, fiatDonationAmount);
            drawDonationElements(donationElements.url, donationElements.message);
        });
    });
}

function handlePricingError(currencyExchangeResponse) {
    alert(`Could not request exchgange rates for ${currencyCode}`);
}

function computeDogecoinAmount(fiatDonationAmount, dogecoinPrice, bitcoinPrice) {
    return ((fiatDonationAmount / bitcoinPrice) / dogecoinPrice).toFixed(0);
}

function noValidInput(fiatUserInput) {
    return isNaN(fiatUserInput) == true;
}

function validAmountRequestedInUrl() {
    return isNaN(params.amount) == false;
}

function validAddress(addressInput) {
    return (addressInput.startsWith("D") && addressInput.length > 25 && addressInput.length < 35);
}

function getFiatDonationAmount() {
    // if user sets an amount, we will use it
    var fiatUserInput = parseFloat(document.getElementById("donatebox").value);
    if (noValidInput(fiatUserInput) && !validAmountRequestedInUrl()) {
        return defaultAmountToDonate;
    } else if (noValidInput(fiatUserInput) && validAmountRequestedInUrl()) {
        return params.amount;
    }
    return fiatUserInput;
}

function composeDonationElements(dogecoinAmountToDonate, fiatDonationAmount) {
    var url = "dogecoin:" + address + "?amount=" + dogecoinAmountToDonate + "&message=Payment%20to%20" + organization;
    var fiatAmountToDonateMessage = " (" + fiatDonationAmount + " " + currencyCode + ") " + "to <span onclick=\"selectText(this)\">" + address + "</span>";
    var donateDisplayMessage = " Please send " + dogecoinAmountToDonate.toString() + " Dogecoin" + fiatAmountToDonateMessage;
    return {
        url: url,
        message: donateDisplayMessage
    };
}


function selectText(el) {
    if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof document.selection != "undefined" && typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.select();
    }
}

$(document).keyup(function (e) {
    if ($(".input1:focus") && (e.keyCode === 13)) {
       donate();
    }
 });
