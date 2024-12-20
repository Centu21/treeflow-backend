const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sql = require('mssql');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();




// Configuración del servidor
const app = express(); // Aseguramos que `app` esté definido correctamente


// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Configuración de multer para manejar FormData
const upload = multer(); // Inicializa multer para manejar solicitudes multipart/form-data


// **CONFIGURACIÓN DE LA BASE DE DATOS** (Declaración única)
const dbConfig = {
  user: process.env.DB_USER || 'VANE',
  password: process.env.DB_PASSWORD || '141089river',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'treeflow',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  pool: { max: 200, // Máximo de conexiones  
   min: 2, // Mínimo de conexiones 
    idleTimeoutMillis: 30000 // Tiempo antes de liberar conexiones inactivas 
},
  options: {
    encrypt: false, // Cambia a true si usas Azure SQL o conexiones seguras
    trustServerCertificate: true, // Necesario si usas certificados auto-firmados
  },
};


// Conexión a la base de datos
sql.connect(dbConfig, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    process.exit(1); // Finaliza la aplicación si no puede conectar
  } else {
    console.log('Conectado a la base de datos correctamente.');
  }
});


// **RUTA PARA CREAR UN ÁRBOL**
app.post('/api/arboles', upload.single('foto'), async (req, res) => {
  console.log('Datos recibidos en el backend:', req.body);
  console.log('Archivo recibido:', req.file); // Archivo enviado como parte de FormData


  const {
    comuna_id,
    calle_id,
    altura,
    referencia_id,
    especie_id,
    altura_arbol,
    dap,
    estado_fitosanitario_id,
    fase_vital_id,
    inclinacion_id,
    ahuecamiento_id,
    estado_plantera_id,
    ancho_acera_id,
    observaciones,
  } = req.body;


  // Validación de campos obligatorios
  if (
    !comuna_id ||
    !calle_id ||
    !altura ||
    !referencia_id ||
    !especie_id ||
    !altura_arbol ||
    !dap ||
    !estado_fitosanitario_id ||
    !fase_vital_id ||
    !inclinacion_id ||
    !ahuecamiento_id ||
    !estado_plantera_id ||
    !ancho_acera_id ||
    !observaciones
  ) {
    return res.status(400).json({ error: 'Por favor, completa todos los campos obligatorios.' });
  }


  try {
    const query = `
        INSERT INTO dbo.arboles (
            comuna_id,
            calle_id,
            altura,
            referencia_id,
            especie_id,
            altura_arbol,
            dap,
            estado_fitosanitario_id,
            fase_vital_id,
            inclinacion_id,
            ahuecamiento_id,
            estado_plantera_id,
            ancho_acera_id,
            observaciones,
            foto
        ) VALUES (
            @comuna_id, @calle_id, @altura, @referencia_id, @especie_id,
            @altura_arbol, @dap, @estado_fitosanitario_id, @fase_vital_id,
            @inclinacion_id, @ahuecamiento_id, @estado_plantera_id,
            @ancho_acera_id, @observaciones, @foto
        );
    `;


    const request = new sql.Request();
    request.input('comuna_id', sql.Int, comuna_id);
    request.input('calle_id', sql.Int, calle_id);
    request.input('altura', sql.Int, altura);
    request.input('referencia_id', sql.Int, referencia_id || null);
    request.input('especie_id', sql.Int, especie_id);
    request.input('altura_arbol', sql.Decimal(4, 2), altura_arbol || null);
    request.input('dap', sql.Decimal(4, 2), dap || null);
    request.input('estado_fitosanitario_id', sql.Int, estado_fitosanitario_id || null);
    request.input('fase_vital_id', sql.Int, fase_vital_id || null);
    request.input('inclinacion_id', sql.Int, inclinacion_id || null);
    request.input('ahuecamiento_id', sql.Int, ahuecamiento_id || null);
    request.input('estado_plantera_id', sql.Int, estado_plantera_id || null);
    request.input('ancho_acera_id', sql.Int, ancho_acera_id || null);
    request.input('observaciones', sql.NVarChar(250), observaciones || null);
    request.input('foto', sql.NVarChar(255), req.file ? req.file.originalname : null);


    await request.query(query);
    res.status(201).json({ mensaje: 'Árbol registrado exitosamente' });
  } catch (error) {
    console.error('Error al registrar el árbol:', error);
    res.status(500).json({ error: 'Hubo un problema al registrar el árbol', detalle: error.message });
  }
});

