"""Catalogo de las piezas del ecosistema digital del grupo.

Solo enlaces: esta plataforma no consulta ni comparte nada con estas piezas (regla 2).
Las URLs que no estan aqui no las tenemos: se marcan `Pendiente` y las entrega el cliente.
"""

from dataclasses import dataclass

from app.core.enums import Empresa, Producto, Realm


@dataclass(frozen=True)
class Pieza:
    producto: Producto
    nombre: str
    tipo: str  # sitio | tienda | app
    empresa: Empresa | None  # duena; None cuando es del grupo o no aplica
    url: str | None  # None = Pendiente (0.6 o el cliente no ha entregado)
    realms: tuple[Realm, ...]  # a quien se le muestra
    descripcion: str


PIEZAS: tuple[Pieza, ...] = (
    Pieza(Producto.GABAME, "GABAME", "sitio", Empresa.GABAME, "https://gabame.com",
          (Realm.ID, Realm.PARTNERS), "Sitio ancla del grupo y origen del area medica."),
    Pieza(Producto.MEDINTER, "Medinter", "sitio", Empresa.MEDINTER, "https://medinter.com.mx",
          (Realm.PARTNERS,), "Publico institucional y licitaciones."),
    Pieza(Producto.ORDAN, "Ordan", "sitio", Empresa.ORDAN, "https://ordan.com.mx",
          (Realm.ID, Realm.PARTNERS), "Distribucion de Babe y Sheglam."),
    Pieza(Producto.A7, "A7 Pharmaceutical Distributor", "sitio", Empresa.A7, "https://a7siete.com",
          (Realm.PARTNERS,), "Logistica y distribucion."),
    Pieza(Producto.TIENDAGABAME, "Farmacias GABAME", "tienda", Empresa.GABAME, "https://tiendagabame.com",
          (Realm.ID, Realm.PARTNERS), "Marketplace Rx/OTC. Cuentas propias hasta la Fase 6."),
    # Pendiente 0.6 — dominio de Aurashop no documentado
    Pieza(Producto.AURASHOP, "Aurashop", "tienda", Empresa.ORDAN, None,
          (Realm.ID,), "Marketplace de belleza de Ordan."),
    # MB-V005: no existe todavia
    Pieza(Producto.APP_PACIENTE, "App de paciente", "app", None, None,
          (Realm.ID,), "Consumira esta identidad cuando exista."),
)


def piezas_para(realm: Realm) -> list[Pieza]:
    return [p for p in PIEZAS if realm in p.realms]
