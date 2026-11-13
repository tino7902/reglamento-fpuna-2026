const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/calculadora.js');

// Crea una entrada a partir de porcentajes: p = parcial, a = actividades de proceso.
function entrada({ p1, a1, p2, a2, asistencia = 100, lab = null, pesoLab = 15, recuperatorio = null }) {
  const etapa = (p, a, l) => ({
    parcial: p === null ? { ausente: true } : { ausente: false, obtenido: p, total: 100 },
    proceso: { obtenido: a, total: 100 },
    lab: l
  });
  return {
    etapas: [etapa(p1, a1, lab && lab[0]), etapa(p2, a2, lab && lab[1])],
    asistencia,
    tieneLab: !!lab,
    pesoLab,
    recuperatorio
  };
}

test('PEP 60 exacto habilita desde la primera convocatoria', () => {
  const r = C.evaluar(entrada({ p1: 60, a1: 60, p2: 60, a2: 60 }));
  assert.equal(r.pepExacto, 60);
  assert.equal(r.estado, 'habilitado');
  assert.equal(r.convocatoria, 1);
  assert.deepEqual(r.advertencias, []);
});

test('PEP 59,5 habilita por redondeo, con advertencia', () => {
  const r = C.evaluar(entrada({ p1: 59, a1: 60, p2: 59, a2: 60 }));
  assert.equal(r.pepExacto, 59.5);
  assert.equal(r.estado, 'habilitado');
  assert.ok(r.advertencias.includes('redondeo_pep'));
});

test('PEP 59,4 no habilita', () => {
  const r = C.evaluar(entrada({ p1: 58.8, a1: 60, p2: 58.8, a2: 60 }));
  assert.equal(r.pepExacto, 59.4);
  assert.equal(r.estado, 'recuperatorio');
});

test('escala de asistencia: 49 / 50 / 69 / 70', () => {
  const base = { p1: 80, a1: 80, p2: 80, a2: 80 };
  assert.equal(C.evaluar(entrada({ ...base, asistencia: 49 })).estado, 'sin_derecho_asistencia');
  assert.equal(C.evaluar(entrada({ ...base, asistencia: 50 })).convocatoria, 2);
  assert.equal(C.evaluar(entrada({ ...base, asistencia: 69.9 })).convocatoria, 2);
  assert.equal(C.evaluar(entrada({ ...base, asistencia: 70 })).convocatoria, 1);
});

test('ausente a un parcial: recuperatorio por ausencia, sin exigir 60% de proceso', () => {
  const r = C.evaluar(entrada({ p1: null, a1: 40, p2: 80, a2: 80 }));
  assert.equal(r.estado, 'recuperatorio');
  assert.equal(r.recuperatorio.tipo, 'ausencia');
  assert.equal(r.recuperatorio.etapa, 1);
  // PPEP2 = 80 -> R >= 2·(119 − 80) − 40 = 38
  assert.equal(r.recuperatorio.minimo, 38);
  assert.equal(r.recuperatorio.minimoSinRedondeo, 40);
  assert.ok(r.fundamentos.includes('12.b.1'));
});

test('ausente a ambos parciales: sin recuperatorio', () => {
  const r = C.evaluar(entrada({ p1: null, a1: 100, p2: null, a2: 100 }));
  assert.equal(r.estado, 'sin_derecho_ausente_ambos');
});

test('ausente a uno con PEP suficiente: habilita con advertencia', () => {
  const r = C.evaluar(entrada({ p1: null, a1: 100, p2: 100, a2: 100 }));
  assert.equal(r.pepExacto, 75);
  assert.equal(r.estado, 'habilitado');
  assert.ok(r.advertencias.includes('ausente_con_pep_suficiente'));
});

test('recuperatorio: se recupera el parcial más bajo si el proceso de esa etapa es >= 60', () => {
  const r = C.evaluar(entrada({ p1: 30, a1: 60, p2: 50, a2: 70 }));
  assert.equal(r.estado, 'recuperatorio');
  assert.equal(r.recuperatorio.etapa, 1);
  assert.equal(r.recuperatorio.tipo, 'no_habilita');
  // PPEP2 = 60 -> R >= 2·(119 − 60) − 60 = 58
  assert.equal(r.recuperatorio.minimo, 58);
  assert.ok(r.fundamentos.includes('12.b.2'));
});

test('recuperatorio: proceso 59 en la etapa del parcial más bajo no permite recuperar', () => {
  const r = C.evaluar(entrada({ p1: 30, a1: 59, p2: 50, a2: 70 }));
  assert.equal(r.estado, 'sin_derecho_proceso');
  assert.equal(r.recuperatorio.etapa, 1);
});