// **RUTA PARA OBTENER TODOS LOS ARBOLES CENSADOS**

app.get('/api/arboles-censados', async (req, res) => {
  const {
    comuna_id,
    calle_id,
    especie_id,
    estado_fitosanitario_id,
    nivel_inclinaciones_id,
    nivel_ahuecamientos_id
  } = req.query;

  const query = `
    SELECT
      a.id AS arbol_id,
      c.nombre AS comuna,
      ca.nombre AS calle,
      a.altura AS altura,
      r.descripcion AS referencia,
      e.nombre AS especie,
      a.altura_arbol,
      a.dap,
      ef.estado AS estado_fitosanitario,
      fv.fase AS fase_vital,
      i.nivel AS inclinacion,
      ah.nivel AS ahuecamiento,
      ep.estado AS estado_plantera,
      aa.ancho AS ancho_acera,
      a.observaciones,
      a.foto,
      FORMAT(a.created_at, 'yyyy-MM-dd') AS fecha_censado
    FROM dbo.arboles a
    LEFT JOIN dbo.comunas c ON a.comuna_id = c.id
    LEFT JOIN dbo.calles ca ON a.calle_id = ca.id
    LEFT JOIN dbo.referencias r ON a.referencia_id = r.id
    LEFT JOIN dbo.especies e ON a.especie_id = e.id
    LEFT JOIN dbo.estados_fitosanitarios ef ON a.estado_fitosanitario_id = ef.id
    LEFT JOIN dbo.fases_vitales fv ON a.fase_vital_id = fv.id
    LEFT JOIN dbo.inclinaciones i ON a.inclinacion_id = i.id
    LEFT JOIN dbo.ahuecamientos ah ON a.ahuecamiento_id = ah.id
    LEFT JOIN dbo.estados_plantera ep ON a.estado_plantera_id = ep.id
    LEFT JOIN dbo.ancho_acera aa ON a.ancho_acera_id = aa.id
    WHERE 1=1
      ${comuna_id ? 'AND a.comuna_id = @comuna_id' : ''}
      ${calle_id ? 'AND a.calle_id = @calle_id' : ''}
      ${especie_id ? 'AND a.especie_id = @especie_id' : ''}
      ${estado_fitosanitario_id ? 'AND a.estado_fitosanitario_id = @estado_fitosanitario_id' : ''}
      ${nivel_inclinaciones_id ? 'AND a.inclinacion_id = @nivel_inclinaciones_id' : ''}
      ${nivel_ahuecamientos_id ? 'AND a.ahuecamiento_id = @nivel_ahuecamientos_id' : ''}
  `;

  try {
    const pool = await sql.connect(dbConfig);
    const request = pool.request();

    // Pasar parámetros dinámicos a la consulta
    if (comuna_id) request.input('comuna_id', sql.Int, comuna_id);
    if (calle_id) request.input('calle_id', sql.Int, calle_id);
    if (especie_id) request.input('especie_id', sql.Int, especie_id);
    if (estado_fitosanitario_id) request.input('estado_fitosanitario_id', sql.Int, estado_fitosanitario_id);
    if (nivel_inclinaciones_id) request.input('nivel_inclinaciones_id', sql.Int, nivel_inclinaciones_id);
    if (nivel_ahuecamientos_id) request.input('nivel_ahuecamientos_id', sql.Int, nivel_ahuecamientos_id);

    const result = await request.query(query);

    // Enviar los datos al frontend
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener los datos de árboles censados:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los datos de árboles censados',
      error: error.message
    });
  }
});


// **RUTA PARA OBTENER UN ÁRBOL POR ID**
app.get('/api/arboles/:id', async (req, res) => {
  const { id } = req.params;
  try {
      const result = await sql.query(`SELECT * FROM dbo.arboles WHERE id = ${id}`);
      if (result.recordset.length === 0) {
          return res.status(404).json({ mensaje: "Árbol no encontrado" });
      }
      res.json(result.recordset[0]);
  } catch (error) {
      console.error('Error al obtener el árbol:', error);
      res.status(500).json({ error: 'Error al obtener el árbol' });
  }
});

