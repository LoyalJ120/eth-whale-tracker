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

const usd = value => new Intl.NumberFormat("es-MX", {
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

async function requestJSON(url, timeoutMs = 6500) {
  const response = await fetch(url, {
    method:"GET",
    mode:"cors",
    credentials:"omit",
    cache:"no-store",
    signal:AbortSignal.timeout(timeoutMs),
    headers:{"Accept":"application/json"}
  });
  if (!response.ok) throw new Error(new URL(url).hostname + " respondió HTTP " + response.status);
  return response.json();
}

function normalizePrice(price, change, source, details = {}) {
  if (!Number.isFinite(price) || price <= 0) throw new Error("La fuente devolvió un precio no válido");
  return {
    price,
    change: Number.isFinite(change) ? change : null,
    source,
    high: Number.isFinite(details.high) ? details.high : null,
    low: Number.isFinite(details.low) ? details.low : null,
    marketCap: Number.isFinite(details.marketCap) ? details.marketCap : null,
    volume: Number.isFinite(details.volume) ? details.volume : null,
    supply: Number.isFinite(details.supply) ? details.supply : null,
    approximate: Boolean(details.approximate)
  };
}

async function fromKraken() {
  const data = await requestJSON("https://api.kraken.com/0/public/Ticker?pair=ETHUSD");
  if (data.error && data.error.length) throw new Error(data.error.join(", "));
  const ticker = Object.values(data.result || {})[0];
  if (!ticker) throw new Error("Kraken no devolvió el par ETH/USD");
  const price = Number(ticker.c && ticker.c[0]);
  const open = Number(ticker.o);
  const change = open > 0 ? ((price - open) / open) * 100 : null;
  return normalizePrice(price, change, "Kraken · ETH/USD", {
    high:Number(ticker.h && ticker.h[1]),
    low:Number(ticker.l && ticker.l[1]),
    volume:Number(ticker.v && ticker.v[1]) * price
  });
}

async function fromCoinbase() {
  const data = await requestJSON("https://api.coinbase.com/v2/prices/ETH-USD/spot");
  return normalizePrice(Number(data.data && data.data.amount), null, "Coinbase · ETH/USD");
}

async function fromCoinGecko() {
  const data = await requestJSON("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true");
  const eth = data.ethereum || {};
  return normalizePrice(Number(eth.usd), Number(eth.usd_24h_change), "CoinGecko · ETH/USD");
}

async function fromBinance() {
  const data = await requestJSON("https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT");
  return normalizePrice(Number(data.lastPrice), Number(data.priceChangePercent), "Binance · ETH/USDT", {
    high:Number(data.highPrice),
    low:Number(data.lowPrice),
    volume:Number(data.quoteVolume),
    approximate:true
  });
}

async function fromCoinPaprika() {
  const data = await requestJSON("https://api.coinpaprika.com/v1/tickers/eth-ethereum");
  const quote = data.quotes && data.quotes.USD;
  return normalizePrice(Number(quote && quote.price), Number(quote && quote.percent_change_24h), "CoinPaprika · ETH/USD", {
    marketCap:Number(quote && quote.market_cap),
    volume:Number(quote && quote.volume_24h),
    supply:Number(data.circulating_supply)
  });
}

async function getLivePrice() {
  const providers = [fromKraken, fromCoinbase, fromCoinGecko, fromBinance, fromCoinPaprika];
  const failures = [];
  for (const provider of providers) {
    try {
      return await provider();
    } catch (error) {
      failures.push(error && error.message ? error.message : "Error de conexión");
    }
  }
  throw new Error(failures.join(" | "));
}

function displayPrice(data) {
  $("ethPrice").textContent = usd(data.price);
  if (data.change === null) {
    $("ethChange").textContent = "Variación 24 h no disponible";
    $("ethChange").className = "change";
  } else {
    $("ethChange").textContent = (data.change >= 0 ? "+" : "") + data.change.toFixed(2) + "% · 24 h";
    $("ethChange").className = "change " + (data.change >= 0 ? "up" : "down");
  }
  const qualifier = data.approximate ? " · referencia USDT aproximada a USD" : "";
  $("marketMeta").textContent = [
    data.high !== null ? "Máximo 24 h: " + usd(data.high) : null,
    data.low !== null ? "Mínimo 24 h: " + usd(data.low) : null
  ].filter(Boolean).join(" · ") || "Cotización de mercado disponible.";
  $("priceSource").textContent = "Fuente: " + data.source + qualifier +
    " · Consultado: " + new Date().toLocaleTimeString("es-MX");
  $("marketCap").textContent = data.marketCap !== null ? usd(data.marketCap) : "—";
  $("volume").textContent = data.volume !== null ? usd(data.volume) : "—";
  $("supply").textContent = data.supply !== null ? compact(data.supply) + " ETH" : "—";
}

async function loadChart() {
  try {
    const history = await requestJSON(
      "https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=1&interval=hourly",
      6000
    );
    if (history.prices && history.prices.length) drawChart(history.prices);
    else $("chart").textContent = "Historial gráfico no disponible.";
  } catch {
    $("chart").textContent = "El precio está disponible; el historial gráfico no respondió.";
  }
}

async function market() {
  try {
    const live = await getLivePrice();
    displayPrice(live);
    // El precio puntual no depende del endpoint de histórico.
    loadChart();
  } catch (error) {
    $("ethPrice").textContent = "Sin conexión";
    $("ethChange").textContent = "No se pudo obtener el precio";
    $("ethChange").className = "change down";
    $("marketMeta").textContent = "Revisa la conexión a internet o intenta de nuevo.";
    $("priceSource").textContent = "Fuentes consultadas sin respuesta: " + error.message;
    $("marketCap").textContent = "—";
    $("volume").textContent = "—";
    $("supply").textContent = "—";
    $("chart").textContent = "No se pudo cargar el historial de precios.";
    throw error;
  }
}

function drawChart(points) {
  const values = points.map(point => point[1]);
  const min = Math.min(...values), max = Math.max(...values);
  const width = 900, height = 220, padding = 8, range = max - min || 1;
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
    '<defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#69d8c4" stop-opacity=".24"/><stop offset="100%" stop-color="#69d8c4" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="' + area + '" fill="url(#fill)"/><path d="' + line + '" fill="none" stroke="#78e3d1" stroke-width="2.3" vector-effect="non-scaling-stroke"/></svg>';
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[character]));
}

