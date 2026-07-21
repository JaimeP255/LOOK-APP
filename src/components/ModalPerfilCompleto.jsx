import React, { useState, useEffect } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, Tooltip,
  RadialBarChart, RadialBar,
} from 'recharts';
import { SelectorFoto } from './SelectorFoto';
import { AVATAR_POR_DEFECTO } from '../utils/avatar';

/**
 * ModalPerfilCompleto
 * --------------------
 * El panel de perfil completo: foto (con SelectorFoto), datos básicos
 * (nombre, estilo de armario, estación favorita), el cuadro de
 * estadísticas con sus 4 gráficos expandibles, y el botón de abajo
 * (que alterna entre "Cerrar Sesión" y "Guardar cambios").
 *
 * 🔄 Cambio de comportamiento: antes, cada campo se guardaba solo con
 * cada tecla que pulsabas. Ahora los cambios se quedan en un "borrador"
 * local hasta que pulsas "Guardar cambios" — que aparece automáticamente,
 * en el mismo sitio donde estaba "Cerrar Sesión", en cuanto tocas algo.
 *
 * 🆕 Modo onboarding (primer registro): si `modoOnboarding` es true, no
 * se puede cerrar el modal (ni con la X ni tocando fuera) hasta que se
 * guarde al menos una vez — así te obligamos a completar lo básico del
 * perfil antes de usar la app por primera vez.
 */
