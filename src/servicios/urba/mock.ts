import fixture from "../../../data/urba/fixture.json";
import posiciones from "../../../data/urba/posiciones.json";
import rivales from "../../../data/urba/rivales.json";
import type { FuenteURBA, PartidoURBA, PosicionURBA, RivalURBA } from "./fuente";

/**
 * Fuente de datos de ejemplo: devuelve el contenido de data/urba/*.json.
 * Los archivos se importan (en lugar de leerse del disco) para que queden
 * incluidos en el paquete de la función serverless.
 */
export class FuenteURBAMock implements FuenteURBA {
  readonly nombre = "mock";

  async obtenerTorneo() {
    return { temporada: fixture.temporada, torneo: fixture.torneo };
  }

  async obtenerFixture(): Promise<PartidoURBA[]> {
    return fixture.partidos as PartidoURBA[];
  }

  async obtenerPosiciones(): Promise<PosicionURBA[]> {
    return posiciones.posiciones;
  }

  async obtenerRivales(): Promise<RivalURBA[]> {
    return rivales;
  }
}