// **RUTA PARA ACTUALIZAR UN ÁRBOL**
app.put('/api/arboles/:id', async (req, res) => {
  const { id } = req.params;
  const {
      comuna_id,
      calle_id,
      altura,
      referencia_id,
      especie_id,
      altura_arbol,
      dap,
      estado_fitosanitario_id,
      fase_vital_id,
      inclinacion_id,
      ahuecamiento_id,
      estado_plantera_id,
      ancho_acera_id,
      observaciones,
      foto
  } = req.body;

  if (!comuna_id || !calle_id || !altura || !especie_id) {
      return res.status(400).json({ error: "Por favor, completa todos los campos obligatorios." });
  }

  try {
      const query = `
          UPDATE dbo.arboles SET
              comuna_id = @comuna_id,
              calle_id = @calle_id,
              altura = @altura,
              referencia_id = @referencia_id,
              especie_id = @especie_id,
              altura_arbol = @altura_arbol,
              dap = @dap,
              estado_fitosanitario_id = @estado_fitosanitario_id,
              fase_vital_id = @fase_vital_id,
              inclinacion_id = @inclinacion_id,
              ahuecamiento_id = @ahuecamiento_id,
              estado_plantera_id = @estado_plantera_id,
              ancho_acera_id = @ancho_acera_id,
              observaciones = @observaciones,
              foto = @foto
          WHERE id = @id;
      `;

      const request = new sql.Request();
      request.input('id', sql.Int, id);
      request.input('comuna_id', sql.Int, comuna_id);
      request.input('calle_id', sql.Int, calle_id);
      request.input('altura', sql.Int, altura);
      request.input('referencia_id', sql.Int, referencia_id || null);
      request.input('especie_id', sql.Int, especie_id);
      request.input('altura_arbol', sql.Decimal(4, 2), altura_arbol || null);
      request.input('dap', sql.Decimal(4, 2), dap || null);
      request.input('estado_fitosanitario_id', sql.Int, estado_fitosanitario_id || null);
      request.input('fase_vital_id', sql.Int, fase_vital_id || null);
      request.input('inclinacion_id', sql.Int, inclinacion_id || null);
      request.input('ahuecamiento_id', sql.Int, ahuecamiento_id || null);
      request.input('estado_plantera_id', sql.Int, estado_plantera_id || null);
      request.input('ancho_acera_id', sql.Int, ancho_acera_id || null);
      request.input('observaciones', sql.NVarChar(250), observaciones || null);
      request.input('foto', sql.NVarChar(255), foto || null);

      await request.query(query);
      res.json({ mensaje: "Árbol actualizado exitosamente" });
  } catch (error) {
      console.error('Error al actualizar el árbol:', error);
      res.status(500).json({ error: 'Error al actualizar el árbol' });
  }
});

// **RUTA PARA ELIMINAR UN ÁRBOL**
app.delete('/api/arboles/:id', async (req, res) => {
  const { id } = req.params;
  try {
      const result = await sql.query(`DELETE FROM dbo.arboles WHERE id = ${id}`);
      if (result.rowsAffected[0] === 0) {
          return res.status(404).json({ mensaje: "Árbol no encontrado" });
      }
      res.json({ mensaje: "Árbol eliminado exitosamente" });
  } catch (error) {
      console.error('Error al eliminar el árbol:', error);
      res.status(500).json({ error: 'Error al eliminar el árbol' });
  }
});



// **RUTAS AUXILIARES**
app.get('/api/comunas', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, nombre FROM dbo.comunas');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener comunas:', error);
        res.status(500).json({ error: 'Error al obtener comunas' });
    }
});


app.get('/api/calles', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, nombre FROM dbo.calles');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener calles:', error);
        res.status(500).json({ error: 'Error al obtener calles' });
    }
});


app.get('/api/referencias', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, descripcion FROM dbo.referencias');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener referencias:', error);
        res.status(500).json({ error: 'Error al obtener referencias' });
    }
});


app.get('/api/especies', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, nombre FROM dbo.especies');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener especies:', error);
        res.status(500).json({ error: 'Error al obtener especies' });
    }
});


app.get('/api/estados-fitosanitarios', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, estado FROM dbo.estados_fitosanitarios');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener estados fitosanitarios:', error);
        res.status(500).json({ error: 'Error al obtener estados fitosanitarios' });
    }
});


app.get('/api/fases-vitales', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, fase FROM dbo.fases_vitales');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener fases vitales:', error);
        res.status(500).json({ error: 'Error al obtener fases vitales' });
    }
});


app.get('/api/inclinaciones', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, nivel FROM dbo.inclinaciones');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener inclinaciones:', error);
        res.status(500).json({ error: 'Error al obtener inclinaciones' });
    }
});


