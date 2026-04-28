import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

applyPlugin(jsPDF);

const globals = globalThis as any;
globals.ExcelJS = ExcelJS;
globals.saveAs = saveAs;
globals.jspdf = { jsPDF };
