const $=id=>document.getElementById(id);
const DEFAULT_WALLETS=[
{label:"Vitalik Buterin",address:"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",type:"PERSONAL · ATRIBUCIÓN PÚBLICA"},
{label:"Rain Lohmus",address:"0x2B6eD29A95753C3Ad948348e3e7b1A251080Ffb9",type:"PERSONAL · SE REPORTÓ PÉRDIDA DE CLAVES"},
{label:"Ethereum Foundation",address:"0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe",type:"ORGANIZACIÓN"},
{label:"Binance 7",address:"0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8",type:"CUSTODIA DE EXCHANGE"},
{label:"Beacon Deposit Contract",address:"0x00000000219ab540356cBB839Cbe05303d7705Fa",type:"CONTRATO DE PROTOCOLO"},
{label:"WETH",address:"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",type:"CONTRATO DE TOKEN"},
{label:"Arbitrum Bridge",address:"0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a",type:"CONTRATO DE PUENTE"},
{label:"Base Portal",address:"0x49048044D57e1C92A77f79988d21Fa8fAF74E97e",type:"CONTRATO DE PUENTE"}];
const STORE="ethWhaleTracker.wallets.v1";
const usd=v=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(v);
const short=v=>new Intl.NumberFormat("es-MX",{notation:"compact",maximumFractionDigits:2}).format(v);
function wallets(){try{const a=JSON.parse(localStorage.getItem(STORE));return Array.isArray(a)?a:DEFAULT_WALLETS}catch{return DEFAULT_WALLETS}}
function notify(s){const t=$("toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}
async function market(){
const [coin,hist]=await Promise.all([
fetch("https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false").then(r=>{if(!r.ok)throw Error();return r.json()}),
fetch("https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=1&interval=hourly").then(r=>r.ok?r.json():null).catch(()=>null)]);
const m=coin.market_data,change=m.price_change_percentage_24h;
$("ethPrice").textContent=usd(m.current_price.usd);$("ethChange").textContent=(change>=0?"+":"")+change.toFixed(2)+"% · 24H";$("ethChange").className="change "+(change>=0?"up":"down");
$("marketMeta").textContent="Máximo 24 h: "+usd(m.high_24h.usd)+" · mínimo: "+usd(m.low_24h.usd);
$("marketCap").textContent="$"+short(m.market_cap.usd);$("volume").textContent="$"+short(m.total_volume.usd);$("supply").textContent=short(m.circulating_supply)+" ETH";
if(hist&&hist.prices)chart(hist.prices);
}
function chart(points){const vals=points.map(p=>p[1]),min=Math.min(...vals),max=Math.max(...vals),w=900,h=220,pad=8,range=max-min||1;
const xy=vals.map((v,i)=>[pad+i/(vals.length-1)*(w-2*pad),h-pad-(v-min)/range*(h-2*pad)]);
const line=xy.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
const area=line+" L "+(w-pad)+" "+h+" L "+pad+" "+h+" Z";
$("chart").innerHTML='<svg viewBox="0 0 '+w+" "+h+'" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#69d8c4" stop-opacity=".24"/><stop offset="100%" stop-color="#69d8c4" stop-opacity="0"/></linearGradient></defs><path d="'+area+'" fill="url(#fill)"/><path d="'+line+'" fill="none" stroke="#78e3d1" stroke-width="2.3" vector-effect="non-scaling-stroke"/></svg>'}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function loadWallets(){const a=wallets();$("walletCount").textContent=a.length;$("walletPill").textContent=a.length+" DIRECCIONES";
$("walletRows").innerHTML=a.map((w,i)=>'<tr><td><b>'+escapeHTML(w.label)+'</b></td><td class="address">'+w.address.slice(0,10)+'…'+w.address.slice(-8)+'</td><td><span class="tag">'+escapeHTML(w.type||"AGREGADA POR EL USUARIO")+'</span></td><td class="balance" id="bal-'+i+'">Querying…</td><td><a href="https://etherscan.io/address/'+w.address+'" target="_blank" rel="noreferrer">Etherscan ↗</a></td></tr>').join("");
await Promise.all(a.map(async(w,i)=>{try{const r=await fetch("https://ethereum-rpc.publicnode.com",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",method:"eth_getBalance",params:[w.address,"latest"],id:i+1})});if(!r.ok)throw Error();const j=await r.json();if(j.error)throw Error();const n=Number(BigInt(j.result))/1e18;$("bal-"+i).textContent=n.toLocaleString("en-US",{maximumFractionDigits:3})+" ETH"}catch{$("bal-"+i).textContent="No disponible"}}))}
function add(){const address=$("walletAddress").value.trim(),label=$("walletLabel").value.trim()||"Custom wallet";if(!/^0x[a-fA-F0-9]{40}$/.test(address)){notify("Introduce una dirección válida de Ethereum.");return}const a=wallets();if(a.some(w=>w.address.toLowerCase()===address.toLowerCase())){notify("La dirección ya está en la lista.");return}a.push({label,address,type:"AGREGADA POR EL USUARIO · SIN VERIFICAR"});localStorage.setItem(STORE,JSON.stringify(a));$("walletAddress").value="";$("walletLabel").value="";loadWallets();notify("Cartera agregada a este navegador.")}
async function refresh(){$("refresh").disabled=true;try{await market();notify("Datos del mercado actualizados.")}catch{notify("La API del mercado no está disponible; intenta de nuevo en unos momentos.")}await loadWallets();$("lastUpdated").textContent=new Date().toLocaleString("es-MX");$("refresh").disabled=false}
$("refresh").addEventListener("click",refresh);$("addWallet").addEventListener("click",add);$("walletAddress").addEventListener("keydown",e=>{if(e.key==="Enter")add()});refresh();