app.get('/api/ahuecamientos', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, nivel FROM dbo.ahuecamientos');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener ahuecamientos:', error);
        res.status(500).json({ error: 'Error al obtener ahuecamientos' });
    }
});


app.get('/api/estados-plantera', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, estado FROM dbo.estados_plantera');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener estados plantera:', error);
        res.status(500).json({ error: 'Error al obtener estados plantera' });
    }
});


app.get('/api/ancho_acera', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, ancho FROM dbo.ancho_acera');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener anchos acera:', error);
        res.status(500).json({ error: 'Error al obtener anchos acera' });
    }
});


app.get('/api/dimensiones-plantera', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, dimension FROM dbo.dimensiones_plantera');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener dimensiones plantera:', error);
        res.status(500).json({ error: 'Error al obtener dimensiones plantera' });
    }
});


app.get('/api/tipos-plantacion', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, tipo FROM dbo.tipos_plantacion');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener tipos de plantación:', error);
        res.status(500).json({ error: 'Error al obtener tipos de plantación' });
    }
});


app.get('/api/tareas', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, descripcion FROM dbo.tareas');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener tareas:', error);
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});


app.get('/api/items', async (req, res) => {
    try {
        const result = await sql.query('SELECT id, descripcion FROM dbo.items');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener ítems:', error);
        res.status(500).json({ error: 'Error al obtener ítems' });
    }
});


// **CONFIGURACIÓN DE LA BASE DE DATOS**



// Hasta aca CENSAR ARBOL

// PLANTACION

app.post('/api/plantaciones', upload.single('foto'), async (req, res) => {
    console.log('Datos recibidos en el backend:', req.body);
     console.log('Archivo recibido:', req.file); // Archivo enviado como parte de FormData

    const { comuna_id, calle_id, altura, referencia_id, tipo_plantacion_id, 
        especie_id, dimension_plantera_id, observaciones } = req.body;
  
    if (!comuna_id || !calle_id || !altura || !referencia_id || !tipo_plantacion_id || !especie_id || 
        !dimension_plantera_id) {
      return res.status(400).json({ error: 'Por favor, completa todos los campos obligatorios.' });
    }
  
    try {
      const query = `
        INSERT INTO dbo.plantaciones (comuna_id, calle_id, altura, referencia_id, 
        tipo_plantacion_id, especie_id, dimension_plantera_id, observaciones, foto)
        VALUES (@comuna_id, @calle_id, @altura, @referencia_id, @tipo_plantacion_id, 
        @especie_id, @dimension_plantera_id, @observaciones, @foto);
      `;
  
      const request = new sql.Request();
      request.input('comuna_id', sql.Int, comuna_id);
      request.input('calle_id', sql.Int, calle_id);
      request.input('altura', sql.Int, altura);
      request.input('referencia_id', sql.Int, referencia_id);
      request.input('tipo_plantacion_id', sql.Int, tipo_plantacion_id);
      request.input('especie_id', sql.Int, especie_id);
      request.input('dimension_plantera_id', sql.Int, dimension_plantera_id);
      request.input('observaciones', sql.NVarChar(250), observaciones);
      request.input('foto', sql.NVarChar(255), req.file ? req.file.originalname : null);
  
      await request.query(query);
      res.status(201).json({ mensaje: 'Plantación registrada exitosamente' });
    } catch (error) {
      console.error('Error al registrar la plantación:', error);
      res.status(500).json({ error: 'Error al registrar la plantación', detalle: error.message });
    }
  });
  


  // MANTENIMIENTO

 

  app.get('/api/tareas', async (req, res) => {
    try {
      const result = await sql.query('SELECT id, descripcion FROM dbo.tareas');
      res.json(result.recordset); // Devuelve las tareas como un arreglo de objetos
    } catch (error) {
      console.error('Error al obtener tareas:', error);
      res.status(500).json({ error: 'Error al obtener tareas' });
    }
  });
  
  // Ruta para filtrar árboles censados dinámicamente
