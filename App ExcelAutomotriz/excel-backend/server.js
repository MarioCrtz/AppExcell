const express = require('express');
const app = express();
const path = require('path');

// Servir frontend
app.use(express.static(path.join(__dirname, "..")));

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const ExcelJS = require('exceljs');
const path = require('path');

const app = express();
const PORT = 3000;
const EXCEL_FILE = path.join(__dirname, 'tareas.xlsx');
const SHEET_NAME = 'Tareas';
const FILE_PATH = "./tareas.xlsx";

app.use(cors());
app.use(express.json());

// Ensure Excel exists with header row
async function ensureExcel() {
  if (!fs.existsSync(EXCEL_FILE)) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(SHEET_NAME);
    sheet.addRow([
      'id','name','motorista','date','description','status','createdBy','comment','createdAt','finishDate'
    ]);
    await workbook.xlsx.writeFile(EXCEL_FILE);
    console.log('Created initial tareas.xlsx');
  }
}

// Read all tasks from Excel
async function readTasks() {
  const workbook = new ExcelJS.Workbook();

  // Si el archivo no existe o está corrupto, lo recreamos
  try {
      await workbook.xlsx.readFile(FILE_PATH);
  } catch (err) {
      console.log("Archivo no encontrado o dañado. Creando uno nuevo...");
      const newWorkbook = new ExcelJS.Workbook();
      const newSheet = newWorkbook.addWorksheet("Tareas");

      // Agregamos las columnas correctas
      worksheet.columns = [
          { header: "id", key: "id", width: 20 },
          { header: "name", key: "name", width: 30 },
          { header: "motorista", key: "motorista", width: 20 },
          { header: "date", key: "date", width: 15 },
          { header: "description", key: "description", width: 40 },
          { header: "status", key: "status", width: 15 },
          { header: "createdBy", key: "createdBy", width: 20 },
          { header: "comment", key: "comment", width: 40 },
          { header: "createdAt", key: "createdAt", width: 25 },
          { header: "finishDate", key: "finishDate", width: 20 } 
      ];

      await newWorkbook.xlsx.writeFile(FILE_PATH);
      return [];
  }

  // Buscar o crear la hoja
  let worksheet = workbook.getWorksheet("Tareas");
  if (!worksheet) {
      console.log("Hoja 'Tareas' no encontrada. Creando...");
      worksheet = workbook.addWorksheet("Tareas");

      worksheet.columns = [
        { header: "id", key: "id", width: 20 },
        { header: "name", key: "name", width: 30 },
        { header: "motorista", key: "motorista", width: 20 },
        { header: "date", key: "date", width: 15 },
        { header: "description", key: "description", width: 40 },
        { header: "status", key: "status", width: 15 },
        { header: "createdBy", key: "createdBy", width: 20 },
        { header: "comment", key: "comment", width: 40 },
        { header: "createdAt", key: "createdAt", width: 25 },
        { header: "finishDate", key: "finishDate", width: 20 }  
      ];

      await workbook.xlsx.writeFile(FILE_PATH);
      return [];
  }

  const tasks = [];

  worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; 
      const data = row.values;

      tasks.push({
        id: data[1],
        name: data[2],
        motorista: data[3],
        date: data[4],
        description: data[5],
        status: data[6],
        createdBy: data[7],
        comment: data[8],
        createdAt: data[9],
        finishDate: data[10]
      });
  });

  return tasks;
}

// Write all tasks (replace spreadsheet contents, keeping header)
async function writeAllTasks(tasks) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(SHEET_NAME);
  sheet.addRow([
    'id','name','motorista','date','description','status','createdBy','comment','createdAt','finishDate'
  ]);
  for (const t of tasks) {
    sheet.addRow([
      t.id, t.name, t.motorista, t.date, t.description, t.status, t.createdBy, t.comment, t.createdAt, t.finishDate || ''
    ]);
  }
  await workbook.xlsx.writeFile(EXCEL_FILE);
}

// GET /tasks
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await readTasks();
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error leyendo tareas' });
  }
});

// POST /tasks  -> add one task (expects full task object)
app.post('/tasks', async (req, res) => {
  try {
    const newTask = req.body;
    if (!newTask || !newTask.id) {
      return res.status(400).json({ error: 'Tarea inválida. Se requiere id.' });
    }
    const tasks = await readTasks();
    tasks.push(newTask);
    await writeAllTasks(tasks);
    res.status(201).json({ ok: true, task: newTask });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error guardando tarea' });
  }
});

// PUT /tasks/:id -> update a task
app.put('/tasks/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = req.body;
    const tasks = await readTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Tarea no encontrada' });
    tasks[idx] = { ...tasks[idx], ...updated, id }; // preserve id as number
    await writeAllTasks(tasks);
    res.json({ ok: true, task: tasks[idx] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando tarea' });
  }
});

// Start
app.listen(PORT, async () => {
  await ensureExcel();
  console.log(`Server corriendo en http://localhost:${PORT}`);
});
