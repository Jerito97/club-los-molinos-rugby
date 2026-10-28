import { NOMBRE_CLUB, type Condicion } from "@/dominio/tipos";
import { normalizarEquipo, type FuenteURBA, type PartidoURBA, type PosicionURBA, type RivalURBA } from "./fuente";

// Fuente real: consulta los datos que publica la URBA. El sitio de fixture
// de la unión (fixture.urba.org.ar) obtiene la información de una API JSON
// pública, sin autenticación, que devuelve las fechas del torneo con sus
// partidos y la tabla de posiciones. Se usa esa misma API en lugar de
// interpretar el HTML, porque es más estable ante cambios de diseño.
//
// Queda desactivada por defecto (URBA_FUENTE=mock). Para usarla hay que
// definir URBA_FUENTE=scraper y URBA_ID_TORNEO con el identificador del
// torneo en la URBA.

const API = "https://api.urba.org.ar/api";

type PartidoAPI = {
  fulfilled: boolean;
  playdate: string;
  local_team_score: number;
  visit_team_score: number;
  local_team: { name: string };
  visit_team: { name: string };
};
type FechaAPI = { name: string; matches: PartidoAPI[] };
type PosicionAPI = {
  position: number;
  played: number;
  won: number;
  tied: number;
  lost: number;
  points_favor: number;
  points_against: number;
  points_total: number;
  team: { name: string };
};

export class FuenteURBAScraper implements FuenteURBA {
  readonly nombre = "scraper";
  private readonly club = normalizarEquipo(NOMBRE_CLUB);

  constructor(
    private readonly idTorneo: number,
    private readonly torneo = "Primera C - Superior",
    private readonly temporada = new Date().getFullYear()
  ) {}

  private async pedir<T>(ruta: string): Promise<T> {
    const res = await fetch(`${API}${ruta}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`La URBA respondió ${res.status} en ${ruta}`);
    return (await res.json()) as T;
  }

  async obtenerTorneo() {
    return { temporada: this.temporada, torneo: this.torneo };
  }

  async obtenerFixture(): Promise<PartidoURBA[]> {
    const data = await this.pedir<{ championship: { rounds: FechaAPI[] }[] }>(`/championship/${this.idTorneo}`);
    const partidos: PartidoURBA[] = [];
    data.championship[0].rounds.forEach((fecha, i) => {
      const numero = Number(/\d+/.exec(fecha.name)?.[0] ?? i + 1);
      for (const p of fecha.matches) {
        const local = normalizarEquipo(p.local_team.name) === this.club;
        const visitante = normalizarEquipo(p.visit_team.name) === this.club;
        if (!local && !visitante) continue;
        const condicion: Condicion = local ? "LOCAL" : "VISITANTE";
        partidos.push({
          fecha_numero: numero,
          fecha: new Date(p.playdate).toISOString(),
          rival: local ? p.visit_team.name : p.local_team.name,
          condicion,
          resultado: p.fulfilled
            ? local
              ? { club: p.local_team_score, rival: p.visit_team_score }
              : { club: p.visit_team_score, rival: p.local_team_score }
            : null,
        });
      }
    });
    return partidos;
  }

  async obtenerPosiciones(): Promise<PosicionURBA[]> {
    const data = await this.pedir<{ positions: PosicionAPI[] }>(`/positions/${this.idTorneo}`);
    return data.positions
      .map((p) => ({
        puesto: p.position,
        equipo: normalizarEquipo(p.team.name) === this.club ? NOMBRE_CLUB : p.team.name,
        pj: p.played,
        pg: p.won,
        pe: p.tied,
        pp: p.lost,
        dif: p.points_favor - p.points_against,
        pts: p.points_total,
      }))
      .sort((a, b) => a.puesto - b.puesto);
  }

  async obtenerRivales(): Promise<RivalURBA[]> {
    const posiciones = await this.obtenerPosiciones();
    return posiciones.filter((p) => p.equipo !== NOMBRE_CLUB).map((p) => ({ nombre: p.equipo }));
  }
}