app.get('/api/arboles-filtrados', async (req, res) => {
  try {
    const {
      comuna_id,
      calle_id,
      altura,
      referencia_id,
      especie_id,
    } = req.query;

    // Validar y convertir tipos de datos
    const comunaId = comuna_id && !isNaN(comuna_id) ? parseInt(comuna_id, 10) : null;
    const calleId = calle_id && !isNaN(calle_id) ? parseInt(calle_id, 10) : null;
    const alturaNum = altura && !isNaN(altura) ? parseInt(altura, 10) : null;
    const referenciaId = referencia_id && !isNaN(referencia_id) ? parseInt(referencia_id, 10) : null;
    const especieId = especie_id && !isNaN(especie_id) ? parseInt(especie_id, 10) : null;

    // Consulta SQL con filtros dinámicos y JOIN para obtener nombres descriptivos
    const query = `
      SELECT 
        a.id AS arbol_id, 
        c.nombre AS comuna,
        ca.nombre AS calle,
        a.altura,
        r.descripcion AS referencia,
        e.nombre AS especie
      FROM dbo.arboles a
      LEFT JOIN dbo.comunas c ON a.comuna_id = c.id
      LEFT JOIN dbo.calles ca ON a.calle_id = ca.id
      LEFT JOIN dbo.referencias r ON a.referencia_id = r.id
      LEFT JOIN dbo.especies e ON a.especie_id = e.id
      WHERE (@comunaId IS NULL OR a.comuna_id = @comunaId)
        AND (@calleId IS NULL OR a.calle_id = @calleId)
        AND (@alturaNum IS NULL OR a.altura = @alturaNum)
        AND (@referenciaId IS NULL OR a.referencia_id = @referenciaId)
        AND (@especieId IS NULL OR a.especie_id = @especieId)
    `;

    const request = new sql.Request();
    request.input('comunaId', sql.Int, comunaId);
    request.input('calleId', sql.Int, calleId);
    request.input('alturaNum', sql.Int, alturaNum);
    request.input('referenciaId', sql.Int, referenciaId);
    request.input('especieId', sql.Int, especieId);

    // Ejecutar la consulta
    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al filtrar árboles:', error);
    res.status(500).json({ error: 'Error al filtrar árboles', detalle: error.message });
  }
});

 

  app.post('/api/mantenimientos', upload.single('foto'), async (req, res) => {
    try {
      const { arbol_id, tarea_id, item_id, observaciones } = req.body;
  
      // Validar campos obligatorios
      if (!arbol_id || !tarea_id || !item_id) {
        return res.status(400).json({ error: 'Por favor, completa todos los campos obligatorios.' });
      }
  
      // Validar que arbol_id sea un número válido
      if (isNaN(arbol_id) || isNaN(tarea_id) || isNaN(item_id)) {
        return res.status(400).json({ error: 'Los campos arbol_id, tarea_id e item_id deben ser números válidos.' });
      }
  
      // Preparar consulta SQL
      const query = `
        INSERT INTO dbo.mantenimientos (arbol_id, tarea_id, item_id, observaciones, foto)
        VALUES (@arbol_id, @tarea_id, @item_id, @observaciones, @foto)
      `;
  
      const request = new sql.Request();
      request.input('arbol_id', sql.Int, parseInt(arbol_id, 10));
      request.input('tarea_id', sql.Int, parseInt(tarea_id, 10));
      request.input('item_id', sql.Int, parseInt(item_id, 10));
      request.input('observaciones', sql.NVarChar(300), observaciones || null);
      request.input('foto', sql.NVarChar(255), req.file ? req.file.filename : null);
  
      await request.query(query);
      res.status(201).json({ mensaje: 'Mantenimiento registrado exitosamente' });
    } catch (error) {
      console.error('Error al registrar el mantenimiento:', error);
      res.status(500).json({ error: 'Error al registrar el mantenimiento', detalle: error.message });
    }
  });
  

app.get('/api/mantenimiento', async (req, res) => {
    try {
        const query = `
            SELECT 
                m.id, 
                m.arbol_id, 
                a.comuna, 
                a.calle, 
                a.altura, 
                a.referencia, 
                a.especie, 
                m.tarea_id, 
                t.descripcion AS tarea,
                m.item_id, 
                i.descripcion AS item,
                m.observaciones, 
                m.foto, 
                m.created_at
            FROM dbo.mantenimientos m
            INNER JOIN dbo.arboles a ON m.arbol_id = a.id
            INNER JOIN dbo.tareas t ON m.tarea_id = t.id
            INNER JOIN dbo.items i ON m.item_id = i.id
            ORDER BY m.created_at DESC;
        `;

        const result = await sql.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener mantenimientos:', error);
        res.status(500).json({ error: 'Error al obtener mantenimientos', detalle: error.message });
    }
});

