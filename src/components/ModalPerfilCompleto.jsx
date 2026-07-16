import React from 'react';
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
 * estadísticas con sus 4 gráficos expandibles, y el botón de cerrar
 * sesión.
 *
 * 🐛 Bug corregido al extraer este componente: el formulario llamaba a
 * `handleActualizarDatoPerfil` para guardar nombre/estilo/estación, pero
 * esa función no existía en ningún sitio del código — escribir en esos
 * campos rompía con un error. Se ha añadido en App.jsx y se pasa aquí
 * como prop.
 */
export function ModalPerfilCompleto({
  abierto,
  usuario,
  onCerrar,
  subiendoFoto,
  handleSubirFotoPerfil,
  handleActualizarDatoPerfil,
  graficoExpandido,
  setGraficoExpandido,
  datosColores,
  datosPrendas,
  datosMarcas,
  datosCrecimiento,
  datosEstaciones,
  cerrarSesionActiva,
}) {
  if (!abierto || !usuario) return null;

  return (
    <>
      {/* Fondo súper oscuro y muy blurreado */}
      <div className="modal-perfil-completo-overlay" onClick={onCerrar} />

      {/* Panel central grande */}
      <div className="modal-perfil-completo-contenedor">
        <button className="btn-cerrar-perfil-modal" onClick={onCerrar} aria-label="Cerrar">✕</button>

        {/* 1. Zona Superior: Foto */}
        <div className="perfil-completo-avatar-seccion" style={{ position: 'relative' }}>
          <SelectorFoto
            accept="image/jpeg, image/png, image/jpg"
            capturaCamara="user"
            onArchivoSeleccionado={handleSubirFotoPerfil}
            trigger={(alternar) => (
              <div className="avatar-wrapper-edicion" onClick={() => !subiendoFoto && alternar()}>
                {subiendoFoto ? (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>Cargando...</div>
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
              value={usuario?.displayName || ''}
              onChange={(e) => handleActualizarDatoPerfil('displayName', e.target.value)}
              placeholder="Tu nombre o apodo"
            />
          </div>

          <div className="input-group-perfil">
            <label>Estilo de Armario</label>
            <select
              className="select-perfil-estilo"
              value={usuario?.estiloArmario || 'minimalista'}
              onChange={(e) => handleActualizarDatoPerfil('estiloArmario', e.target.value)}
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
              value={usuario?.estacionFavorita || 'verano'}
              onChange={(e) => handleActualizarDatoPerfil('estacionFavorita', e.target.value)}
            >
              <option value="primavera">Primavera</option>
              <option value="verano">Verano</option>
              <option value="otono">Otoño</option>
              <option value="invierno">Invierno</option>
            </select>
          </div>
        </div>

        <div className="linea-separadora-fija" />

        {/* 3. Zona Inferior: Cuadro de Mandos Analítico */}
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

        {/* 4. Pie del Pop-up: Cerrar Sesión */}
        <button
          className="btn-logout-modal-completo-rojo"
          onClick={() => { cerrarSesionActiva(); onCerrar(); }}
        >
          Cerrar Sesión
        </button>
      </div>
    </>
  );
}
