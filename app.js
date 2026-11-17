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
const PRICE_PROVIDERS = [
  ["Kraken", "https://api.kraken.com/0/public/Ticker?pair=ETHUSD"],
  ["Coinbase", "https://api.coinbase.com/v2/prices/ETH-USD/spot"],
  ["CoinGecko", "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true"],
  ["Binance", "https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT"]
];
const RPC_ENDPOINTS = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.drpc.org/"
];

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

async function requestJSON(url, timeoutMs = 7000) {
  const response = await fetch(url, {
    method:"GET", mode:"cors", credentials:"omit", cache:"no-store",
    signal:AbortSignal.timeout(timeoutMs),
    headers:{"Accept":"application/json"}
  });
  if (!response.ok) throw new Error(new URL(url).hostname + " HTTP " + response.status);
  return response.json();
}

async function getLivePrice() {
  const errors = [];
  for (const [name,url] of PRICE_PROVIDERS) {
    try {
      const data = await requestJSON(url);
      if (name === "Kraken") {
        if (data.error && data.error.length) throw new Error(data.error.join(", "));
        const ticker = Object.values(data.result || {})[0];
        if (!ticker) throw new Error("Sin par ETH/USD");
        const price = Number(ticker.c && ticker.c[0]);
        const open = Number(ticker.o);
        return {price,change:open > 0 ? (price-open)/open*100 : null,source:"Kraken · ETH/USD"};
      }
      if (name === "Coinbase") {
        const price = Number(data.data && data.data.amount);
        return {price,change:null,source:"Coinbase · ETH/USD"};
      }
      if (name === "CoinGecko") {
        const eth = data.ethereum || {};
        return {price:Number(eth.usd),change:Number.isFinite(Number(eth.usd_24h_change)) ? Number(eth.usd_24h_change) : null,source:"CoinGecko · ETH/USD"};
      }
      if (name === "Binance") {
        return {price:Number(data.lastPrice),change:Number(data.priceChangePercent),source:"Binance · ETH/USDT",approximate:true};
      }
    } catch (error) {
      errors.push(name + ": " + (error.message || "sin respuesta"));
    }
  }
  throw new Error(errors.join(" | "));
}

async function loadMarketMetrics() {
  const state = $("marketDataState");
  try {
    const data = await requestJSON("https://api.coinpaprika.com/v1/tickers/eth-ethereum");
    const quote = data.quotes && data.quotes.USD;
    if (!quote) throw new Error("CoinPaprika no devolvió datos USD");

    $("marketCap").textContent = Number.isFinite(Number(quote.market_cap)) ? usd(Number(quote.market_cap)) : "No disponible";
    $("volume").textContent = Number.isFinite(Number(quote.volume_24h)) ? usd(Number(quote.volume_24h)) : "No disponible";
    $("supply").textContent = Number.isFinite(Number(data.total_supply)) ? compact(Number(data.total_supply)) + " ETH" : "No publicada";
    $("supply").title = "Oferta total reportada por CoinPaprika. La API pública gratuita no publica oferta circulante en este endpoint.";
    state.textContent = "Disponible · CoinPaprika";
    state.className = "up";
    return;
  } catch (primaryError) {
    try {
      const data = await requestJSON("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum&price_change_percentage=24h");
      const eth = data[0];
      if (!eth) throw new Error("CoinGecko sin registro de ETH");
      $("marketCap").textContent = Number.isFinite(Number(eth.market_cap)) ? usd(Number(eth.market_cap)) : "No disponible";
      $("volume").textContent = Number.isFinite(Number(eth.total_volume)) ? usd(Number(eth.total_volume)) : "No disponible";
      $("supply").textContent = Number.isFinite(Number(eth.circulating_supply)) ? compact(Number(eth.circulating_supply)) + " ETH" : "No publicada";
      $("supply").title = "Oferta circulante reportada por CoinGecko.";
      state.textContent = "Disponible · CoinGecko";
      state.className = "up";
      return;
    } catch (fallbackError) {
      $("marketCap").textContent = "No disponible";
      $("volume").textContent = "No disponible";
      $("supply").textContent = "No disponible";
      $("supply").title = "";
      state.textContent = "Sin respuesta";
      state.className = "down";
    }
  }
}