app.put('/api/mantenimientos/:id', upload.single('foto'), async (req, res) => {
    const { id } = req.params;
    const { arbol_id, tarea_id, item_id, observaciones } = req.body;

    if (!arbol_id || !tarea_id || !item_id) {
        return res.status(400).json({ error: 'Por favor, completa todos los campos obligatorios.' });
    }

    try {
        const query = `
            UPDATE dbo.mantenimientos
            SET 
                arbol_id = @arbol_id, 
                tarea_id = @tarea_id, 
                item_id = @item_id,
                observaciones = @observaciones,
                foto = @foto
            WHERE id = @id;
        `;

        const request = new sql.Request();
        request.input('id', sql.Int, id);
        request.input('arbol_id', sql.Int, arbol_id);
        request.input('tarea_id', sql.Int, tarea_id);
        request.input('item_id', sql.Int, item_id);
        request.input('observaciones', sql.NVarChar(300), observaciones || null);
        request.input('foto', sql.NVarChar(255), req.file ? req.file.originalname : null);

        await request.query(query);

        res.status(200).json({ mensaje: 'Mantenimiento actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar el mantenimiento:', error);
        res.status(500).json({ error: 'Error al actualizar el mantenimiento', detalle: error.message });
    }
});


//**  HASTA ACA ES TODO EL BACKEND DEL MODULO DE INSPECTORES */


//**  DESDE ACA ARRANCA EL BACKEND DEL MODULO DE ADM GOB */

// --- RUTAS DEL MÓDULO ADMINISTRATIVO ---


app.get('/api/ordenes', async (req, res) => {
  const { estado_id, contratista_id, fecha_limite } = req.query;
  let query = `
    SELECT o.id, o.mantenimiento_id, e.nombre AS estado, o.arme, c.nombre AS contratista,
           o.fecha_limite, o.fecha_asignacion
    FROM ordenes o
    JOIN estados e ON o.estado_id = e.id
    LEFT JOIN contratistas c ON o.contratista_id = c.id
  `;
  const conditions = [];
  if (estado_id) conditions.push(`o.estado_id = ${estado_id}`);
  if (contratista_id) conditions.push(`o.contratista_id = ${contratista_id}`);
  if (fecha_limite) conditions.push(`o.fecha_limite = '${fecha_limite}'`);
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send('Error al obtener las órdenes: ' + error.message);
  }
});



app.post('/api/ordenes', async (req, res) => {
  const { mantenimiento_id, estado_id, arme, contratista_id, fecha_limite } = req.body;

  console.log('Datos recibidos en el backend:', { mantenimiento_id, estado_id, arme, contratista_id, fecha_limite });

  // Validar que los campos obligatorios estén presentes
  if (!mantenimiento_id || !estado_id || !arme || !contratista_id || !fecha_limite) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son obligatorios.',
    });
  }

  const fechaLimite = new Date(fecha_limite);
  fechaLimite.setDate(fechaLimite.getDate() + 1);

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('mantenimiento_id', sql.Int, mantenimiento_id)
      .input('estado_id', sql.Int, estado_id)
      .input('arme', sql.Int, arme)
      .input('contratista_id', sql.Int, contratista_id)
      .input('fecha_limite', sql.Date, fecha_limite)
      .query(`
        INSERT INTO ordenes (mantenimiento_id, estado_id, arme, contratista_id, fecha_limite)
        OUTPUT INSERTED.id
        VALUES (@mantenimiento_id, @estado_id, @arme, @contratista_id, @fecha_limite)
      `);

    // Devuelve el ID de la nueva orden creada
    const nuevaOrdenId = result.recordset[0].id;
    console.log('Nueva orden creada con ID:', nuevaOrdenId);

    res.status(201).json({
      success: true,
      message: 'Orden creada exitosamente',
      data: {
        id: nuevaOrdenId,
        mantenimiento_id,
        estado_id,
        arme,
        contratista_id,
        fecha_limite,
      },
    });
  } catch (error) {
    console.error('Error al crear la orden:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al crear la orden',
      error: error.message,
    });
  }
});