test('recuperatorio inalcanzable cuando el mínimo supera 100%', () => {
  const r = C.evaluar(entrada({ p1: 10, a1: 60, p2: 20, a2: 60 }));
  // PPEP2 = 40 -> R >= 2·(119 − 40) − 60 = 98 ; con a1 = 60 es alcanzable
  assert.equal(r.recuperatorio.minimo, 98);
  const s = C.evaluar(entrada({ p1: 10, a1: 60, p2: 12, a2: 60 }));
  // PPEP2 = 36 -> R >= 106
  assert.equal(s.estado, 'recuperatorio_inalcanzable');
  assert.equal(s.recuperatorio.alcanzable, false);
});

test('simulación del recuperatorio: la nota reemplaza al parcial y se recalcula el PEP', () => {
  const base = { p1: 30, a1: 60, p2: 50, a2: 70 };
  const ok = C.evaluar(entrada({ ...base, recuperatorio: 60 }));
  // PPEP1' = 60, PPEP2 = 60 -> PEP = 60
  assert.equal(ok.simulacion.pepExacto, 60);
  assert.equal(ok.simulacion.habilita, true);
  assert.equal(ok.pepParaFinal, 60);
  const no = C.evaluar(entrada({ ...base, recuperatorio: 50 }));
  assert.equal(no.simulacion.pepExacto, 57.5);
  assert.equal(no.simulacion.habilita, false);
  assert.equal(no.pepParaFinal, null);
});

test('recuperatorio con asistencia entre 50 y 70: puede rendirlo, sin advertencia', () => {
  const r = C.evaluar(entrada({ p1: 30, a1: 60, p2: 50, a2: 70, asistencia: 50 }));
  assert.equal(r.estado, 'recuperatorio');
  assert.deepEqual(r.advertencias, []);
});

test('laboratorio: la ponderación modifica el proceso de la etapa', () => {
  const lab = [
    { programadas: 4, asistidas: 4, obtenido: 100, total: 100 },
    { programadas: 4, asistidas: 4, obtenido: 0, total: 100 }
  ];
  const r = C.evaluar(entrada({ p1: 80, a1: 50, p2: 80, a2: 50, lab, pesoLab: 15 }));
  // Etapa 1: (35·50 + 15·100)/50 = 65 ; etapa 2: (35·50 + 0)/50 = 35
  assert.equal(r.etapas[0].procesoPct, 65);
  assert.equal(r.etapas[1].procesoPct, 35);
  assert.equal(r.etapas[0].ppep, 72.5);
  assert.equal(r.lab.completo, true);
});

test('laboratorio: faltas de hasta 25% son recuperables; más, se pierde el derecho', () => {
  const mk = (asistidas2) => [
    { programadas: 4, asistidas: 4, obtenido: 80, total: 100 },
    { programadas: 4, asistidas: asistidas2, obtenido: 80, total: 100 }
  ];
  const base = { p1: 80, a1: 80, p2: 80, a2: 80 };
  const dos = C.evaluar(entrada({ ...base, lab: mk(2) })); // 2 de 8 = 25%
  assert.equal(dos.estado, 'habilitado');
  assert.ok(dos.advertencias.includes('laboratorio_recuperar'));
  const tres = C.evaluar(entrada({ ...base, lab: mk(1) })); // 3 de 8 = 37,5%
  assert.equal(tres.estado, 'sin_derecho_laboratorio');
});

test('tabla del final con PEP 60', () => {
  const t = C.tablaFinal(60, 100);
  assert.equal(t[0].efMinimo, 58.75);
  assert.equal(t[0].puntos, 59);
  assert.equal(t[1].efMinimo, 86.25);
  assert.equal(t[2].alcanzable, false);
  assert.equal(t[3].alcanzable, false);
});

test('tabla del final con PEP 100: el mínimo nunca baja de 50%', () => {
  const t = C.tablaFinal(100, 40);
  assert.equal(t[0].efMinimo, 50);
  assert.equal(t[0].puntos, 20);
  assert.equal(t[2].efMinimo, 51.25);
  assert.equal(t[3].efMinimo, 76.25);
  assert.equal(t[3].puntos, 31); // 30,5 puntos -> 31
});

test('la tabla es coherente con la calificación resultante', () => {
  for (const pep of [60, 67.3, 75, 88.8, 100]) {
    for (const fila of C.tablaFinal(pep, 100)) {
      if (!fila.alcanzable) continue;
      assert.ok(C.calificacion(pep, fila.efMinimo).nota >= fila.nota, `PEP ${pep}, nota ${fila.nota}`);
      if (fila.efMinimo > 50) {
        assert.ok(C.calificacion(pep, fila.efMinimo - 0.1).nota < fila.nota, `PEP ${pep}, nota ${fila.nota} (por debajo)`);
      }
    }
  }
  assert.equal(C.calificacion(100, 49).nota, 1);
});
