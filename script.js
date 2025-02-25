// Constants
const babyXAddress = "0x2E2A9Cc28922FfB239000F8fa23D753DAAf71A69";
const xAddress = "0xA6C4790cc7Aa22CA27327Cb83276F2aBD687B55b";
const proxyUrl = "https://cors-anywhere.herokuapp.com/"; // Public CORS proxy (for testing)
let pairsData = [];

// Fetch General Token Info
async function fetchTokenInfo(tokenAddress, decimals, nameId, holdersId, supplyId) {
    try {
        const tokenResponse = await fetch(`${proxyUrl}https://api.scan.pulsechain.com/api/v2/tokens/${tokenAddress}`);
        const tokenData = await tokenResponse.json();
        document.getElementById(nameId).textContent = tokenData.name;
        document.getElementById(holdersId).textContent = tokenData.holders;

        const supplyResponse = await fetch(`${proxyUrl}https://api.scan.pulsechain.com/api/v2/smart-contracts/${tokenAddress}/query-read-method`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                args: [],
                method_id: "18160ddd",
                contract_type: "regular"
            })
        });
        const supplyData = await supplyResponse.json();
        const supply = supplyData?.result?.output?.[0]?.value ? (parseFloat(supplyData.result.output[0].value) / (10 ** decimals)).toLocaleString() : "0";
        document.getElementById(supplyId).textContent = supply;
    } catch (error) {
        console.error(`Error fetching token info for ${tokenAddress}:`, error);
    }
}

// Fetch Baby X Pairs
async function fetchPairs() {
    try {
        const response = await fetch(`${proxyUrl}https://api.dexscreener.com/latest/dex/tokens/${babyXAddress}`);
        const data = await response.json();
        pairsData = data.pairs.filter(pair => pair.chainId === "pulsechain");

        const pairsTable = document.getElementById("pairsTable");
        let totalTVL = 0;
        pairsTable.innerHTML = "";
        pairsData.forEach(pair => {
            if (pair.liquidity?.usd) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${pair.pairAddress}</td>
                    <td>${pair.baseToken.symbol}/${pair.quoteToken.symbol}</td>
                    <td>$${pair.liquidity.usd.toLocaleString()}</td>
                `;
                pairsTable.appendChild(row);
                totalTVL += pair.liquidity.usd;
            }
        });
        document.getElementById("totalTVL").textContent = `$${totalTVL.toLocaleString()}`;
    } catch (error) {
        console.error("Error fetching pairs:", error);
    }
}

// Fetch Wallet Stats
async function fetchWalletStats() {
    const walletAddress = document.getElementById("walletAddress").value.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        alert("Invalid wallet address.");
        return;
    }
    document.getElementById("walletStats").style.display = "block";

    try {
        // Baby X Balance
        const babyXBalanceResponse = await fetch(`${proxyUrl}https://api.scan.pulsechain.com/api/v2/smart-contracts/${babyXAddress}/query-read-method`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                args: [walletAddress],
                method_id: "70a08231",
                contract_type: "regular"
            })
        });
        const babyXBalanceData = await babyXBalanceResponse.json();
        const babyXBalance = babyXBalanceData?.result?.output?.[0]?.value ? parseFloat(babyXBalanceData.result.output[0].value) / 1e9 : 0;
        document.getElementById("babyXBalance").textContent = babyXBalance.toLocaleString();

        // X Balance
        const xBalanceResponse = await fetch(`${proxyUrl}https://api.scan.pulsechain.com/api/v2/smart-contracts/${xAddress}/query-read-method`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                args: [walletAddress],
                method_id: "70a08231",
                contract_type: "regular"
            })
        });
        const xBalanceData = await xBalanceResponse.json();
        const xBalance = xBalanceData?.result?.output?.[0]?.value ? parseFloat(xBalanceData.result.output[0].value) / 1e18 : 0;
        document.getElementById("xBalance").textContent = xBalance.toLocaleString();

        // X Rewards
        const rewardsResponse = await fetch(`${proxyUrl}https://api.scan.pulsechain.com/api/v2/smart-contracts/${babyXAddress}/query-read-method`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                args: [walletAddress],
                method_id: "aceac856",
                contract_type: "regular"
            })
        });
        const rewardsData = await rewardsResponse.json();
        const rewards = rewardsData?.result?.output?.[1]?.value ? parseFloat(rewardsData.result.output[1].value) / 1e18 : 0;
        document.getElementById("xRewards").textContent = rewards.toLocaleString();

        // Prices
        const xPriceResponse = await fetch(`${proxyUrl}https://api.scan.pulsechain.com/api/v2/tokens/${xAddress}/price`);
        const xPriceData = await xPriceResponse.json();
        const xPrice = xPriceData.price?.usd || 0;
        document.getElementById("xPrice").textContent = `$${xPrice}`;

        const babyXPrice = pairsData[0]?.priceUsd || 0;
        document.getElementById("babyXPrice").textContent = `$${babyXPrice}`;

        // LP Token Holdings
        const lpTable = document.getElementById("lpTable");
        lpTable.innerHTML = "";
        let totalLPValue = 0;
        for (const pair of pairsData) {
            if (!pair.liquidity?.usd) continue;
            const lpTokenAddress = pair.pairAddress;
            const lpBalanceResponse = await fetch(`${proxyUrl}https://api.scan.pulsechain.com/api/v2/smart-contracts/${lpTokenAddress}/query-read-method`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    args: [walletAddress],
                    method_id: "70a08231",
                    contract_type: "regular"
                })
            });
            const lpBalanceData = await lpBalanceResponse.json();
            const lpBalance = lpBalanceData?.result?.output?.[0]?.value ? parseFloat(lpBalanceData.result.output[0].value) / 1e18 : 0;

            const lpTotalSupplyResponse = await fetch(`${proxyUrl}https://api.scan.pulsechain.com/api/v2/smart-contracts/${lpTokenAddress}/query-read-method`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    args: [],
                    method_id: "18160ddd",
                    contract_type: "regular"
                })
            });
            const lpTotalSupplyData = await lpTotalSupplyResponse.json();
            const lpTotalSupply = lpTotalSupplyData?.result?.output?.[0]?.value ? parseFloat(lpTotalSupplyData.result.output[0].value) / 1e18 : 0;

            const lpValue = lpTotalSupply > 0 ? (lpBalance / lpTotalSupply) * pair.liquidity.usd : 0;
            if (lpBalance > 0) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${pair.baseToken.symbol}/${pair.quoteToken.symbol}</td>
                    <td>${lpTokenAddress}</td>
                    <td>${lpBalance.toLocaleString()}</td>
                    <td>$${lpValue.toLocaleString()}</td>
                `;
                lpTable.appendChild(row);
                totalLPValue += lpValue;
            }
        }
        document.getElementById("totalLPValue").textContent = `$${totalLPValue.toLocaleString()}`;

        // Total Portfolio Value
        const babyXValue = babyXBalance * babyXPrice;
        const xValue = (xBalance + rewards) * xPrice;
        const totalPortfolioValue = babyXValue + xValue + totalLPValue;
        document.getElementById("totalPortfolioValue").textContent = `$${totalPortfolioValue.toLocaleString()}`;
    } catch (error) {
        console.error(`Error fetching wallet stats for ${walletAddress}:`, error);
    }
}

// Initial Load
window.onload = () => {
    fetchTokenInfo(babyXAddress, 9, "babyXName", "babyXHolders", "babyXSupply");
    fetchTokenInfo(xAddress, 18, "xName", "xHolders", "xSupply");
    fetchPairs();
};