app.put('/api/ordenes/:id', async (req, res) => {
  const { id } = req.params;
  console.log('ID recibido en el backend para actualización:', id);
  const { estado_id, contratista_id, fecha_limite, arme } = req.body;
  console.log('Datos recibidos para actualizar:', { estado_id, contratista_id, fecha_limite, arme });

  try {
    const pool = await sql.connect(dbConfig);

    // Verificar que la orden existe
    const orden = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM ordenes WHERE id = @id');

    if (orden.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'La orden no existe.'
      });
    }

    // Validar que el ARME no esté duplicado en registros distintos
    if (arme) {
      const existeArme = await pool.request()
        .input('arme', sql.Int, arme)
        .input('id', sql.Int, id)
        .query(`
          SELECT id FROM ordenes 
          WHERE arme = @arme AND id != @id
        `);
    
      if (existeArme.recordset.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El número de ARME ya está asignado a otra orden.'
        });
      }
    }

    const fechaLimite = new Date(fecha_limite);
    fechaLimite.setDate(fechaLimite.getDate() + 1);
    

    // Actualizar la orden
    await pool.request()
      .input('id', sql.Int, id)
      .input('estado_id', sql.Int, estado_id)
      .input('contratista_id', sql.Int, contratista_id)
      .input('fecha_limite', sql.Date, fecha_limite)
      .input('arme', sql.Int, arme || null)
      .query(`
        UPDATE ordenes
        SET estado_id = @estado_id, 
            contratista_id = @contratista_id, 
            fecha_limite = @fecha_limite,
            arme = @arme
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: 'Orden actualizada exitosamente.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la orden.',
      error: error.message
    });
  }
});












app.delete('/api/ordenes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await sql.connect(dbConfig);

    // Verificar que la orden existe
    const orden = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM ordenes WHERE id = @id');

    if (orden.recordset.length === 0) {
      return res.status(404).send('La orden no existe.');
    }

    // Eliminar la orden
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM ordenes WHERE id = @id');

    res.send('Orden eliminada exitosamente.');
  } catch (error) {
    res.status(500).send('Error al eliminar la orden: ' + error.message);
  }
});



app.get('/api/estados', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT id, nombre FROM estados');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send('Error al obtener los estados: ' + error.message);
  }
});


app.get('/api/contratistas', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT id, nombre FROM contratistas');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send('Error al obtener los contratistas: ' + error.message);
  }
});



app.get('/api/mantenimientos-ordenes', async (req, res) => {
  // Extraer parámetros de la query string
  const { estado, comuna_id, calle_id, tarea_id, item_id, contratista_id, estado_id } = req.query;

  // Convertir 'estado' en una lista de estados, por defecto ['Encomendado']
  const estados = estado ? estado.split(',') : ['Encomendado'];

  // Consulta SQL inicial con los JOIN necesarios
  let query = `
    SELECT 
      m.id AS mantenimiento_id,
      a.comuna_id,
      c.nombre AS comuna,
      a.calle_id,
      ca.nombre AS calle,
      a.altura,
      r.descripcion AS referencia,
      a.especie_id,
      e.nombre AS especie,
      m.tarea_id,
      t.descripcion AS tarea,
      m.item_id,
      i.descripcion AS item,
      m.observaciones,
      a.foto,
      o.id AS orden_id,
      o.estado_id,
      es.nombre AS estado,
      o.arme,
      o.contratista_id,
      co.nombre AS contratista
    FROM dbo.mantenimientos m
    JOIN dbo.arboles a ON m.arbol_id = a.id
    LEFT JOIN dbo.comunas c ON a.comuna_id = c.id
    LEFT JOIN dbo.calles ca ON a.calle_id = ca.id
    LEFT JOIN dbo.referencias r ON a.referencia_id = r.id
    LEFT JOIN dbo.especies e ON a.especie_id = e.id
    LEFT JOIN dbo.ordenes o ON m.id = o.mantenimiento_id
    LEFT JOIN dbo.estados es ON o.estado_id = es.id
    LEFT JOIN dbo.contratistas co ON o.contratista_id = co.id
    LEFT JOIN dbo.tareas t ON m.tarea_id = t.id
    LEFT JOIN dbo.items i ON m.item_id = i.id
  `;

  // Condiciones adicionales para los filtros dinámicos
  const conditions = [];

  if (comuna_id) conditions.push(`a.comuna_id = @comuna_id`);
  if (calle_id) conditions.push(`a.calle_id = @calle_id`);
  if (tarea_id) conditions.push(`m.tarea_id = @tarea_id`);
  if (item_id) conditions.push(`m.item_id = @item_id`);
  if (estado_id) conditions.push(`o.estado_id = @estado_id`);
  if (contratista_id) conditions.push(`o.contratista_id = @contratista_id`);
  

  // Agregar condiciones a la consulta si existen
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  try {
    // Conectar a la base de datos
    const pool = await sql.connect(dbConfig);
    const request = pool.request();

    // Pasar los parámetros dinámicos
    request.input('estados', sql.NVarChar, estados.join(','));
    request.input('comuna_id', sql.Int, comuna_id || null);
    request.input('calle_id', sql.Int, calle_id || null);
    request.input('tarea_id', sql.Int, tarea_id || null);
    request.input('item_id', sql.Int, item_id || null);
    request.input('contratista_id', sql.Int, contratista_id || null);
    

    // Ejecutar la consulta
    const result = await request.query(query);

    // Enviar los resultados
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener mantenimientos-ordenes:', error);
    res.status(500).send('Error al obtener los datos combinados: ' + error.message);
  }
});



app.use('/uploads', express.static('path_a_tu_carpeta_de_imagenes')); // TO-DO!!!DENIFIR LUEGO DONDE ESTAN LAS CARPETAS DE LAS FOTOS




// Modulo ADM. empresa.



// Ruta para actualizar una orden
app.put('/api/ordenes-empresa/:id', (req, res) => {
  const { id } = req.params;
  const { estado_id, arme } = req.body;

  console.log('ID recibido en el backend para actualización:', id);
  console.log('Datos recibidos para actualizar:', { estado_id, arme });

  if (!estado_id) {
    return res.status(400).json({ success: false, message: 'El campo estado_id es obligatorio.' });
  }

  const query = `
    UPDATE ordenes
    SET estado_id = @estado_id, arme = @arme
    WHERE id = @id
  `;

  const request = new sql.Request();
  request.input('id', sql.Int, parseInt(id, 10));
  request.input('estado_id', sql.Int, parseInt(estado_id, 10));
  request.input('arme', sql.NVarChar, arme || null);

  request.query(query, (err, result) => {
    if (err) {
      console.error('Error al actualizar la orden:', err);
      return res.status(500).json({ success: false, message: 'Error al actualizar la orden.', error: err.message });
    }
    res.json({ success: true, message: 'Orden actualizada correctamente' });
  });
});


//MODULO AUTENTICACION

app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, cuit, email, password, role } = req.body;

  if (!firstName || !lastName || !cuit || !email || !password || !role) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO dbo.usuarios (firstName, lastName, cuit, email, password, role, aprobado)
      VALUES (@firstName, @lastName, @cuit, @email, @password, @role, 0)
    `;

    const request = new sql.Request();
    request.input('firstName', sql.NVarChar, firstName);
    request.input('lastName', sql.NVarChar, lastName);
    request.input('cuit', sql.NVarChar, cuit);
    request.input('email', sql.NVarChar, email);
    request.input('password', sql.NVarChar, hashedPassword);
    request.input('role', sql.NVarChar, role);

    await request.query(query);

    res.status(201).json({ message: 'Usuario registrado correctamente. Espera la aprobación del administrador.' });
  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});