function displayPrice(data) {
  if (!Number.isFinite(data.price) || data.price <= 0) throw new Error("Precio inválido");
  $("ethPrice").textContent = usd(data.price);
  $("ethChange").textContent = data.change === null
    ? "Variación 24 h no disponible"
    : (data.change >= 0 ? "+" : "") + data.change.toFixed(2) + "% · 24 h";
  $("ethChange").className = "change " + (data.change === null ? "" : data.change >= 0 ? "up" : "down");
  $("priceSource").textContent = "Fuente del precio: " + data.source +
    (data.approximate ? " (par USDT, referencia aproximada a USD)" : "") +
    " · " + new Date().toLocaleTimeString("es-MX");
  $("priceSource").className = "muted";
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
  const priceTask = getLivePrice().then(displayPrice).catch(error => {
    $("ethPrice").textContent = "Sin conexión";
    $("ethChange").textContent = "No se pudo obtener el precio";
    $("priceSource").textContent = "No respondieron las fuentes de precio. Revisa conexión o bloqueo de red.";
    $("priceSource").className = "muted down";
    throw error;
  });
  const metricsTask = loadMarketMetrics();
  const chartTask = loadChart();
  await Promise.allSettled([priceTask,metricsTask,chartTask]);
}

function drawChart(points) {
  const values = points.map(point => point[1]);
  const min = Math.min(...values), max = Math.max(...values);
  const width = 900, height = 220, padding = 8, range = max - min || 1;
  const coords = values.map((value,index) => [
    padding + index/(values.length-1)*(width-2*padding),
    height-padding-(value-min)/range*(height-2*padding)
  ]);
  const line = coords.map((point,index) =>
    (index ? "L" : "M") + point[0].toFixed(1) + " " + point[1].toFixed(1)
  ).join(" ");
  const area = line + " L " + (width-padding) + " " + height + " L " + padding + " " + height + " Z";
  $("chart").innerHTML =
    '<svg viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none" role="img" aria-label="Historial del precio de ETH de las últimas 24 horas">' +
    '<defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#69d8c4" stop-opacity=".24"/><stop offset="100%" stop-color="#69d8c4" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="'+area+'" fill="url(#fill)"/><path d="'+line+'" fill="none" stroke="#78e3d1" stroke-width="2.3" vector-effect="non-scaling-stroke"/></svg>';
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g,character => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[character]));
}

async function rpcCall(endpoint, method, params, id = 1) {
  const response = await fetch(endpoint,{
    method:"POST",mode:"cors",credentials:"omit",cache:"no-store",
    signal:AbortSignal.timeout(9000),
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",method,params,id})
  });
  if (!response.ok) throw new Error("RPC HTTP "+response.status);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || "Error RPC");
  return payload.result;
}

async function scanTransfersWith(endpoint) {
  const latestHex = await rpcCall(endpoint,"eth_blockNumber",[]);
  const latest = Number(BigInt(latestHex));
  const depth = 30;
  const transactions = [];
  let scanned = 0;

  // Consultar bloques en grupos pequeños para no saturar nodos públicos.
  for (let start = 0; start < depth; start += 5) {
    const group = [];
    for (let offset = start; offset < Math.min(start+5,depth); offset++) {
      group.push(latest-offset);
    }
    const results = await Promise.allSettled(group.map((blockNumber,index) =>
      rpcCall(endpoint,"eth_getBlockByNumber",["0x"+blockNumber.toString(16),true],start+index+10)
    ));
    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) continue;
      scanned++;
      const block = result.value;
      const timestamp = Number(BigInt(block.timestamp))*1000;
      for (const tx of (block.transactions || [])) {
        if (!tx || !tx.value || tx.value === "0x0") continue;
        const amount = Number(BigInt(tx.value))/1e18;
        if (amount < 1000) continue;
        transactions.push({
          hash:tx.hash,from:tx.from,to:tx.to || null,amount,
          block:Number(BigInt(block.number)),timestamp
        });
      }
    }
  }

  if (!scanned) throw new Error("No se pudo leer ningún bloque");
  transactions.sort((a,b)=>b.block-a.block || b.amount-a.amount);
  return {latest,scanned,transactions:transactions.slice(0,20)};
}

