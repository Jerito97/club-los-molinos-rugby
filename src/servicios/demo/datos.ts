// Datos fijos de la carga inicial: usuarios habilitados y plantel.
// Los nombres del plantel son ficticios.

import { ROL } from "@/dominio/tipos";

/**
 * Usuarios iniciales con permisos de carga o validación. Los PIN cumplen las
 * reglas de seguridad (seis dígitos, sin secuencias ni repetidos) y no son
 * provisorios, para poder ingresar directamente. Están documentados en el
 * README como usuarios de prueba.
 */
export const USUARIOS_INICIALES = [
  {
    clave: "colaborador",
    nombre: "Colaborador Demo",
    rol: ROL.CARGADOR,
    pin: "258036",
    responsableSeguridad: false,
  },
  {
    clave: "dirigente1",
    nombre: "Dirigente Demo 1",
    rol: ROL.VALIDADOR,
    pin: "731904",
    responsableSeguridad: true,
  },
  {
    clave: "dirigente2",
    nombre: "Dirigente Demo 2",
    rol: ROL.VALIDADOR,
    pin: "649217",
    responsableSeguridad: false,
  },
] as const;

/** Plantel de Primera: [nombre, número de camiseta]. */
export const PLANTEL: [string, number][] = [
  ["Tomás Arregui", 1],
  ["Facundo Ledesma", 2],
  ["Martín Quiroga", 3],
  ["Ignacio Sosa", 4],
  ["Joaquín Bermúdez", 5],
  ["Santiago Ferreyra", 6],
  ["Agustín Pereyra", 7],
  ["Nicolás Domínguez", 8],
  ["Felipe Acosta", 9],
  ["Juan Cruz Medina", 10],
  ["Mateo Rinaldi", 11],
  ["Lautaro Giménez", 12],
  ["Valentín Correa", 13],
  ["Bruno Castañeda", 14],
  ["Franco Ibarra", 15],
  ["Gonzalo Ruiz Díaz", 16],
  ["Esteban Molina", 17],
  ["Ramiro Villalba", 18],
  ["Thiago Benítez", 19],
  ["Manuel Ortega", 20],
  ["Lucas Peralta", 21],
  ["Benjamín Herrera", 22],
  ["Santino Aguirre", 23],
  ["Federico Cabral", 24],
  ["Julián Navarro", 25],
  ["Emiliano Paz", 26],
  ["Bautista Romero", 27],
  ["Tobías Luna", 28],
  ["Simón Figueroa", 29],
  ["Rodrigo Maldonado", 30],
  ["Pablo Vega", 31],
  ["Andrés Toledo", 32],
  ["Lisandro Campos", 33],
  ["Dante Suárez", 34],
  ["Germán Ríos", 35],
];
