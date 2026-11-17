const $ = id => document.getElementById(id);

const DEFAULT_WALLETS = [
  {label:"Vitalik Buterin",address:"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",type:"PERSONAL · ATRIBUCIÓN PÚBLICA"},
  {label:"Rain Lohmus",address:"0x2B6eD29A95753C3Ad948348e3e7b1A251080Ffb9",type:"PERSONAL · SE REPORTÓ PÉRDIDA DE CLAVES"},
  {label:"Ethereum Foundation",address:"0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe",type:"ORGANIZACIÓN"},
  {label:"Binance 7",address:"0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8",type:"CUSTODIA DE EXCHANGE"},
  {label:"Beacon Deposit Contract",address:"0x00000000219ab540356cBB839Cbe05303d7705Fa",type:"CONTRATO DE PROTOCOLO"},
  {label:"WETH",address:"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",type:"CONTRATO DE TOKEN"},
  {label:"Arbitrum Bridge",address:"0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a",type:"CONTRATO DE PUENTE"},
  {label:"Base Portal",address:"0x49048044D57e1C92A77f79988d21Fa8fAF74E97e",type:"CONTRATO DE PUENTE"}
];

const STORE = "ethWhaleTracker.wallets.v1";
const money = value => new Intl.NumberFormat("es-MX", {
  style:"currency", currency:"USD", maximumFractionDigits:2
}).format(value);
const compact = value => new Intl.NumberFormat("es-MX", {
  notation:"compact", maximumFractionDigits:2
}).format(value);

function getWallets() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    return Array.isArray(saved) ? saved : DEFAULT_WALLETS;
  } catch {
    return DEFAULT_WALLETS;
  }
}

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function showUnavailableMarket(message) {
  $("marketCap").textContent = "No disponible";
  $("volume").textContent = "No disponible";
  $("supply").textContent = "No disponible";
  $("marketMeta").textContent = message;
  $("chart").textContent = "El historial de precios no está disponible en este momento.";
}

async function market() {
  let coin = null;

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false"
    );
    if (!response.ok) throw new Error("CoinGecko HTTP " + response.status);
    coin = await response.json();
  } catch (primaryError) {
    // Respaldo 1: precio spot en USD de Coinbase.
    try {
      const response = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot");
      if (!response.ok) throw new Error("Coinbase HTTP " + response.status);
      const payload = await response.json();
      const spot = Number(payload.data.amount);
      if (!Number.isFinite(spot) || spot <= 0) throw new Error("Precio no válido");

      $("ethPrice").textContent = money(spot);
      $("ethChange").textContent = "Variación 24 h: no disponible";
      $("ethChange").className = "change";
      showUnavailableMarket("Precio de respaldo: Coinbase · CoinGecko no respondió.");
      return;
    } catch (backupError) {
      // Respaldo 2: cotización ETH/USDT de Binance.
      try {
        const response = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT");
        if (!response.ok) throw new Error("Binance HTTP " + response.status);
        const payload = await response.json();
        const spot = Number(payload.lastPrice);
        const change = Number(payload.priceChangePercent);
        if (!Number.isFinite(spot) || spot <= 0) throw new Error("Precio no válido");

        $("ethPrice").textContent = money(spot);
        $("ethChange").textContent = (change >= 0 ? "+" : "") + change.toFixed(2) + "% · 24 h";
        $("ethChange").className = "change " + (change >= 0 ? "up" : "down");
        showUnavailableMarket("Precio de respaldo: par ETH/USDT de Binance (referencia aproximada en USD).");
        return;
      } catch (lastError) {
        $("ethPrice").textContent = "Sin cotización";
        $("ethChange").textContent = "Fuentes no disponibles";
        $("ethChange").className = "change";
        showUnavailableMarket("No se pudo consultar CoinGecko, Coinbase ni Binance. Comprueba tu conexión.");
        throw lastError;
      }
    }
  }

  const data = coin.market_data;
  const change = Number(data.price_change_percentage_24h);
  $("ethPrice").textContent = money(data.current_price.usd);
  $("ethChange").textContent = (change >= 0 ? "+" : "") + change.toFixed(2) + "% · 24 h";
  $("ethChange").className = "change " + (change >= 0 ? "up" : "down");
  $("marketMeta").textContent =
    "Máximo 24 h: " + money(data.high_24h.usd) + " · mínimo: " + money(data.low_24h.usd);
  $("marketCap").textContent = "$" + compact(data.market_cap.usd);
  $("volume").textContent = "$" + compact(data.total_volume.usd);
  $("supply").textContent = compact(data.circulating_supply) + " ETH";

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=1&interval=hourly"
    );
    if (!response.ok) throw new Error("Historial no disponible");
    const history = await response.json();
    if (history.prices && history.prices.length) drawChart(history.prices);
    else $("chart").textContent = "Historial de precios no disponible.";
  } catch {
    $("chart").textContent = "El precio está disponible; el historial gráfico no respondió.";
  }
}

