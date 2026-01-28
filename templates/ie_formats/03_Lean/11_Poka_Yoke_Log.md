# Registro y Validación de Poka Yokes

## Metadatos
- **Código Formato**: LEAN-11
- **Máquina**: {{machine_name}}

## Listado de Dispositivos A Prueba de Error

| ID | Descripción del Error que Previene | Método (Contacto/Conteo/Secuencia) | Tipo de Alerta (Parada/Luz/Sonido) | Validación Diaria (OK/NOK) |
|----|-----------------------------------|-----------------------------------|-----------------------------------|--------------------------|
| PY-01 | Colocar pieza invertida | Contacto (Pin guía) | Parada Máquina | ✅ OK |
| PY-02 | Olvidar colocar tornillo | Conteo (Sensor) | Luz Roja | ✅ OK |
