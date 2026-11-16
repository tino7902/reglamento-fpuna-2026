/* Formulario y presentación de resultados de la calculadora. */
(function () {
  'use strict';

  var C = window.Calculadora;
  var form = document.getElementById('form-calculadora');
  var cajaErrores = document.getElementById('errores');
  var cajaResultado = document.getElementById('resultado');
  var yaCalculado = false;

  function el(id) { return document.getElementById(id); }

  var formato = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 });
  function num(x) { return formato.format(x); }
  function pct(x) { return num(x) + '%'; }
  var ORDINAL = { 1: 'primer', 2: 'segundo' };
  var ORDINAL_F = { 1: 'primera', 2: 'segunda' };

  // ---------- Campos que dependen de casillas ----------
  var MAX_PRACTICAS = 12;

  function cantidadPracticas(n) {
    var v = Number(el('e' + n + '-lab-prog').value);
    if (isNaN(v) || v < 0 || Math.floor(v) !== v) return 0;
    return Math.min(v, MAX_PRACTICAS);
  }

  // Un campo de porcentaje y una casilla «No asistí» por cada práctica programada.
  function dibujarPracticas(n) {
    var caja = el('e' + n + '-lab-practicas');
    var cantidad = cantidadPracticas(n);
    while (caja.children.length > cantidad) caja.removeChild(caja.lastElementChild);
    for (var i = caja.children.length + 1; i <= cantidad; i++) {
      var fila = document.createElement('div');
      fila.className = 'practica';
      fila.innerHTML =
        '<label>Práctica ' + i + ': porcentaje obtenido (%) ' +
        '<input type="number" id="e' + n + '-lab-p' + i + '" min="0" max="100" step="any" inputmode="decimal"></label>' +
        '<label class="casilla"><input type="checkbox" id="e' + n + '-lab-f' + i + '"> No asistí</label>';
      caja.appendChild(fila);
    }
    for (var j = 1; j <= cantidad; j++) {
      var campo = el('e' + n + '-lab-p' + j);
      campo.disabled = el('e' + n + '-lab-f' + j).checked;
      if (campo.disabled) campo.removeAttribute('aria-invalid');
    }
  }

  function cantidadActividades(n) {
    var v = Number(el('e' + n + '-proc-cant').value);
    if (isNaN(v) || v < 1 || Math.floor(v) !== v) return 0;
    return Math.min(v, MAX_PRACTICAS);
  }

  // Un campo de porcentaje por cada actividad sumativa de la etapa.
  function dibujarActividades(n) {
    var caja = el('e' + n + '-proc-actividades');
    var cantidad = cantidadActividades(n);
    while (caja.children.length > cantidad) caja.removeChild(caja.lastElementChild);
    for (var i = caja.children.length + 1; i <= cantidad; i++) {
      var fila = document.createElement('div');
      fila.className = 'practica';
      fila.innerHTML =
        '<label>Actividad ' + i + ': porcentaje obtenido (%) ' +
        '<input type="number" id="e' + n + '-proc-a' + i + '" min="0" max="100" step="any" inputmode="decimal"></label>';
      caja.appendChild(fila);
    }
  }

  function actualizarCampos() {
    var conLab = el('tiene-lab').checked;
    document.querySelectorAll('.solo-lab').forEach(function (n) { n.hidden = !conLab; });
    [1, 2].forEach(dibujarPracticas);
    var rec = el('recuperatorio');
    rec.disabled = el('no-rendi').checked;
    if (rec.disabled) rec.removeAttribute('aria-invalid');
    [1, 2].forEach(dibujarActividades);
    [1, 2].forEach(function (n) {
      var ausente = el('e' + n + '-ausente').checked;
      var campo = el('e' + n + '-parcial');
      campo.disabled = ausente;
      if (ausente) campo.removeAttribute('aria-invalid');
    });
  }

  // ---------- Lectura y validación ----------
  function leer() {
    var errores = [];
    var invalidos = [];

    function valor(id, etiqueta, opciones) {
      opciones = opciones || {};
      var campo = el(id);
      var texto = campo.value.trim().replace(',', '.');
      campo.removeAttribute('aria-invalid');
      if (texto === '') {
        if (opciones.opcional) return null;
        errores.push('Falta completar: ' + etiqueta + '.');
        invalidos.push(campo);
        return NaN;
      }
      var v = Number(texto);
      var min = opciones.min === undefined ? 0 : opciones.min;
      if (isNaN(v) || v < min || (opciones.max !== undefined && v > opciones.max) ||
          (opciones.entero && Math.floor(v) !== v)) {
        var rango = opciones.max !== undefined ? ' entre ' + num(min) + ' y ' + num(opciones.max) : ' igual o mayor a ' + num(min);
        errores.push(etiqueta + ': ingrese un número' + (opciones.entero ? ' entero' : '') + rango + '.');
        invalidos.push(campo);
        return NaN;
      }
      return v;
    }

    function porcentajeDe(id, etiqueta) {
      var v = valor(id, etiqueta + ', porcentaje obtenido', { max: 100 });
      return { obtenido: v, total: 100 };
    }

    var tieneLab = el('tiene-lab').checked;
    var etapas = [1, 2].map(function (n) {
      var nombre = ORDINAL_F[n].charAt(0).toUpperCase() + ORDINAL_F[n].slice(1) + ' etapa';
      var e = {};
      if (el('e' + n + '-ausente').checked) {
        e.parcial = { ausente: true };
      } else {
        e.parcial = porcentajeDe('e' + n + '-parcial', nombre + ', parcial');
        e.parcial.ausente = false;
      }
      var cant = valor('e' + n + '-proc-cant', nombre + ', cantidad de actividades sumativas', { entero: true, min: 1, max: MAX_PRACTICAS });
      var sumaAct = 0;
      for (var k = 1; k <= cant; k++) {
        sumaAct += valor('e' + n + '-proc-a' + k, nombre + ', actividad ' + k + ', porcentaje obtenido', { max: 100 });
      }
      e.proceso = { obtenido: cant > 0 ? sumaAct / cant : NaN, total: 100 };
      if (tieneLab) {
        var prog = valor('e' + n + '-lab-prog', nombre + ', prácticas programadas', { entero: true, max: MAX_PRACTICAS });
        e.lab = { programadas: 0, asistidas: 0, obtenido: 0, total: 0 };
        if (prog > 0) {
          var suma = 0;
          var asistidas = 0;
          for (var i = 1; i <= prog; i++) {
            if (el('e' + n + '-lab-f' + i).checked) continue; // no asistió: cuenta como 0%
            asistidas++;
            suma += valor('e' + n + '-lab-p' + i, nombre + ', práctica ' + i + ', porcentaje obtenido', { max: 100 });
          }
          e.lab = { programadas: prog, asistidas: asistidas, obtenido: suma / prog, total: 100 };
        }
      }
      return e;
    });

    var asistencia = valor('asistencia', 'Asistencia a clases', { max: 100 });
    var pesoLab = tieneLab ? valor('peso-lab', 'Ponderación del laboratorio', { min: 15, max: 50 }) : 0;
    var finalTotal = valor('final-total', 'Puntaje total del examen final', { min: 1 });
    var recuperatorio = el('no-rendi').checked ? null
      : valor('recuperatorio', 'Porcentaje obtenido en el recuperatorio', { opcional: true, max: 100 });

    if (tieneLab && !errores.length && etapas[0].lab.programadas + etapas[1].lab.programadas === 0) {
      errores.push('Indique cuántas prácticas de laboratorio hay programadas en al menos una etapa, o desmarque la casilla de laboratorios.');
      invalidos.push(el('e1-lab-prog'));
    }

    invalidos.forEach(function (c) { c.setAttribute('aria-invalid', 'true'); });
    return {
      errores: errores,
      finalTotal: finalTotal,
      entrada: { etapas: etapas, asistencia: asistencia, tieneLab: tieneLab, pesoLab: pesoLab, recuperatorio: recuperatorio }
    };
  }

  // ---------- Textos del resultado ----------
  function veredicto(r, finalTotal) {
    var rec = r.recuperatorio;
    var parcial = rec ? ORDINAL[rec.etapa] + ' parcial' : '';
    switch (r.estado) {
      case 'sin_derecho_asistencia':
        return { clase: 'mal', titulo: 'No obtiene derecho a examen final',
          texto: ['La asistencia a clases registrada (' + pct(r.asistencia) + ') es inferior al 50%. Con ese porcentaje no se cumple el requisito de asistencia para el examen final ni para el recuperatorio.',
                  'Corresponde cursar nuevamente la asignatura.'] };
      case 'sin_derecho_laboratorio':
        return { clase: 'mal', titulo: 'No obtiene derecho a examen final',
          texto: ['Asistió a ' + r.lab.asistidas + ' de ' + r.lab.programadas + ' prácticas de laboratorio. Las ' + r.lab.faltas + ' prácticas faltantes superan el máximo que se puede recuperar (' + r.lab.maximoRecuperable + ', el 25% del total), por lo que no es posible alcanzar el 100% de asistencia exigido.',
                  'Corresponde cursar nuevamente la asignatura.'] };
      case 'sin_derecho_ausente_ambos':
        return { clase: 'mal', titulo: 'No obtiene derecho a examen final',
          texto: ['No se presentó a ninguno de los dos parciales. El reglamento permite recuperar solo uno de ellos, en caso de ausencia a una de las evaluaciones.',
                  'Corresponde cursar nuevamente la asignatura.'] };
      case 'sin_derecho_proceso':
        return { clase: 'mal', titulo: 'No habilita y no puede rendir recuperatorio',
          texto: ['Su PEP es de ' + pct(r.pepExacto) + ', inferior al 60% necesario para el examen final.',
                  'El parcial que correspondería recuperar es el ' + parcial + ' (el de menor porcentaje), pero en las actividades de proceso de esa etapa obtuvo ' + pct(rec.procesoPct) + ', menos del 60% que se exige para acceder al recuperatorio.',
                  'Corresponde cursar nuevamente la asignatura.'] };
      case 'habilitado':
        if (r.convocatoria === 1) {
          return { clase: 'ok', titulo: 'Habilita el examen final desde la primera convocatoria',
            texto: ['Su PEP es de ' + pct(r.pepExacto) + ' (mínimo: 60%) y su asistencia a clases es de ' + pct(r.asistencia) + ' (70% o más).'] };
        }
        return { clase: 'alerta', titulo: 'Habilita el examen final a partir de la segunda convocatoria',
          texto: ['Su PEP es de ' + pct(r.pepExacto) + ' (mínimo: 60%), pero su asistencia a clases es de ' + pct(r.asistencia) + ', entre 50% y 70%. Por ese motivo no puede rendir en la primera convocatoria.'] };
      case 'recuperatorio':
        var motivo = rec.tipo === 'ausencia'
          ? 'No se presentó al ' + parcial + ' y su PEP actual es de ' + pct(r.pepExacto) + ', inferior al 60%.'
          : 'Su PEP es de ' + pct(r.pepExacto) + ', inferior al 60% necesario para el examen final.';
        var puntos = Math.ceil(Math.round(rec.minimo / 100 * finalTotal * 1e6) / 1e6);
        return { clase: 'alerta', titulo: 'Debe rendir recuperatorio',
          texto: [motivo + ' Puede recuperar el ' + parcial + '.',
                  'El recuperatorio es el examen de la primera convocatoria del final: mismos temas, mismo día, hora y sala. La nota que obtenga reemplaza a la del ' + parcial + ' y se vuelve a calcular el PEP. Si el nuevo PEP llega al 60%, queda habilitado para rendir el examen final en la segunda convocatoria.',
                  '<span class="destacado">Mínimo necesario en el recuperatorio: ' + pct(rec.minimo) + ' (' + num(puntos) + ' de ' + num(finalTotal) + ' puntos).</span>'] };
      case 'recuperatorio_inalcanzable':
        return { clase: 'mal', titulo: 'El recuperatorio no alcanza para habilitar',
          texto: ['Su PEP es de ' + pct(r.pepExacto) + '. Cumple las condiciones para recuperar el ' + parcial + ', pero aun obteniendo el 100% en el recuperatorio el PEP no llegaría al 60%.',
                  'Corresponde cursar nuevamente la asignatura.'] };
    }
    return { clase: 'mal', titulo: 'Sin resultado', texto: [] };
  }

  function textoAdvertencia(codigo, r) {
    switch (codigo) {
      case 'redondeo_pep':
        return 'El resultado depende del redondeo: el PEP sin redondear es inferior a 60% y se consideró redondeado a 60%. El Art. 15, inc. c, establece el redondeo para el Rendimiento Porcentual, pero no lo menciona para el PEP. Se recomienda confirmarlo con el docente.';
      case 'redondeo_proceso':
        return 'El promedio de las actividades de proceso de la etapa a recuperar es inferior a 60% sin redondear y se consideró redondeado a 60%. Se recomienda confirmarlo con el docente.';
      case 'laboratorio_recuperar':
        return 'Tiene ' + r.lab.faltas + (r.lab.faltas === 1 ? ' práctica de laboratorio pendiente' : ' prácticas de laboratorio pendientes') + '. Este resultado solo es válido si completa la recuperación, que debe solicitarse al Departamento de Aprendizaje de la Carrera y realizarse en la etapa correspondiente (Art. 11, inc. b).';
      case 'ausente_con_pep_suficiente':
        return 'No se presentó a uno de los parciales, aunque su PEP alcanza el 60%. El Art. 12, inc. a, establece que el estudiante debe presentarse a los dos parciales. Se recomienda confirmar con el docente si debe recuperarlo.';
    }
    return '';
  }

  function desglose(r) {
    var conLab = !!r.lab;
    var filas = r.etapas.map(function (e, i) {
      return '<tr><th scope="row">' + (i === 0 ? 'Primera etapa' : 'Segunda etapa') + '</th>' +
        '<td class="numerica">' + (e.ausente ? 'Ausente' : pct(e.parcialPct)) + '</td>' +
        '<td class="numerica">' + pct(e.actividadesPct) + '</td>' +
        (conLab ? '<td class="numerica">' + (e.labPct === null ? '—' : pct(e.labPct)) + '</td>' : '') +
        '<td class="numerica">' + pct(e.procesoPct) + '</td>' +
        '<td class="numerica">' + pct(e.ppep) + '</td></tr>';
    }).join('');
    var columnas = conLab ? 5 : 4;
    return '<h4>Detalle del cálculo</h4><div class="tabla-desplazable"><table class="tabla-simple">' +
      '<thead><tr><th scope="col">Etapa</th><th scope="col" class="numerica">Parcial</th>' +
      '<th scope="col" class="numerica">Actividades</th>' +
      (conLab ? '<th scope="col" class="numerica">Laboratorio</th>' : '') +
      '<th scope="col" class="numerica">Proceso</th><th scope="col" class="numerica">PPEP</th></tr></thead>' +
      '<tbody>' + filas + '<tr class="fila-total"><th scope="row" colspan="' + columnas + '">PEP = (PPEP1 + PPEP2) ÷ 2</th>' +
      '<td class="numerica">' + pct(r.pepExacto) + '</td></tr></tbody></table></div>';
  }

  function simulacion(r) {
    var s = r.simulacion;
    if (!s) return '';
    var parcial = ORDINAL[r.recuperatorio.etapa] + ' parcial';
    var clase = s.habilita ? 'ok' : 'mal';
    var titulo = s.habilita ? 'Con esa nota, habilita la segunda convocatoria' : 'Con esa nota, no habilita el examen final';
    var texto = 'Con ' + pct(s.nota) + ' en el recuperatorio en reemplazo del ' + parcial + ', el PEP pasa de ' + pct(r.pepExacto) + ' a ' + pct(s.pepExacto) + '. ' +
      (s.habilita ? 'Queda habilitado para rendir el examen final en la segunda convocatoria.'
                  : 'No alcanza el 60% y corresponde cursar nuevamente la asignatura.');
    return '<h4>Simulación del recuperatorio</h4><div class="veredicto ' + clase + '"><h3>' + titulo + '</h3><p>' + texto + '</p></div>';
  }

  function tablaFinal(r, finalTotal) {
    if (r.pepParaFinal === null) return '';
    var filas = C.tablaFinal(r.pepParaFinal, finalTotal).map(function (f) {
      var minimo = f.alcanzable
        ? '<td class="numerica">' + pct(f.efMinimo) + '</td><td class="numerica">' + num(f.puntos) + ' de ' + num(finalTotal) + '</td>'
        : '<td class="numerica no-alcanzable" colspan="2">No alcanzable con este PEP</td>';
      return '<tr><th scope="row">' + f.nota + ' · ' + f.concepto + '</th><td class="numerica">' + f.rango + '</td>' + minimo + '</tr>';
    }).join('');
    var convocatoria = r.simulacion ? 'la segunda convocatoria' : 'el examen final';
    return '<h4>Cuánto necesita en ' + convocatoria + '</h4>' +
      '<p>Con un PEP de ' + pct(r.pepParaFinal) + ', estos son los mínimos para cada calificación (RP = 0,4 × examen final + 0,6 × PEP):</p>' +
      '<div class="tabla-desplazable"><table class="tabla-simple"><thead><tr><th scope="col">Calificación</th>' +
      '<th scope="col" class="numerica">Rendimiento (%)</th><th scope="col" class="numerica">Mínimo en el final</th>' +
      '<th scope="col" class="numerica">En puntos</th></tr></thead><tbody>' + filas + '</tbody></table></div>' +
      '<p class="ayuda">Con menos de 50% en el examen final, este no es considerado y la calificación es 1 (reprobado), cualquiera sea el PEP.</p>';
  }

  function fundamento(r) {
    var claves = r.fundamentos.slice();
    if (r.pepParaFinal !== null) claves.push('15.a', '15.c');
    if (r.estado === 'habilitado' || r.estado === 'recuperatorio') claves.push('13.b.4-5');
    var vistos = {};
    var citas = claves.filter(function (k) {
      if (vistos[k] || !C.ARTICULOS[k]) return false;
      vistos[k] = true;
      return true;
    }).map(function (k) {
      var a = C.ARTICULOS[k];
      return '<blockquote><p>«' + a.texto + '»</p><footer>' + a.ref + ', Reglamento Académico 2026</footer></blockquote>';
    }).join('');
    return '<div class="fundamento"><h4>Fundamento</h4>' + citas + '</div>';
  }

  function mostrar(r, finalTotal) {
    var v = veredicto(r, finalTotal);
    var html = '<div class="veredicto ' + v.clase + '"><h3>' + v.titulo + '</h3>' +
      v.texto.map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div>';
    if (r.advertencias.length) {
      html += '<h4>A tener en cuenta</h4><ul class="advertencias">' +
        r.advertencias.map(function (a) { return '<li>' + textoAdvertencia(a, r) + '</li>'; }).join('') + '</ul>';
    }
    html += simulacion(r) + desglose(r) + tablaFinal(r, finalTotal) + fundamento(r);
    cajaResultado.innerHTML = html;
  }

  // ---------- Eventos ----------
  function calcular(desdeBoton) {
    var datos = leer();
    if (datos.errores.length) {
      cajaErrores.hidden = false;
      cajaErrores.innerHTML = '<strong>Revise los siguientes datos:</strong><ul>' +
        datos.errores.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul>';
      cajaResultado.innerHTML = '';
      return;
    }
    cajaErrores.hidden = true;
    cajaErrores.innerHTML = '';
    mostrar(C.evaluar(datos.entrada), datos.finalTotal);
    if (desdeBoton) {
      cajaResultado.focus({ preventScroll: true });
      cajaResultado.scrollIntoView({ block: 'start' });
    }
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    yaCalculado = true;
    calcular(true);
  });

  form.addEventListener('input', function () {
    actualizarCampos();
    if (yaCalculado) calcular(false);
  });

  form.addEventListener('reset', function () {
    yaCalculado = false;
    setTimeout(function () {
      actualizarCampos();
      cajaErrores.hidden = true;
      cajaResultado.innerHTML = '';
      form.querySelectorAll('[aria-invalid]').forEach(function (c) { c.removeAttribute('aria-invalid'); });
    }, 0);
  });

  actualizarCampos();
})();