function drawChart(points) {
  const values = points.map(point => point[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 900, height = 220, padding = 8;
  const range = max - min || 1;
  const coordinates = values.map((value, index) => [
    padding + index / (values.length - 1) * (width - 2 * padding),
    height - padding - (value - min) / range * (height - 2 * padding)
  ]);
  const line = coordinates.map((point, index) =>
    (index ? "L" : "M") + point[0].toFixed(1) + " " + point[1].toFixed(1)
  ).join(" ");
  const area = line + " L " + (width - padding) + " " + height + " L " + padding + " " + height + " Z";

  $("chart").innerHTML =
    '<svg viewBox="0 0 ' + width + " " + height + '" preserveAspectRatio="none" role="img" aria-label="Historial del precio de ETH de las últimas 24 horas">' +
    '<defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">' +
    '<stop offset="0%" stop-color="#69d8c4" stop-opacity=".24"/>' +
    '<stop offset="100%" stop-color="#69d8c4" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="' + area + '" fill="url(#fill)"/>' +
    '<path d="' + line + '" fill="none" stroke="#78e3d1" stroke-width="2.3" vector-effect="non-scaling-stroke"/>' +
    '</svg>';
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[character]));
}

async function getBalance(address, id) {
  const endpoints = [
    "https://ethereum-rpc.publicnode.com",
    "https://cloudflare-eth.com"
  ];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          jsonrpc:"2.0", method:"eth_getBalance", params:[address,"latest"], id
        })
      });
      if (!response.ok) throw new Error("RPC HTTP " + response.status);
      const result = await response.json();
      if (result.error || !result.result) throw new Error("Respuesta RPC no válida");
      return (Number(BigInt(result.result)) / 1e18).toLocaleString("es-MX", {
        maximumFractionDigits:3
      }) + " ETH";
    } catch {
      // Intentar el siguiente nodo público.
    }
  }
  return "No disponible";
}

async function loadWallets() {
  const addresses = getWallets();
  $("walletCount").textContent = addresses.length;
  $("walletPill").textContent = addresses.length + " DIRECCIONES";

  $("walletRows").innerHTML = addresses.map((wallet, index) =>
    '<tr><td><b>' + escapeHTML(wallet.label || "Cartera sin etiqueta") + '</b></td>' +
    '<td class="address">' + wallet.address.slice(0, 10) + "…" + wallet.address.slice(-8) + '</td>' +
    '<td><span class="tag">' + escapeHTML(wallet.type || "AGREGADA POR EL USUARIO") + '</span></td>' +
    '<td class="balance" id="bal-' + index + '">Consultando…</td>' +
    '<td><a href="https://etherscan.io/address/' + wallet.address +
    '" target="_blank" rel="noreferrer">Etherscan ↗</a></td></tr>'
  ).join("");

  await Promise.all(addresses.map(async (wallet, index) => {
    $("bal-" + index).textContent = await getBalance(wallet.address, index + 1);
  }));
}

function addWallet() {
  const address = $("walletAddress").value.trim();
  const label = $("walletLabel").value.trim() || "Cartera personalizada";

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    notify("Introduce una dirección válida de Ethereum (42 caracteres).");
    return;
  }

  const addresses = getWallets();
  if (addresses.some(wallet => wallet.address.toLowerCase() === address.toLowerCase())) {
    notify("Esa dirección ya está en tu lista.");
    return;
  }

  addresses.push({
    label,
    address,
    type:"AGREGADA POR EL USUARIO · SIN VERIFICAR"
  });

  localStorage.setItem(STORE, JSON.stringify(addresses));
  $("walletAddress").value = "";
  $("walletLabel").value = "";
  loadWallets();
  notify("Cartera agregada a este navegador.");
}

async function refresh() {
  $("refresh").disabled = true;
  try {
    await market();
    notify("Datos del mercado actualizados.");
  } catch {
    notify("No se pudieron consultar los datos del mercado.");
  }
  await loadWallets();
  $("lastUpdated").textContent = new Date().toLocaleString("es-MX");
  $("refresh").disabled = false;
}

$("refresh").addEventListener("click", refresh);
$("addWallet").addEventListener("click", addWallet);
$("walletAddress").addEventListener("keydown", event => {
  if (event.key === "Enter") addWallet();
});
refresh();
