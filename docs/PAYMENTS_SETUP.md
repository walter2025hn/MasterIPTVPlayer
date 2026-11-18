# Configuración de pagos de Master IPTV Player

## Monedas y métodos
- Transferencia o depósito manual: USD y HNL.
- PayPal Checkout automático: USD. El checkout REST de PayPal no incluye HNL en su lista de monedas de pago admitidas; por eso la compra en lempiras usa el método manual.
- Los precios de USD y HNL se configuran por separado en /admin/payments.

## Variables privadas de Vercel
Configura estas variables en el proyecto MasterIPTVPlayer, en Production y Preview según corresponda. Nunca las pongas en variables NEXT_PUBLIC ni en el código:
- PAYPAL_CLIENT_ID
- PAYPAL_CLIENT_SECRET
- PAYPAL_ENV (sandbox o live)
- SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY heredada, solo servidor)
- NEXT_PUBLIC_SITE_URL (por ejemplo, la URL pública del portal)

Usa primero las credenciales Sandbox para probar. Cambia PAYPAL_ENV a live solo después de completar las pruebas y verificar la cuenta comercial. La opción PayPal del panel debe permanecer desactivada hasta que existan las credenciales y la URL pública.

## Activación manual
En /admin/payments:
1. Define el precio mensual, trimestral, semestral y anual en USD y HNL.
2. Activa cada plan que tenga precio.
3. Escribe los datos de transferencia o depósito para USD y HNL.
4. Mantén habilitado el pago manual.

El cliente envía su comprobante; el administrador lo revisa en Solicitudes de pago y lo aprueba o rechaza. Solo al aprobar se extiende el vencimiento Premium.

## Seguridad
Los comprobantes se guardan en un bucket privado. El navegador nunca recibe las credenciales de PayPal ni la clave secreta de Supabase. Premium no se activa por una URL de retorno: el servidor captura el pago y comprueba estado, importe y moneda con PayPal antes de activarlo.