async function getBalance(address, id) {
  const endpoints = ["https://ethereum-rpc.publicnode.com", "https://cloudflare-eth.com"];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method:"POST", mode:"cors", credentials:"omit",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({jsonrpc:"2.0",method:"eth_getBalance",params:[address,"latest"],id})
      });
      if (!response.ok) throw new Error("RPC HTTP " + response.status);
      const result = await response.json();
      if (result.error || !result.result) throw new Error("Respuesta RPC no válida");
      return (Number(BigInt(result.result)) / 1e18).toLocaleString("es-MX",{maximumFractionDigits:3}) + " ETH";
    } catch {
      // Probar el siguiente nodo público.
    }
  }
  return "No disponible";
}

async function loadWallets() {
  const addresses = getWallets();
  $("walletCount").textContent = addresses.length;
  $("walletPill").textContent = addresses.length + " DIRECCIONES";
  $("walletRows").innerHTML = addresses.map((wallet,index) =>
    '<tr><td><b>' + escapeHTML(wallet.label || "Cartera sin etiqueta") + '</b></td>' +
    '<td class="address">' + wallet.address.slice(0,10) + "…" + wallet.address.slice(-8) + '</td>' +
    '<td><span class="tag">' + escapeHTML(wallet.type || "AGREGADA POR EL USUARIO") + '</span></td>' +
    '<td class="balance" id="bal-' + index + '">Consultando…</td>' +
    '<td><a href="https://etherscan.io/address/' + wallet.address + '" target="_blank" rel="noreferrer">Etherscan ↗</a></td></tr>'
  ).join("");
  await Promise.all(addresses.map(async (wallet,index) => {
    $("bal-" + index).textContent = await getBalance(wallet.address,index + 1);
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
  addresses.push({label,address,type:"AGREGADA POR EL USUARIO · SIN VERIFICAR"});
  localStorage.setItem(STORE,JSON.stringify(addresses));
  $("walletAddress").value = "";
  $("walletLabel").value = "";
  loadWallets();
  notify("Cartera agregada a este navegador.");
}

async function refresh() {
  $("refresh").disabled = true;
  try {
    await market();
    notify("Precio de ETH actualizado.");
  } catch (error) {
    notify("No se pudo consultar ninguna fuente de precio.");
  }
  await loadWallets();
  $("lastUpdated").textContent = new Date().toLocaleString("es-MX");
  $("refresh").disabled = false;
}

$("refresh").addEventListener("click",refresh);
$("addWallet").addEventListener("click",addWallet);
$("walletAddress").addEventListener("keydown",event => {
  if (event.key === "Enter") addWallet();
});
refresh();
setInterval(() => {
  if (!document.hidden) market().catch(() => {});
},60000);
