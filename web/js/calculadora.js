/*
 * Lógica de la calculadora (Reglamento Académico 2026, FP-UNA).
 * Funciones puras, sin acceso al DOM. Se usan desde interfaz.js y desde las pruebas.
 */
(function (raiz) {
  'use strict';

  var MINIMO_PEP = 60;
  var MINIMO_PROCESO_RECUPERATORIO = 60;
  var MINIMO_FINAL = 50;

  // Citas textuales del Reglamento Académico 2026 usadas como fundamento.
  var ARTICULOS = {
    '11.a': {
      ref: 'Art. 11, inc. a',
      texto: 'La asistencia de los estudiantes a las prácticas de laboratorio obligatorias debe ser del cien por ciento (100%).'
    },
    '11.b': {
      ref: 'Art. 11, inc. b',
      texto: 'Si un estudiante no cumple con la asistencia requerida podrá solicitar la recuperación de hasta el veinticinco por ciento (25%) del total de las prácticas programadas en el semestre, a través del Departamento de Aprendizaje de la Carrera. Las recuperaciones de las prácticas de laboratorio deberán realizarse en la etapa correspondiente.'
    },
    '12.a': {
      ref: 'Art. 12, inc. a',
      texto: 'En cada asignatura, el estudiante deberá presentarse a dos Evaluaciones Parciales.'
    },
    '12.b': {
      ref: 'Art. 12, inc. b',
      texto: 'La recuperación de una evaluación parcial se realizará en la primera convocatoria de la evaluación final, utilizando el mismo instrumento de evaluación […].'
    },
    '12.b.1': {
      ref: 'Art. 12, inc. b, núm. 1',
      texto: 'El estudiante que no se haya presentado a una de las evaluaciones parciales podrá recuperarla siempre y cuando cumple con los requisitos de los artículos 13.b.2, 13.b.3, 13.b.4 y 13.b.5.'
    },
    '12.b.2': {
      ref: 'Art. 12, inc. b, núm. 2',
      texto: 'El estudiante que se haya presentado a las dos evaluaciones parciales y no obtenga derecho a examen final, podrá recuperar una de las evaluaciones parciales, la de menor porcentaje obtenido, siempre y cuando haya obtenido como mínimo el 60% del promedio de las actividades evaluativas de proceso de dicha etapa (excluyendo las evaluaciones parciales), y cumple con los requisitos de los artículos 13.b.2, 13.b.3, 13.b.4 y 13.b.5.'
    },
    '12.d-g': {
      ref: 'Art. 12, incs. d, e y g',
      texto: 'El PPEP1 [y el PPEP2] se calculará de la siguiente manera: 50% correspondiente a la […] evaluación parcial; 50% correspondiente a la suma de las ponderaciones de las demás actividades evaluativas de proceso de la misma etapa. […] El PEP se calculará de la siguiente manera: PEP = (PPEP1 + PPEP2) / 2.'
    },
    '12.f': {
      ref: 'Art. 12, inc. f',
      texto: 'En las asignaturas con prácticas de laboratorio obligatorias, éstas deberán tener una ponderación mayor o igual al quince por ciento (15%).'
    },
    '13.b.1': {
      ref: 'Art. 13, inc. b, núm. 1',
      texto: 'Para tener derecho a la Evaluación Final de una asignatura, el estudiante deberá: obtener al menos un sesenta por ciento (60%) del PEP.'
    },
    '13.b.2': {
      ref: 'Art. 13, inc. b, núm. 2',
      texto: 'Tener cien por ciento (100%) de asistencia a prácticas de laboratorio obligatorias, cuando corresponda.'
    },
    '13.b.3': {
      ref: 'Art. 13, inc. b, núm. 3',
      texto: 'Cumplir con el porcentaje de asistencia a clases conforme a la siguiente escala: con una asistencia igual o superior al setenta por ciento (70%), el estudiante tendrá derecho a presentarse a la evaluación final desde la primera convocatoria. Con una asistencia igual o mayor a cincuenta por ciento (50%) y menor al setenta por ciento (70%), el estudiante tendrá derecho a presentarse a la evaluación final a partir de la segunda convocatoria.'
    },
    '13.b.4-5': {
      ref: 'Art. 13, inc. b, núms. 4 y 5',
      texto: 'Estar libre de sanciones disciplinarias. Cumplir en tiempo y forma con todos los requisitos obligatorios establecidos en el Planeamiento de la Asignatura.'
    },
    '15.a': {
      ref: 'Art. 15, inc. a',
      texto: 'El Rendimiento Porcentual (RP) se calculará de la siguiente manera: RP = 0,4xEF + 0,6xPEP, donde EF: Evaluación Final, la que deberá tener un rendimiento mínimo del 50% para ser considerada.'
    },
    '15.c': {
      ref: 'Art. 15, inc. c',
      texto: 'Las puntuaciones del Rendimiento Porcentual se redondearán al entero inmediato superior, si la fracción decimal es mayor o igual a 5.'
    }
  };

  function limpiar(x) {
    // Evita errores de coma flotante del tipo 59.49999999.
    return Math.round(x * 1e9) / 1e9;
  }

  function redondear(x) {
    return Math.floor(limpiar(x) + 0.5);
  }

  function porcentaje(obtenido, total) {
    if (!(total > 0)) return 0;
    return limpiar((obtenido / total) * 100);
  }

  function calcularEtapa(etapa, tieneLab, pesoLab) {
    var ausente = !!etapa.parcial.ausente;
    var parcialPct = ausente ? 0 : porcentaje(etapa.parcial.obtenido, etapa.parcial.total);
    var actividadesPct = porcentaje(etapa.proceso.obtenido, etapa.proceso.total);
    var labPct = null;
    var procesoPct = actividadesPct;
    if (tieneLab && etapa.lab && etapa.lab.programadas > 0 && etapa.lab.total > 0) {
      labPct = porcentaje(etapa.lab.obtenido, etapa.lab.total);
      procesoPct = limpiar(((50 - pesoLab) * actividadesPct + pesoLab * labPct) / 50);
    }
    return {
      ausente: ausente,
      parcialPct: parcialPct,
      actividadesPct: actividadesPct,
      labPct: labPct,
      procesoPct: procesoPct,
      ppep: limpiar(0.5 * parcialPct + 0.5 * procesoPct)
    };
  }

  function calcularLaboratorio(etapas) {
    var programadas = 0;
    var asistidas = 0;
    etapas.forEach(function (e) {
      if (e.lab) {
        programadas += e.lab.programadas || 0;
        asistidas += Math.min(e.lab.asistidas || 0, e.lab.programadas || 0);
      }
    });
    var faltas = programadas - asistidas;
    var maximoRecuperable = Math.floor(limpiar(programadas * 0.25));
    return {
      programadas: programadas,
      asistidas: asistidas,
      faltas: faltas,
      maximoRecuperable: maximoRecuperable,
      completo: faltas === 0,
      recuperable: faltas > 0 && faltas <= maximoRecuperable
    };
  }

  /*
   * entrada = {
   *   etapas: [ { parcial: {ausente, obtenido, total},
   *               proceso: {obtenido, total},
   *               lab: {programadas, asistidas, obtenido, total} }, {…} ],
   *   asistencia: número (0–100),
   *   tieneLab: booleano,
   *   pesoLab: número (15–50), ponderación del laboratorio sobre el total de la etapa,
   *   recuperatorio: número (0–100) o null  -> nota simulada en el primer final
   * }
   */
  function evaluar(entrada) {
    var tieneLab = !!entrada.tieneLab;
    var pesoLab = tieneLab ? entrada.pesoLab : 0;
    var etapas = entrada.etapas.map(function (e) {
      return calcularEtapa(e, tieneLab, pesoLab);
    });
    var pepExacto = limpiar((etapas[0].ppep + etapas[1].ppep) / 2);
    var pep = redondear(pepExacto);

    var r = {
      etapas: etapas,
      pepExacto: pepExacto,
      pep: pep,
      asistencia: entrada.asistencia,
      lab: tieneLab ? calcularLaboratorio(entrada.etapas) : null,
      estado: null,
      convocatoria: null,
      recuperatorio: null,
      simulacion: null,
      pepParaFinal: null,
      advertencias: [],
      fundamentos: []
    };

    function advertir(codigo) {
      if (r.advertencias.indexOf(codigo) === -1) r.advertencias.push(codigo);
    }

    // 1. Asistencia a clases.
    if (entrada.asistencia < 50) {
      r.estado = 'sin_derecho_asistencia';
      r.fundamentos = ['13.b.3'];
      return r;
    }

    // 2. Prácticas de laboratorio.
    if (r.lab && !r.lab.completo) {
      if (!r.lab.recuperable) {
        r.estado = 'sin_derecho_laboratorio';
        r.fundamentos = ['11.a', '11.b', '13.b.2'];
        return r;
      }
      advertir('laboratorio_recuperar');
    }

    var fundamentosLab = r.lab ? ['13.b.2', '12.f'] : [];
    var ausentes = etapas.filter(function (e) { return e.ausente; }).length;

    // 3. Ausencia a los dos parciales.
    if (ausentes === 2) {
      r.estado = 'sin_derecho_ausente_ambos';
      r.fundamentos = ['12.a', '12.b.1'];
      return r;
    }

    // 4. PEP suficiente.
    if (pep >= MINIMO_PEP) {
      r.estado = 'habilitado';
      r.convocatoria = entrada.asistencia >= 70 ? 1 : 2;
      r.pepParaFinal = pepExacto;
      r.fundamentos = ['12.d-g', '13.b.1', '13.b.3'].concat(fundamentosLab);
      if (pepExacto < MINIMO_PEP) advertir('redondeo_pep');
      if (ausentes === 1) {
        advertir('ausente_con_pep_suficiente');
        r.fundamentos.push('12.a');
      }
      return r;
    }

    // 5. PEP insuficiente: se evalúa el recuperatorio.
    var indice;
    var tipo;
    if (ausentes === 1) {
      indice = etapas[0].ausente ? 0 : 1;
      tipo = 'ausencia';
    } else {
      tipo = 'no_habilita';
      if (etapas[0].parcialPct < etapas[1].parcialPct) indice = 0;
      else if (etapas[1].parcialPct < etapas[0].parcialPct) indice = 1;
      else indice = etapas[0].procesoPct >= etapas[1].procesoPct ? 0 : 1; // empate

      var procesoEtapa = etapas[indice].procesoPct;
      if (redondear(procesoEtapa) < MINIMO_PROCESO_RECUPERATORIO) {
        r.estado = 'sin_derecho_proceso';
        r.recuperatorio = { etapa: indice + 1, tipo: tipo, procesoPct: procesoEtapa };
        r.fundamentos = ['12.d-g', '13.b.1', '12.b.2'];
        return r;
      }
      if (procesoEtapa < MINIMO_PROCESO_RECUPERATORIO) advertir('redondeo_proceso');
    }

    var otra = etapas[1 - indice];
    var proceso = etapas[indice].procesoPct;
    // PEP' = ((0,5·R + 0,5·proceso) + PPEP_otra) / 2  >=  umbral
    function minimoPara(umbral) {
      return Math.max(0, limpiar(2 * (2 * umbral - otra.ppep) - proceso));
    }
    var minimo = minimoPara(MINIMO_PEP - 0.5);
    var minimoSinRedondeo = minimoPara(MINIMO_PEP);

    r.estado = minimo <= 100 ? 'recuperatorio' : 'recuperatorio_inalcanzable';
    r.recuperatorio = {
      etapa: indice + 1,
      tipo: tipo,
      procesoPct: proceso,
      minimo: minimo,
      minimoSinRedondeo: minimoSinRedondeo,
      alcanzable: minimo <= 100
    };
    r.fundamentos = ['12.d-g', '13.b.1', '12.b', tipo === 'ausencia' ? '12.b.1' : '12.b.2', '13.b.3']
      .concat(fundamentosLab);
    // Con asistencia de 50% o más se puede rendir el recuperatorio (confirmado por la Delegación).

    // 6. Simulación de la nota del recuperatorio (primer final).
    var nota = entrada.recuperatorio;
    if (r.recuperatorio.alcanzable && typeof nota === 'number' && !isNaN(nota)) {
      var ppepNuevo = limpiar(0.5 * nota + 0.5 * proceso);
      var pepNuevoExacto = limpiar((ppepNuevo + otra.ppep) / 2);
      var pepNuevo = redondear(pepNuevoExacto);
      r.simulacion = {
        nota: nota,
        ppep: ppepNuevo,
        pepExacto: pepNuevoExacto,
        pep: pepNuevo,
        habilita: pepNuevo >= MINIMO_PEP
      };
      if (r.simulacion.habilita) {
        r.pepParaFinal = pepNuevoExacto;
        if (pepNuevoExacto < MINIMO_PEP) advertir('redondeo_pep');
      }
    }
    return r;
  }

  var ESCALA = [
    { nota: 2, concepto: 'Aceptable', rango: '60 – 70', umbral: 59.5 },
    { nota: 3, concepto: 'Bueno', rango: '71 – 80', umbral: 70.5 },
    { nota: 4, concepto: 'Distinguido', rango: '81 – 90', umbral: 80.5 },
    { nota: 5, concepto: 'Sobresaliente', rango: '91 – 100', umbral: 90.5 }
  ];

  // Mínimo necesario en el examen final para cada calificación (Art. 15).
  function tablaFinal(pep, totalPuntos) {
    var total = totalPuntos > 0 ? totalPuntos : 100;
    return ESCALA.map(function (fila) {
      var necesario = limpiar((fila.umbral - 0.6 * pep) / 0.4);
      var efMinimo = Math.max(MINIMO_FINAL, necesario);
      var alcanzable = efMinimo <= 100;
      return {
        nota: fila.nota,
        concepto: fila.concepto,
        rango: fila.rango,
        efMinimo: alcanzable ? efMinimo : null,
        puntos: alcanzable ? Math.ceil(limpiar((efMinimo / 100) * total)) : null,
        alcanzable: alcanzable
      };
    });
  }

  // Calificación que resulta de un PEP y una nota de examen final dados.
  function calificacion(pep, ef) {
    if (ef < MINIMO_FINAL) return { rp: null, nota: 1 };
    var rp = redondear(0.4 * ef + 0.6 * pep);
    var nota = rp >= 91 ? 5 : rp >= 81 ? 4 : rp >= 71 ? 3 : rp >= 60 ? 2 : 1;
    return { rp: rp, nota: nota };
  }

  var api = {
    ARTICULOS: ARTICULOS,
    porcentaje: porcentaje,
    redondear: redondear,
    evaluar: evaluar,
    tablaFinal: tablaFinal,
    calificacion: calificacion
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Calculadora = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