export function ModalPerfilCompleto({
  abierto,
  usuario,
  onCerrar,
  modoOnboarding,
  onCompletarOnboarding,
  subiendoFoto,
  handleSubirFotoPerfil,
  onGuardarCambios,
  tema,
  cambiarTema,
  graficoExpandido,
  setGraficoExpandido,
  datosColores,
  datosPrendas,
  datosMarcas,
  datosCrecimiento,
  datosEstaciones,
  cerrarSesionActiva,
  onExportarDatos,
  exportando,
  onAbrirEliminarCuenta,
}) {
  // Borrador local de los 3 campos de texto/selección. La foto y el
  // tema siguen guardándose al instante (tienen su propio feedback
  // visual ya, y tiene sentido que el tema se aplique en vivo).
  const [nombreDraft, setNombreDraft] = useState('');
  const [estiloDraft, setEstiloDraft] = useState('minimalista');
  const [estacionDraft, setEstacionDraft] = useState('verano');
  const [guardando, setGuardando] = useState(false);

  // Cada vez que se abre el modal (o cambia el usuario), reiniciamos el
  // borrador para que refleje lo que hay guardado de verdad — evita
  // arrastrar cambios sin guardar de una apertura anterior.
  useEffect(() => {
    if (abierto && usuario) {
      setNombreDraft(usuario.displayName || '');
      setEstiloDraft(usuario.estiloArmario || 'minimalista');
      setEstacionDraft(usuario.estacionFavorita || 'verano');
    }
  }, [abierto, usuario]);

  if (!abierto || !usuario) return null;

  const hayCambios =
    nombreDraft !== (usuario.displayName || '') ||
    estiloDraft !== (usuario.estiloArmario || 'minimalista') ||
    estacionDraft !== (usuario.estacionFavorita || 'verano');

  const manejarGuardar = async () => {
    setGuardando(true);
    try {
      await onGuardarCambios({
        displayName: nombreDraft,
        estiloArmario: estiloDraft,
        estacionFavorita: estacionDraft,
      });
      if (modoOnboarding) {
        onCompletarOnboarding();
      }
    } catch {
      // El propio onGuardarCambios ya muestra un toast de error —
      // aquí no hace falta hacer nada más, simplemente no cerramos.
    } finally {
      setGuardando(false);
    }
  };

  const cerrarSiNoEsOnboarding = () => {
    if (!modoOnboarding) onCerrar();
  };

  return (
    <>
      {/* Fondo súper oscuro y muy blurreado */}
      <div className="modal-perfil-completo-overlay" onClick={cerrarSiNoEsOnboarding} />

      {/* Panel central grande */}
      <div className="modal-perfil-completo-contenedor">
        {!modoOnboarding && (
          <button className="btn-cerrar-perfil-modal" onClick={onCerrar} aria-label="Cerrar">✕</button>
        )}

        {modoOnboarding && (
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-texto-suave)', fontWeight: '600', margin: '0 0 8px 0' }}>
            ¡Bienvenido! Completa tu perfil para empezar
          </p>
        )}

        {/* 1. Zona Superior: Foto */}
        <div className="perfil-completo-avatar-seccion" style={{ position: 'relative' }}>
          <SelectorFoto
            accept="image/jpeg, image/png, image/jpg"
            capturaCamara="user"
            onArchivoSeleccionado={handleSubirFotoPerfil}
            trigger={(alternar) => (
              <div className="avatar-wrapper-edicion" onClick={() => !subiendoFoto && alternar()}>
                {subiendoFoto ? (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--gris-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--color-texto-suave)' }}>Cargando...</div>
                ) : (
                  <img src={usuario.photoURL || AVATAR_POR_DEFECTO} alt="Tu foto de perfil" />
                )}
              </div>
            )}
          />
        </div>

        {/* 2. Zona Media: Datos */}
        <div className="perfil-completo-datos">
          <div className="input-group-perfil">
            <label>Nombre de usuario</label>
            <input
              type="text"
              value={nombreDraft}
              onChange={(e) => setNombreDraft(e.target.value)}
              placeholder="Tu nombre o apodo"
            />
          </div>

          <div className="input-group-perfil">
            <label>Estilo de Armario</label>
            <select
              className="select-perfil-estilo"
              value={estiloDraft}
              onChange={(e) => setEstiloDraft(e.target.value)}
            >
              <option value="minimalista">Minimalista &amp; Cápsula</option>
              <option value="casual">Casual / Diario</option>
              <option value="formal">Formal / De Negocios</option>
              <option value="streetwear">Streetwear / Urbano</option>
            </select>
          </div>

          <div className="input-group-perfil">
            <label>Estación favorita</label>
            <select
              className="select-perfil-estilo"
              value={estacionDraft}
              onChange={(e) => setEstacionDraft(e.target.value)}
            >
              <option value="primavera">Primavera</option>
              <option value="verano">Verano</option>
              <option value="otono">Otoño</option>
              <option value="invierno">Invierno</option>
            </select>
          </div>

          <div className="input-group-perfil">
            <label>Apariencia</label>
            <div className="selector-tema-grupo">
              <button
                type="button"
                className={`selector-tema-opcion ${tema === 'claro' ? 'activo' : ''}`}
                onClick={() => cambiarTema('claro')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                Claro
              </button>
              <button
                type="button"
                className={`selector-tema-opcion ${tema === 'oscuro' ? 'activo' : ''}`}
                onClick={() => cambiarTema('oscuro')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                Oscuro
              </button>
            </div>
          </div>
        </div>

        <div className="linea-separadora-fija" />

        {/* 3. Zona Inferior: Cuadro de Mandos Analítico (oculto durante el onboarding, no hay nada que mostrar aún) */}
        {!modoOnboarding && (
          <div className="perfil-completo-estadisticas">
            <h4>Mis estadísticas</h4>

            {!graficoExpandido ? (
              <div className="contenedor-grid-graficos-cuadrado">
                <div className="tarjeta-grafico-item-click" onClick={() => setGraficoExpandido('colores')}>
                  <span className="titulo-grafico-btn">Colores</span>
                  <span className="icono-expandir-mini">↗</span>
                </div>

                <div className="tarjeta-grafico-item-click" onClick={() => setGraficoExpandido('tipos')}>
                  <span className="titulo-grafico-btn">Prendas</span>
                  <span className="icono-expandir-mini">↗</span>
                </div>

                <div className="tarjeta-grafico-item-click" onClick={() => setGraficoExpandido('marcas')}>
                  <span className="titulo-grafico-btn">Marcas</span>
                  <span className="icono-expandir-mini">↗</span>
                </div>

                <div className="tarjeta-grafico-item-click" onClick={() => setGraficoExpandido('crecimiento')}>
                  <span className="titulo-grafico-btn">Compras</span>
                  <span className="icono-expandir-mini">↗</span>
                </div>
              </div>
            ) : (
              <div className="grafico-vista-maximizada">
                <button className="btn-volver-mini" onClick={() => setGraficoExpandido(null)}>← Volver al cuadro</button>

                <div className="caja-grafico-grande-real">
                  {graficoExpandido === 'colores' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={datosColores}>
                        <PolarGrid stroke="#ccc" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#111' }} />
                        <Radar name="Prendas" dataKey="A" stroke="#111111" fill="#111111" fillOpacity={0.35} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}

                  {graficoExpandido === 'tipos' && (() => {
                    const datos = datosPrendas;
                    const totalPrendas = datos.reduce((suma, item) => suma + item.cantidad, 0);
                    const maxCantidad = Math.max(...datos.map((d) => d.cantidad), 1);

                    return (
                      <div className="nube-palabras-contenedor">
                        {datos.length === 0 ? (
                          <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>Tu armario está vacío</p>
                        ) : (
                          datos.map((item, idx) => {
                            const frecuencia = totalPrendas > 0 ? item.cantidad / totalPrendas : 0;
                            const fontSize = Math.min(16 + frecuencia * 80, 60);
                            const intensidadColor = item.cantidad / maxCantidad;
                            const saturation = 30 + intensidadColor * 70;
                            const lightness = 85 - intensidadColor * 73;
                            const colorDinamico = `hsl(220, ${saturation}%, ${lightness}%)`;

                            return (
                              <span
                                key={idx}
                                className="palabra-nube"
                                style={{ fontSize: `${fontSize}px`, color: colorDinamico, animationDelay: `${idx * 0.04}s` }}
                              >
                                {item.name}
                              </span>
                            );
                          })
                        )}
                      </div>
                    );
                  })()}

                  {graficoExpandido === 'marcas' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={datosMarcas}>
                        <PolarGrid stroke="#ccc" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#111' }} />
                        <Radar name="Marcas" dataKey="A" stroke="#333333" fill="#333333" fillOpacity={0.3} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}

                  {graficoExpandido === 'crecimiento' && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ textAlign: 'center', fontSize: '13px', color: '#8e8e93', margin: '0 0 15px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Prendas nuevas
                      </h4>
                      <ResponsiveContainer width="100%" height="80%">
                        <BarChart data={datosCrecimiento}>
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{ fill: '#f4f4f5' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', fontSize: '13px', fontWeight: '800', color: '#111' }}
                          />
                          <Bar dataKey="Nuevas" fill="#111111" radius={[6, 6, 6, 6]} barSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {graficoExpandido === 'estaciones' && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <ResponsiveContainer width="100%" height="80%">
                        <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={12} data={datosEstaciones}>
                          <RadialBar minAngle={15} background clockWise dataKey="v" label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }} />
                          <Tooltip />
                        </RadialBarChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', marginTop: '5px', textAlign: 'center' }}>
                        <div><span style={{ color: '#e67e22' }}>●</span> Verano</div>
                        <div><span style={{ color: '#2980b9' }}>●</span> Invierno</div>
                        <div><span style={{ color: '#27ae60' }}>●</span> Primavera</div>
                        <div><span style={{ color: '#d35400' }}>●</span> Otoño</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Pie del Pop-up: alterna entre "Guardar cambios" y "Cerrar Sesión" */}
        {modoOnboarding || hayCambios ? (
          <button
            className="btn-logout-modal-completo-rojo"
            style={{ backgroundColor: 'var(--color-acento)', color: '#ffffff' }}
            onClick={manejarGuardar}
            disabled={guardando || (modoOnboarding && !nombreDraft.trim())}
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        ) : (
          <button
            className="btn-logout-modal-completo-rojo"
            onClick={() => { cerrarSesionActiva(); onCerrar(); }}
          >
            Cerrar Sesión
          </button>
        )}

        {/* 5. Tus datos: exportar y eliminar cuenta (oculto durante el registro inicial) */}
        {!modoOnboarding && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={onExportarDatos}
              disabled={exportando}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: '12px', fontWeight: '600', color: 'var(--color-texto-suave)', cursor: exportando ? 'default' : 'pointer' }}
            >
              {exportando ? 'Preparando...' : 'Exportar mis datos'}
            </button>
            <span style={{ color: 'var(--color-borde-fuerte)', fontSize: '12px' }}>·</span>
            <button
              type="button"
              onClick={onAbrirEliminarCuenta}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: '12px', fontWeight: '600', color: 'var(--color-peligro)', cursor: 'pointer' }}
            >
              Eliminar mi cuenta
            </button>
          </div>
        )}
      </div>
    </>
  );
}