app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = `SELECT * FROM dbo.usuarios WHERE email = @email AND aprobado = 1`;
    const request = new sql.Request();
    request.input('email', sql.NVarChar, email);

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado o no aprobado.' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.json({ message: 'Login exitoso', token, role: user.role });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});


app.post('/api/auth/request-reset', async (req, res) => {
  const { email } = req.body;

  try {
    const query = `SELECT * FROM dbo.usuarios WHERE email = @email`;
    const request = new sql.Request();
    request.input('email', sql.NVarChar, email);

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Correo no encontrado.' });
    }

    // Simular el envío de un correo (pendiente de implementación real)
    res.json({ message: 'Se ha enviado un enlace de recuperación a tu correo.' });
  } catch (error) {
    console.error('Error en la solicitud de recuperación:', error);
    res.status(500).json({ error: 'Error al solicitar la recuperación de contraseña' });
  }
});




//header usuarios




// Middleware para autenticar el token
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    req.user = decoded;
    next();
  });
}

// Endpoint para obtener la información del usuario
app.get('/api/auth/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Extrae el id del usuario desde el token

    // Consulta para obtener el nombre y rol del usuario desde la base de datos
    const result = await sql.query`SELECT firstName, lastName, role FROM dbo.usuarios WHERE id = ${userId}`;

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.recordset[0];
    res.status(200).json({
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
    });
  } catch (error) {
    console.error('Error al obtener la información del usuario:', error);
    res.status(500).json({ error: 'Error al obtener la información del usuario' });
  }
});




























































  
// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