async function loadLargeTransfers() {
  $("transferStatus").textContent = "Consultando los últimos 30 bloques de Ethereum…";
  $("transferRows").innerHTML = '<tr><td colspan="6">Buscando transferencias nativas de ETH de 1,000 ETH o más…</td></tr>';
  let result = null, lastError = null, endpointUsed = "";

  for (const endpoint of RPC_ENDPOINTS) {
    try {
      result = await scanTransfersWith(endpoint);
      endpointUsed = endpoint.includes("publicnode") ? "PublicNode" : "Cloudflare";
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!result) {
    $("transferStatus").textContent = "No fue posible consultar la red Ethereum. " + (lastError ? lastError.message : "");
    $("transferRows").innerHTML = '<tr><td colspan="6">Datos de transferencias no disponibles. Vuelve a intentarlo más tarde.</td></tr>';
    $("blockScanState").textContent = "Sin conexión";
    $("largeTransferCount").textContent = "No disponible";
    $("readoutText").textContent = "No se pudo consultar el historial reciente de bloques; no se genera una señal de actividad.";
    return;
  }

  $("blockScanState").textContent = result.scanned + "/30 · " + endpointUsed;
  $("largeTransferCount").textContent = String(result.transactions.length);
  $("transferStatus").textContent = "Se revisaron "+result.scanned+" de 30 bloques recientes · Nodo: "+endpointUsed+
    " · Último bloque: "+result.latest.toLocaleString("es-MX");

  if (!result.transactions.length) {
    $("transferRows").innerHTML = '<tr><td colspan="6">No se encontraron transferencias principales de 1,000 ETH o más en los bloques revisados.</td></tr>';
  } else {
    $("transferRows").innerHTML = result.transactions.map(tx => {
      const time = new Date(tx.timestamp).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"UTC"});
      const from = tx.from || "";
      const to = tx.to || "Contrato / creación";
      const shortAddress = address => address === "Contrato / creación" ? address : address.slice(0,8)+"…"+address.slice(-6);
      return '<tr><td>'+time+'</td><td>'+tx.block.toLocaleString("es-MX")+'</td>'+
        '<td class="address"><a href="https://etherscan.io/address/'+from+'" target="_blank" rel="noreferrer">'+shortAddress(from)+'</a></td>'+
        '<td class="address">'+(tx.to ? '<a href="https://etherscan.io/address/'+to+'" target="_blank" rel="noreferrer">'+shortAddress(to)+'</a>' : to)+'</td>'+
        '<td class="balance">'+tx.amount.toLocaleString("es-MX",{maximumFractionDigits:2})+' ETH</td>'+
        '<td><a href="https://etherscan.io/tx/'+tx.hash+'" target="_blank" rel="noreferrer">Ver TX ↗</a></td></tr>';
    }).join("");
  }

  $("readoutText").textContent = result.transactions.length
    ? "Se detectaron "+result.transactions.length+" transferencias principales de 1,000 ETH o más en los "+result.scanned+" bloques consultados. Son movimientos observados, no ventas confirmadas."
    : "Se revisaron "+result.scanned+" bloques y no se encontraron transferencias principales de 1,000 ETH o más. El resultado no cubre movimientos internos ni tokens.";
}

function drawWalletHealth(available,total) {
  $("walletHealth").textContent = available+"/"+total+" con saldo";
}

async function getBalance(address,id) {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const result = await rpcCall(endpoint,"eth_getBalance",[address,"latest"],id);
      return (Number(BigInt(result))/1e18).toLocaleString("es-MX",{maximumFractionDigits:3})+" ETH";
    } catch {
      // Probar el siguiente nodo público.
    }
  }
  return "No disponible";
}

async function loadWallets() {
  const addresses = getWallets();
  $("walletCount").textContent = addresses.length;
  $("walletPill").textContent = addresses.length+" DIRECCIONES";
  $("walletRows").innerHTML = addresses.map((wallet,index) =>
    '<tr><td><b>'+escapeHTML(wallet.label || "Cartera sin etiqueta")+'</b></td>'+
    '<td class="address">'+wallet.address.slice(0,10)+'…'+wallet.address.slice(-8)+'</td>'+
    '<td><span class="tag">'+escapeHTML(wallet.type || "AGREGADA POR EL USUARIO")+'</span></td>'+
    '<td class="balance" id="bal-'+index+'">Consultando…</td>'+
    '<td><a href="https://etherscan.io/address/'+wallet.address+'" target="_blank" rel="noreferrer">Etherscan ↗</a></td></tr>'
  ).join("");

  const balances = await Promise.all(addresses.map((wallet,index)=>getBalance(wallet.address,index+1)));
  balances.forEach((balance,index)=>{$("bal-"+index).textContent=balance;});
  drawWalletHealth(balances.filter(balance=>balance!=="No disponible").length,addresses.length);
}

function addWallet() {
  const address = $("walletAddress").value.trim();
  const label = $("walletLabel").value.trim() || "Cartera personalizada";
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    notify("Introduce una dirección válida de Ethereum (42 caracteres).");
    return;
  }
  const addresses = getWallets();
  if (addresses.some(wallet=>wallet.address.toLowerCase()===address.toLowerCase())) {
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
  await Promise.allSettled([market(),loadWallets(),loadLargeTransfers()]);
  $("lastUpdated").textContent = new Date().toLocaleString("es-MX");
  $("refresh").disabled = false;
}

$("refresh").addEventListener("click",refresh);
$("addWallet").addEventListener("click",addWallet);
$("walletAddress").addEventListener("keydown",event=>{if(event.key==="Enter")addWallet();});
refresh();
setInterval(()=>{
  if(document.hidden) return;
  getLivePrice().then(displayPrice).catch(()=>{});
},60000);
setInterval(()=>{
  if(document.hidden) return;
  loadMarketMetrics();
  loadLargeTransfers();
},300000);
