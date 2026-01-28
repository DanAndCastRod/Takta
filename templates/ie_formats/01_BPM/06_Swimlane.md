# Swimlane Diagram (Diagrama de Carriles)

## Metadatos
- **Código Formato**: BPM-06
- **Proceso**: {{process_name}}

## Diagrama
> Definir los roles (carriles) y el flujo entre ellos.

```mermaid
sequenceDiagram
    participant Rol A
    participant Rol B
    participant Sistema

    Rol A->>Sistema: Registra Solicitud
    Sistema->>Rol B: Notifica Tarea
    Rol B->>Rol B: Valida Datos
    alt Datos Correctos
        Rol B->>Rol A: Aprueba
    else Datos Incorrectos
        Rol B->>Rol A: Rechaza
    end
```

## Detalles de Interacción

| Paso | Rol Responsable | Acción | Herramienta/Sistema |
|------|-----------------|--------|---------------------|
| 1 | Rol A | | |
| 2 | Sistema | | |
