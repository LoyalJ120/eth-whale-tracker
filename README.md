# Rastreador de Ballenas de ETH

Panel de investigación de Ethereum en modo de solo lectura.

## Funciones actuales
- Precio ETH con varias fuentes públicas de respaldo.
- Capitalización de mercado, volumen de 24 horas y oferta total reportada mediante CoinPaprika; CoinGecko funciona como respaldo.
- Gráfica de precio de las últimas 24 horas.
- Saldos ETH de direcciones vigiladas mediante nodos JSON-RPC públicos.
- Escaneo exploratorio de los últimos 30 bloques para detectar transferencias principales de ETH de 1,000 ETH o más.
- Monitor en vivo de ejecuciones grandes en los 12 mercados perpetuos con más volumen de Hyperliquid, con dirección LONG/SHORT confirmada mediante consulta de la posición abierta de los participantes.
- Lista personalizada de carteras guardada localmente en el navegador y enlaces a Etherscan.

## Cómo interpretar las cifras
- La oferta total reportada no es necesariamente igual a la oferta circulante.
- El escaneo de transferencias cubre los últimos 30 bloques disponibles al momento de la consulta y no es un indexador histórico completo.
- Solo detecta valor nativo de ETH en transacciones principales. No ve transferencias internas, ERC-20 ni actividad de otras redes.
- Un movimiento hacia un exchange no demuestra una venta.
- Hyperliquid publica participantes de las operaciones y permite consultar posiciones por dirección. El monitor solo verifica carteras observadas en operaciones grandes durante la sesión; no enumera todas las posiciones del exchange.
- Una compra o venta individual no determina por sí sola si la cartera abrió o cerró un LONG/SHORT. El sentido se toma de la posición abierta consultada después de la ejecución.
- Un saldo de wallet no prueba quién es el propietario beneficiario.

## Uso y publicación
Sitio estático en GitHub Pages. No necesita Render ni servidor propio.

## Seguridad
No solicita claves privadas, frases semilla, conexión de wallet, firmas ni ejecuta operaciones.

## Limitaciones pendientes
No hay almacenamiento histórico, cálculo completo de netflows de exchanges, integración de ETF, atribución institucional verificada, censo completo de posiciones de Hyperliquid ni alertas automáticas del lado del servidor. Las consultas se hacen desde el navegador mientras el sitio está abierto.

Solo para investigación; no constituye asesoría de inversión.
