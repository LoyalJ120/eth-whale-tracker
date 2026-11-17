# Rastreador de Ballenas de ETH

Panel de investigación de Ethereum en modo de solo lectura.

## Funciones de la versión 0.1
- Precio de ETH, variación de 24 horas, capitalización de mercado, volumen y oferta circulante mediante la API pública de CoinGecko.
- Gráfica del precio de las últimas 24 horas.
- Consulta de saldos de ETH para direcciones seleccionadas de Ethereum mediante un endpoint público JSON-RPC.
- Lista de seguimiento personalizada guardada localmente en el navegador y enlaces a Etherscan.
- Distinción explícita entre atribuciones individuales, organizaciones, custodia de exchanges y contratos de protocolo.

## Uso local
Abre `index.html` o ejecuta `python -m http.server 8000` y visita http://localhost:8000.

## Publicación con GitHub Pages
El repositorio está preparado para publicarse como sitio estático. En GitHub, entra a Settings → Pages y selecciona la rama `main` y la carpeta raíz `/(root)` como fuente.

## Limitaciones
Esta es una primera versión. Todavía no indexa transferencias históricas, no calcula flujos netos de exchanges, no integra datos de flujos de ETF, no almacena capturas diarias en una base de datos ni envía alertas automáticas. El RPC público puede limitar las consultas. El saldo de una cartera no prueba quién es su beneficiario real. Un depósito a un exchange no prueba una venta. Las direcciones personalizadas se guardan únicamente en el navegador.

## Próximas etapas
1. Integración de un explorador/indexador para transferencias e historial de saldos.
2. Etiquetas de entidades con niveles de confianza y evidencia.
3. Clasificación de flujos de exchanges y filtrado de transferencias internas duplicadas.
4. Integración de flujos de ETF.
5. Almacenamiento persistente, capturas programadas y alertas.

No utiliza claves privadas, frases semilla, firmas de carteras ni ejecuta operaciones. Herramienta de investigación; no constituye asesoría de inversión.
